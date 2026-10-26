const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Plataforma de Cursos',
      version: '1.0.0',
      description:
        'API REST para la gestión de cursos, ofertas, sesiones, actividades, entregas, evaluación y retroalimentación, progreso y estadísticas.',
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