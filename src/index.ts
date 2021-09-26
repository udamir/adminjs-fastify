import multipart, { FastifyMultipartBaseOptions } from "fastify-multipart"
import { FastifyPluginAsync, HTTPMethods, RouteOptions } from "fastify"
import AdminJS, { Router as AdminRouter } from "adminjs"
import FastifySessionPlugin from "@fastify/session"
import fastifyCookie from "fastify-cookie"
import fastifyFormbody from "fastify-formbody"
import mime from "mime"
import path from "path"
import fs from "fs"

const INVALID_ADMINJS_INSTANCE =
  "You have to pass an instance of AdminJS to `adminRoute` plugin"

export class WrongArgumentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "WrongArgumentError"
  }
}

export type AuthenticationOptions = {
  cookiePassword: string
  cookieName?: string
  cookieSecure?: boolean
  authenticate: (email: string, password: string) => unknown | null
}

export type AdminRouterOptions = {
  admin: AdminJS
  auth?: AuthenticationOptions
  multipartOptions?: FastifyMultipartBaseOptions
  sessionOptions?: FastifySessionPlugin.Options
}

export const adminRoute: FastifyPluginAsync<AdminRouterOptions> = async (
  fastify,
  { admin, auth, multipartOptions, sessionOptions }
): Promise<void> => {
  if (!(admin instanceof AdminJS)) {
    throw new WrongArgumentError(INVALID_ADMINJS_INSTANCE)
  }

  admin.initialize().then(() => {
    fastify.log.debug("AdminJS: bundle ready")
  })

  const { loginPath, logoutPath, rootPath } = admin.options

  fastify.register(multipart, multipartOptions)
  fastify.register(fastifyFormbody)

  if (auth) {

    await fastify.register(fastifyCookie)
    await fastify.register(FastifySessionPlugin, {
      ...sessionOptions,
      secret: auth.cookiePassword,
      cookieName: auth.cookieName || "adminjs",
      cookie: { secure: auth.cookieSecure || false },
    })

    // login
    fastify.get(loginPath, async (req, reply) => {
      const login = await admin.renderLogin({
        action: admin.options.loginPath,
        errorMessage: null,
      })
      reply.type("text/html").send(login)
    })

    fastify.post(loginPath, async (req, reply) => {
      const { email, password } = req.body as {
        email: string;
        password: string;
      }
      const adminUser = await auth.authenticate(email, password)
      if (adminUser) {
        req.session.adminUser = adminUser
        if (req.session.redirectTo) {
          reply.redirect(302, req.session.redirectTo)
        } else {
          reply.redirect(302, rootPath)
        }
      } else {
        const login = await admin.renderLogin({
          action: admin.options.loginPath,
          errorMessage: "invalidCredentials",
        })
        reply.type("text/html").send(login)
      }
    })

    // logout
    fastify.get(logoutPath, async (request, reply) => {
      if (request.session.adminUser) {
        request.destroySession((err) => {
          if (err) {
            reply.status(500)
            reply.send('Internal Server Error')
          } else {
            reply.redirect(loginPath)
          }
        })
      }
    })

    // hook
    fastify.addHook('preHandler', (req, reply, next) => {
      if (AdminRouter.assets.find((asset) => req.url.match(asset.path))) {
        return next()
      } else if (
        req.session.adminUser ||
        // these routes doesn't need authentication
        req.url.startsWith(loginPath) ||
        req.url.startsWith(logoutPath)
      ) {
        return next()
      } else {
        // If the redirection is caused by API call to some action just redirect to resource
        const [redirectTo] = req.url.split("/actions")
        req.session.redirectTo = redirectTo.includes(`${rootPath}/api`)
          ? rootPath
          : redirectTo
        return reply.redirect(loginPath)
      }
    })
  }

  const { routes, assets } = AdminRouter

  routes.forEach((route) => {
    const fastifyRoute: RouteOptions = {
      method: route.method as HTTPMethods,
      // we have to change routes defined in AdminJS from {recordId} to :recordId
      url: rootPath + route.path.replace(/{/g, ":").replace(/}/g, "") || "/",
      handler: async (request, reply) => {
        const controller = new route.Controller(
          { admin },
          request.session && request.session.adminUser
        )

        let payload: any = {}
        try {
          const parts = request.parts()
          for await (const part of parts) {
            if (part.file) {
              payload[part.filename] = part.file
            } else {
              const { value } = part as any
              payload[part.fieldname] = value
            }
          }
        } catch (error) {
          payload = request.body
        }

        const html = await controller[route.action]({
          params: request.params,
          query: request.query,
          payload,
          method: request.method.toLowerCase(),
        })

        if (route.contentType) {
          reply.header("Content-Type", route.contentType)
        } else if (typeof html === "string") {
          reply.header("Content-Type", "text/html")
        }

        if (html) {
          reply.send(html)
        }
      },
    }

    fastify.route(fastifyRoute)
  })

  assets.forEach((asset) => {
    fastify.get(rootPath + asset.path, (req, reply) => {
      const type = mime.getType(path.resolve(asset.src)) || "text/plain"
      const file = fs.readFileSync(path.resolve(asset.src))
      reply.type(type).send(file)
    })
  })
}

declare module "fastify" {
  interface Session {
    adminUser: any,
    redirectTo: string
  }
}

export default { name: "AdminJSFastify", adminRoute }
