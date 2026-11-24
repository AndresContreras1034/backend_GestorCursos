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
const organizacionRoutes = require('./src/routes/organizacion.routes');
const matriculaRoutes = require('./src/routes/matricula.routes');
const formularioRoutes = require('./src/routes/formulario.routes');
const formularioAsignacionRoutes = require('./src/routes/formularioAsignacion.routes');

const app = express();

app.disable('x-powered-by');

app.use(express.json({ limit: '25mb' }));

app.use((req, res, next) => {
  const inicio = process.hrtime.bigint();

  res.on('finish', () => {
    const duracionMs = Number(process.hrtime.bigint() - inicio) / 1e6;
    const fecha = new Date().toISOString();
    console.log(
      `[${fecha}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duracionMs.toFixed(1)} ms)`
    );
  });

  next();
});

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
app.use('/api/cursos/:cursoId', organizacionRoutes);
app.use('/api/cursos/:cursoId', matriculaRoutes);
app.use('/api/cursos/:cursoId', estadisticaRoutes);
app.use('/api/cursos/:cursoId/ofertas', ofertaRoutes.routerAnidado);
app.use('/api/ofertas', ofertaRoutes.routerPlano);
app.use('/api/cursos/:cursoId/evaluaciones', evaluacionRoutes.routerAnidado);
app.use('/api/evaluaciones', evaluacionRoutes.routerPlano);
app.use('/api/recursos', visorRoutes);
app.use('/api/formularios', formularioRoutes);
app.use('/api/cursos/:cursoId/formularios', formularioAsignacionRoutes.routerAnidado);
app.use('/api/formulario-asignaciones', formularioAsignacionRoutes.routerPlano);

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
