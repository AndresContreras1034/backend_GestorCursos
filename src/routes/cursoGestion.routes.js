const express = require('express');
const controller = require('../controllers/cursoGestion.controller');

/** Se monta en /api/cursos (complementa curso.routes.js) */
const router = express.Router();

/**
 * @swagger
 * /api/cursos/{id}:
 *   get:
 *     summary: Consultar el detalle de un curso
 *     tags: [Curso]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalle del curso con docente, total de estudiantes y de actividades
 *       404:
 *         description: Curso no encontrado
 */
router.get('/:id', controller.obtenerCurso);

/**
 * @swagger
 * /api/cursos/{id}:
 *   delete:
 *     summary: Eliminar (desactivar) un curso
 *     tags: [Curso]
 *     parameters:
 *       - in: path
 *         name: id
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
 *         description: Curso eliminado
 *       400:
 *         description: docenteId faltante
 *       403:
 *         description: El docente no es dueño del curso
 *       404:
 *         description: Curso no encontrado
 */
router.delete('/:id', controller.eliminarCurso);

module.exports = router;
