const express = require('express');

const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./src/config/swagger');

const authRoutes = require('./src/routes/auth.routes');

const usuarioRoutes = require('./src/routes/usuario.routes');

const cursoRoutes = require('./src/routes/curso.routes');

const cursoGestionRoutes = require('./src/routes/cursoGestion.routes');

const inscripcionRoutes = require('./src/routes/inscripcion.routes');

const cronogramaRoutes = require('./src/routes/cronograma.routes');

const recursoRoutes = require('./src/routes/recurso.routes');

const actividadRoutes = require('./src/routes/actividad.routes');

const actividadGestionRoutes = require('./src/routes/actividadGestion.routes');

const visorRoutes = require('./src/routes/visor.routes');

const calificacionRoutes = require('./src/routes/calificacion.routes');
const estadisticaRoutes = require('./src/routes/estadistica.routes');
const ofertaRoutes = require('./src/routes/oferta.routes');
const evaluacionRoutes = require('./src/routes/evaluacion.routes');

const app = express();

app.use(express.json({ limit: '25mb' }));

// Documentación Swagger

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas

app.use('/api/auth', authRoutes);

app.use('/api/usuarios', usuarioRoutes);

app.use('/api/cursos', cursoRoutes);

app.use('/api/cursos', cursoGestionRoutes);

app.use('/api/inscripciones', inscripcionRoutes);

app.use('/api/cursos/:cursoId/sesiones', cronogramaRoutes.routerAnidado);

app.use('/api/sesiones', cronogramaRoutes.routerPlano);

app.use('/api/recursos', recursoRoutes);

app.use('/api/cursos/:cursoId/actividades', actividadRoutes);

app.use('/api/cursos/:cursoId/actividades', actividadGestionRoutes);

app.use('/api/cursos/:cursoId/calificaciones', calificacionRoutes);
app.use('/api/cursos/:cursoId', estadisticaRoutes);
app.use('/api/cursos/:cursoId/ofertas', ofertaRoutes.routerAnidado);
app.use('/api/ofertas', ofertaRoutes.routerPlano);
app.use('/api/cursos/:cursoId/evaluaciones', evaluacionRoutes.routerAnidado);
app.use('/api/evaluaciones', evaluacionRoutes.routerPlano);
app.use('/api/recursos', visorRoutes);

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
