const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Plataforma de Cursos',
      version: '1.0.0',
      description:
        'Documentación de la API - Sprint 1: Crear cuenta, Iniciar sesión, Gestionar perfil, Crear curso',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor local',
      },
    ],
  },
  // Le dice a swagger-jsdoc dónde buscar los comentarios @swagger
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;