const express = require('express');
const cronogramaController = require('../controllers/cronograma.controller');

/**
 * Router anidado: se monta en /api/cursos/:cursoId/sesiones
 */
const routerAnidado = express.Router({ mergeParams: true });

/**
 * @swagger
 * /api/cursos/{cursoId}/sesiones:
 *   post:
 *     summary: Crear una sesión en el cronograma de un curso
 *     tags: [Cronograma]
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
 *             properties:
 *               docenteId:
 *                 type: integer
 *               titulo:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               fechaInicio:
 *                 type: string
 *               fechaFin:
 *                 type: string
 *               orden:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Sesión creada exitosamente
 *       400:
 *         description: Error de validación
 */
routerAnidado.post('/', cronogramaController.crearSesion);

/**
 * @swagger
 * /api/cursos/{cursoId}/sesiones:
 *   get:
 *     summary: Listar el cronograma (sesiones) de un curso
 *     tags: [Cronograma]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de sesiones del curso
 */
routerAnidado.get('/', cronogramaController.listarPorCurso);

/**
 * Router plano: se monta en /api/sesiones
 */
const routerPlano = express.Router();

/**
 * @swagger
 * /api/sesiones/{id}:
 *   put:
 *     summary: Editar una sesión del cronograma
 *     tags: [Cronograma]
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
 *             properties:
 *               docenteId:
 *                 type: integer
 *               titulo:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               fechaInicio:
 *                 type: string
 *               fechaFin:
 *                 type: string
 *               orden:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Sesión actualizada exitosamente
 *       400:
 *         description: Error de validación, sesión no encontrada o sin permiso
 */
routerPlano.put('/:id', cronogramaController.actualizarSesion);

/**
 * @swagger
 * /api/sesiones/{id}:
 *   delete:
 *     summary: Eliminar (desactivar) una sesión del cronograma
 *     tags: [Cronograma]
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
 *             properties:
 *               docenteId:
 *                 type: integer
 *     responses:
 *       204:
 *         description: Sesión eliminada exitosamente
 *       400:
 *         description: Error de validación, sesión no encontrada o sin permiso
 */
routerPlano.delete('/:id', cronogramaController.eliminarSesion);

module.exports = { routerAnidado, routerPlano };