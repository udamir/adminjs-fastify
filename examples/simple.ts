/* eslint-disable prettier/prettier */
import AdminJS from "adminjs"
import fastify from "fastify"
import mongoose from "mongoose"
import MongooseAdapter from "@adminjs/mongoose"

import "./mongoose/article-model"
import "./mongoose/admin-model"
import { adminRoute } from "../src"

AdminJS.registerAdapter(MongooseAdapter)

const start = async () => {
  const connection = await mongoose.connect(
    process.env.MONGO_URL || "mongodb://localhost:27017/example"
  )
  const server = fastify()

  const adminJs = new AdminJS({
    databases: [connection],
    rootPath: "/admin",
  })

  server.register(adminRoute, { admin: adminJs })

  const port = process.env.PORT || 8080
  server.listen(port, () =>
    console.log(`AdminJS is running under localhost:${port}/admin`)
  )
}

start()
