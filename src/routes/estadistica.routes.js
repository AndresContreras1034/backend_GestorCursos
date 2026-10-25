const express = require('express');
const controller = require('../controllers/estadistica.controller');

/** Se monta en /api/cursos/:cursoId */
const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * /api/cursos/{cursoId}/progreso:
 *   get:
 *     summary: Seguimiento del progreso de un estudiante en el curso
 *     description: Porcentaje de avance sobre las actividades publicadas o cerradas, pendientes, vencidas y promedios en escala 0-5.
 *     tags: [Estadisticas]
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
 *         description: Progreso del estudiante
 *       400:
 *         description: estudianteId faltante
 *       403:
 *         description: No es estudiante o no está inscrito
 *       404:
 *         description: Curso o estudiante no encontrado
 */
router.get('/progreso', controller.consultarProgreso);

/**
 * @swagger
 * /api/cursos/{cursoId}/estadisticas:
 *   get:
 *     summary: Estadísticas de resultados del curso (docente)
 *     description: Promedio general, aprobados/reprobados (nota mínima 3.0), distribución de notas, estadísticas por actividad y progreso de cada estudiante.
 *     tags: [Estadisticas]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: docenteId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estadísticas del curso
 *       400:
 *         description: docenteId faltante
 *       403:
 *         description: El docente no es dueño del curso
 *       404:
 *         description: Curso no encontrado
 */
router.get('/estadisticas', controller.consultarEstadisticas);

module.exports = router;
