const express = require('express');
const controller = require('../controllers/actividadGestion.controller');

/** Se monta en /api/cursos/:cursoId/actividades (complementa actividad.routes.js) */
const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * /api/cursos/{cursoId}/actividades/{actividadId}:
 *   put:
 *     summary: Editar una actividad (solo el docente dueño del curso)
 *     description: Se puede enviar cualquier subconjunto de campos. No se cambia el puntaje si ya hay entregas calificadas.
 *     tags: [Actividad]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: actividadId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [docenteId]
 *             properties:
 *               docenteId: { type: integer, example: 1 }
 *               titulo: { type: string }
 *               instrucciones: { type: string }
 *               fechaLimite: { type: string, example: "2026-12-20T23:59:00-05:00" }
 *               puntajeMaximo: { type: number, example: 5 }
 *               estado: { type: string, enum: [borrador, publicada, cerrada] }
 *               permiteEntregaTardia: { type: boolean }
 *               permiteReemplazoEntrega: { type: boolean }
 *               cronogramaId: { type: integer, nullable: true }
 *     responses:
 *       200:
 *         description: Actividad actualizada
 *       400:
 *         description: Validación inválida
 *       403:
 *         description: El docente no es dueño del curso
 *       404:
 *         description: Curso o actividad no encontrada
 *       409:
 *         description: Puntaje no modificable (hay entregas calificadas)
 */
router.put('/:actividadId', controller.actualizarActividad);

/**
 * @swagger
 * /api/cursos/{cursoId}/actividades/{actividadId}:
 *   delete:
 *     summary: Eliminar (desactivar) una actividad
 *     tags: [Actividad]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: actividadId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [docenteId]
 *             properties:
 *               docenteId: { type: integer, example: 1 }
 *     responses:
 *       200:
 *         description: Actividad eliminada
 *       400:
 *         description: docenteId faltante
 *       403:
 *         description: El docente no es dueño del curso
 *       404:
 *         description: Curso o actividad no encontrada
 */
router.delete('/:actividadId', controller.eliminarActividad);

module.exports = router;
