// swaggerGen.js
const swaggerAutogen = require("swagger-autogen")();


const doc = {
    info: {
        title: "~GitForMe, Understand any GitHub repository in minutes, not days.",
        description: "Automatically generated API documentation  ~GitForMe",
        version: "1.0.0",
    },
    schemes: ["https", "http"],
    basePath: "/api",
}

const outputFile = "../docs/swagger.json"           // The output file
const routes = ["../Routes/*.js"]         // Add your route files

swaggerAutogen(outputFile, routes, doc).then(() => {
    console.log("Swagger documentation generated successfully!")
})
