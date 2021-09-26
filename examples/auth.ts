import AdminJS from "adminjs"
import fastify from "fastify"
import mongoose from "mongoose"
import MongooseAdapter from "@adminjs/mongoose"
import { adminRoute } from "../src"

import "./mongoose/article-model"
import "./mongoose/admin-model"

AdminJS.registerAdapter(MongooseAdapter)

const ADMIN = {
  email: "test@example.com",
  password: "password",
}

const start = async () => {
  const connection = await mongoose.connect(
    process.env.MONGO_URL || "mongodb://localhost:27017/example"
  )
  const app = fastify()

  const adminJs = new AdminJS({
    databases: [connection],
    rootPath: "/admin",
  })

  const auth = {
    authenticate: async (email, password) => {
      if (ADMIN.password === password && ADMIN.email === email) {
        return ADMIN
      }
      return null
    },
    cookiePassword: "a secret with minimum length of 32 characters",
  }

  app.register(adminRoute, {
    admin: adminJs,
    auth,
  })

  const port = process.env.PORT || 8080
  app.listen(port, () =>
    console.log(`AdminJS is running under http://localhost:${port}${adminJs.options.rootPath}`)
  )
}

start()
