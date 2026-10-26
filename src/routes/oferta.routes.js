const express = require('express');
const ofertaController = require('../controllers/oferta.controller');

const routerAnidado = express.Router({ mergeParams: true });

/**
 * @swagger
 * /api/cursos/{cursoId}/ofertas:
 *   post:
 *     summary: Crear una oferta educativa para un curso
 *     tags: [Oferta]
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
 *             required: [docenteId, cupos, modalidad]
 *             properties:
 *               docenteId:
 *                 type: integer
 *               cupos:
 *                 type: integer
 *                 minimum: 1
 *               fechaApertura:
 *                 type: string
 *                 format: date-time
 *               fechaCierre:
 *                 type: string
 *                 format: date-time
 *               modalidad:
 *                 type: string
 *                 enum: [virtual, presencial, hibrida]
 *     responses:
 *       201:
 *         description: Oferta creada
 *       400:
 *         description: Error de validación
 *       403:
 *         description: El docente no es dueño del curso
 *       404:
 *         description: Curso no encontrado
 */
routerAnidado.post('/', ofertaController.crearOferta);

/**
 * @swagger
 * /api/cursos/{cursoId}/ofertas:
 *   get:
 *     summary: Listar ofertas activas de un curso
 *     tags: [Oferta]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ofertas del curso
 *       404:
 *         description: Curso no encontrado
 */
routerAnidado.get('/', ofertaController.listarPorCurso);

const routerPlano = express.Router();

/**
 * @swagger
 * /api/ofertas/{id}:
 *   put:
 *     summary: Actualizar cupos, fechas o modalidad de una oferta
 *     tags: [Oferta]
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
 *               cupos:
 *                 type: integer
 *                 minimum: 1
 *               fechaApertura:
 *                 type: string
 *                 nullable: true
 *                 format: date-time
 *               fechaCierre:
 *                 type: string
 *                 nullable: true
 *                 format: date-time
 *               modalidad:
 *                 type: string
 *                 enum: [virtual, presencial, hibrida]
 *     responses:
 *       200:
 *         description: Oferta actualizada
 *       400:
 *         description: Error de validación
 *       403:
 *         description: El docente no es dueño del curso
 *       404:
 *         description: Oferta no encontrada
 */
routerPlano.put('/:id', ofertaController.actualizarOferta);

/**
 * @swagger
 * /api/ofertas/{id}:
 *   delete:
 *     summary: Desactivar una oferta educativa
 *     tags: [Oferta]
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
 *         description: Oferta desactivada
 *       403:
 *         description: El docente no es dueño del curso
 *       404:
 *         description: Oferta no encontrada
 */
routerPlano.delete('/:id', ofertaController.eliminarOferta);

module.exports = { routerAnidado, routerPlano };
