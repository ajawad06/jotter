const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path");

const { version } = require("../../package.json");

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Jotter API",
      version,
      description: "REST API for the Jotter note-taking app.",
    },
    servers: [{ url: "/api" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [path.join(__dirname, "../routes/*.js").split(path.sep).join("/")],
});

module.exports = swaggerSpec;
