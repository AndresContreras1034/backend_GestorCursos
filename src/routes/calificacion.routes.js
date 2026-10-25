const express = require('express');
const calificacionController = require('../controllers/calificacion.controller');

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * /api/cursos/{cursoId}/calificaciones:
 *   get:
 *     summary: Consultar mis calificaciones de un curso (HU-016)
 *     tags: [Calificacion]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: estudianteId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Actividades calificadas con nota y retroalimentación
 *       400:
 *         description: Parámetros inválidos
 *       403:
 *         description: No es estudiante o no está inscrito en el curso
 *       404:
 *         description: Curso o estudiante no encontrado
 */
router.get('/', calificacionController.consultarCalificaciones);

/**
 * @swagger
 * /api/cursos/{cursoId}/calificaciones/resumen:
 *   get:
 *     summary: Consultar el GPA acumulado de un curso, escala 0-5 (HU-017)
 *     description: Promedio de las notas calificadas, normalizadas a escala 0-5 según el puntajeMaximo de cada actividad. Devuelve gpa null si aún no hay notas.
 *     tags: [Calificacion]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: estudianteId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: GPA acumulado del curso
 *       400:
 *         description: Parámetros inválidos
 *       403:
 *         description: No es estudiante o no está inscrito en el curso
 *       404:
 *         description: Curso o estudiante no encontrado
 */
router.get('/resumen', calificacionController.consultarGpa);

module.exports = router;
