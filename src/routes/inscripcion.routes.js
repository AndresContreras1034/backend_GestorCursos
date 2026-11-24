const express = require('express');
const router = express.Router();
const inscripcionController = require('../controllers/inscripcion.controller');

/**
 * @swagger
 * /api/inscripciones:
 *   post:
 *     summary: Inscribirse en un curso (HU-006)
 *     tags: [Inscripcion]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estudianteId:
 *                 type: integer
 *               cursoId:
 *                 type: integer
 *               ofertaId:
 *                 type: integer
 *                 description: Obligatorio si el curso tiene ofertas activas
 *     responses:
 *       201:
 *         description: Inscripción creada exitosamente
 *       400:
 *         description: Curso no encontrado, rol inválido o ya inscrito
 */
router.post('/', inscripcionController.inscribirse);

/**
 * @swagger
 * /api/inscripciones/estudiante/{estudianteId}:
 *   get:
 *     summary: Listar los cursos en los que está inscrito un estudiante
 *     tags: [Inscripcion]
 *     parameters:
 *       - in: path
 *         name: estudianteId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de inscripciones del estudiante
 */
router.get('/estudiante/:estudianteId', inscripcionController.listarPorEstudiante);

/**
 * @swagger
 * /api/inscripciones/{id}/retirar:
 *   patch:
 *     summary: Retirar a un estudiante de una inscripción activa
 *     tags: [Inscripcion]
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
 *             required: [estudianteId]
 *             properties:
 *               estudianteId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Inscripción marcada como retirada
 *       400:
 *         description: Datos inválidos
 *       403:
 *         description: La inscripción pertenece a otro estudiante
 *       404:
 *         description: Inscripción activa no encontrada
 */
router.patch('/:id/retirar', inscripcionController.retirarInscripcion);

module.exports = router;