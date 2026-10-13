const express = require('express');

const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./src/config/swagger');

const authRoutes = require('./src/routes/auth.routes');

const usuarioRoutes = require('./src/routes/usuario.routes');

const cursoRoutes = require('./src/routes/curso.routes');

const inscripcionRoutes = require('./src/routes/inscripcion.routes');

const cronogramaRoutes = require('./src/routes/cronograma.routes');

const recursoRoutes = require('./src/routes/recurso.routes');

const actividadRoutes = require('./src/routes/actividad.routes');

const visorRoutes = require('./src/routes/visor.routes');

const app = express();

app.use(express.json({ limit: '25mb' }));

// Documentación Swagger

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas

app.use('/api/auth', authRoutes);

app.use('/api/usuarios', usuarioRoutes);

app.use('/api/cursos', cursoRoutes);

app.use('/api/inscripciones', inscripcionRoutes);

app.use('/api/cursos/:cursoId/sesiones', cronogramaRoutes.routerAnidado);

app.use('/api/sesiones', cronogramaRoutes.routerPlano);

app.use('/api/recursos', recursoRoutes);

app.use('/api/cursos/:cursoId/actividades', actividadRoutes);

app.use('/api/recursos', visorRoutes);

module.exports = app;
