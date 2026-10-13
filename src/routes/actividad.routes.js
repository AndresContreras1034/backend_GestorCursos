const express = require('express');
const actividadController = require('../controllers/actividad.controller');

/**
 * Router anidado: se monta en /api/cursos/:cursoId/actividades
 */
const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * /api/cursos/{cursoId}/actividades:
 *   post:
 *     summary: Crear una actividad o tarea en un curso (HU-011)
 *     tags: [Actividad]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [docenteId, titulo, instrucciones, fechaLimite]
 *             properties:
 *               docenteId: { type: integer }
 *               titulo: { type: string }
 *               instrucciones: { type: string }
 *               fechaLimite: { type: string, example: "2026-12-15T23:59:00-05:00" }
 *               puntajeMaximo: { type: number, example: 5 }
 *               permiteEntregaTardia: { type: boolean }
 *               cronogramaId: { type: integer, description: Sesión del cronograma (opcional) }
 *               estado: { type: string, enum: [borrador, publicada] }
 *     responses:
 *       201:
 *         description: Actividad creada
 *       400:
 *         description: Error de validación
 *       403:
 *         description: El docente no es dueño del curso
 *       404:
 *         description: Curso no encontrado
 */
router.post('/', actividadController.crearActividad);

/**
 * @swagger
 * /api/cursos/{cursoId}/actividades:
 *   get:
 *     summary: Consultar el cronograma de actividades de un curso (HU-012)
 *     tags: [Actividad]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: usuarioId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Estudiante inscrito o docente dueño del curso
 *     responses:
 *       200:
 *         description: Actividades con fecha límite y estado de entrega
 *       403:
 *         description: No inscrito o sin permiso
 *       404:
 *         description: Curso o usuario no encontrado
 */
router.get('/', actividadController.listarPorCurso);

module.exports = router;