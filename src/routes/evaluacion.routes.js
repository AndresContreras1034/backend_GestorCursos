const express = require('express');
const evaluacionController = require('../controllers/evaluacion.controller');

const routerAnidado = express.Router({ mergeParams: true });

/**
 * @swagger
 * /api/cursos/{cursoId}/evaluaciones:
 *   post:
 *     summary: Crear una evaluación de curso
 *     description: Recurso de evaluación con su puntaje y fecha límite; la evaluación/retroalimentación de entregas se realiza en actividades.
 *     tags: [Evaluacion]
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
 *             required: [docenteId, titulo]
 *             properties:
 *               docenteId:
 *                 type: integer
 *               titulo:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               fechaLimite:
 *                 type: string
 *                 format: date-time
 *               puntajeMaximo:
 *                 type: number
 *                 maximum: 100
 *                 default: 100
 *     responses:
 *       201:
 *         description: Evaluación creada
 *       400:
 *         description: Error de validación
 *       403:
 *         description: El docente no es dueño del curso
 *       404:
 *         description: Curso no encontrado
 */
routerAnidado.post('/', evaluacionController.crearEvaluacion);

/**
 * @swagger
 * /api/cursos/{cursoId}/evaluaciones:
 *   get:
 *     summary: Listar evaluaciones activas de un curso
 *     tags: [Evaluacion]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Evaluaciones del curso
 *       404:
 *         description: Curso no encontrado
 */
routerAnidado.get('/', evaluacionController.listarPorCurso);

const routerPlano = express.Router();

/**
 * @swagger
 * /api/evaluaciones/{id}:
 *   put:
 *     summary: Actualizar una evaluación
 *     tags: [Evaluacion]
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
 *               docenteId:
 *                 type: integer
 *               titulo:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               fechaLimite:
 *                 type: string
 *                 nullable: true
 *                 format: date-time
 *               puntajeMaximo:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Evaluación actualizada
 *       400:
 *         description: Error de validación
 *       403:
 *         description: El docente no es dueño del curso
 *       404:
 *         description: Evaluación no encontrada
 */
routerPlano.put('/:id', evaluacionController.actualizarEvaluacion);

/**
 * @swagger
 * /api/evaluaciones/{id}:
 *   delete:
 *     summary: Desactivar una evaluación
 *     tags: [Evaluacion]
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
 *               docenteId:
 *                 type: integer
 *     responses:
 *       204:
 *         description: Evaluación desactivada
 *       403:
 *         description: El docente no es dueño del curso
 *       404:
 *         description: Evaluación no encontrada
 */
routerPlano.delete('/:id', evaluacionController.eliminarEvaluacion);

module.exports = { routerAnidado, routerPlano };
