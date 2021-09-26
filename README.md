# Fastify plugin for AdminJS

This is a plugin which integrates [AdminJS](https://github.com/SoftwareBrothers/adminjs) to [fastify](https://github.com/fastify/fastify/) framework.

## AdminJS

AdminJS is an automatic admin interface which can be plugged into your application. You, as a developer, provide database models (like posts, comments, stores, products or whatever else your application uses), and AdminJS generates UI which allows you (or other trusted users) to manage content.

Check out the example application with mongo and postgres models here: https://adminjs-example-app-staging.herokuapp.com/admin

Or visit [AdminJS](https://github.com/SoftwareBrothers/adminjs) github page.

# Usage

## Installation

```sh
npm install adminjs-fastify
```

## Import plugin
```ts
import { adminRoute } from "adminjs-fastify"
```

It exposes `adminjs` plugin, which can be registered to a given url in the API. 

## Example without an authentication

```ts
import { adminRoute } from "adminjs-fastify"
import AdminJS from 'adminjs'
import fastify from "fastify"

const app = fastify()

const adminJs = new AdminJS({
  databases: [],
  rootPath: '/admin' // prefix for adminJS routes
})

app.register(adminRoute, { admin: adminJs })

app.listen(8080, () => console.log('AdminJS is running under localhost:8080/admin'))
```

Check example project sources in `examples` folder.

## Using build in authentication

To protect the routes with a session authentication, you can use `auth` parameter to plugin

```ts
app.register(adminRoute, { 
  admin: adminJs, 
  auth: {
    authenticate: async (email, password) => {
      if (ADMIN.password === password && ADMIN.email === email) {
        return ADMIN
      }
      return null
    },
    cookiePassword: "a secret with minimum length of 32 characters",
  }
})
```

Note! To use authentication in production environment, there is a need to configure @fastify/session for production build. It can be achieved by passing options to `sessionOptions` parameter. Read more on [fastify/session Github page](https://github.com/fastify/session)

## Plugin options documentation

Plugin can be pre-configured with following options:

```ts
  type AdminRouterOptions = {
    /**
     * instance of {@link AdminJS}
     * @required
     */
    admin: AdminJS

    /** 
     * authentication parameters
     * @optional
     */
    auth?: {
      /**
       * cookie secret - minimum length of 32 characters
       * @required
       */
      cookiePassword: string

      /**
       * cookie name
       * @optional
       * @default: "adminJS"
       */
      cookieName?: string

      /**
       * secure cookie 
       * @optional
       * @default: false
       */
      cookieSecure?: boolean

      /**
       * authentication check function
       * @required
       * @returns: user data or null
       */
      authenticate: (email: string, password: string) => unknown | null
    }

    /**
     * multipart options - pass through params to [fastify-multipart](https://github.com/fastify/fastify-multipart) plugin
     */ 
    multipartOptions?: FastifyMultipartBaseOptions

    /**
     * session options - pass through params to [@fastify/session](https://github.com/fastify/session) plugin
     */ 
    sessionOptions?: FastifySessionPlugin.Options
  })
```

# License

MIT
