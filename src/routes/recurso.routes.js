const express = require('express');
const router = express.Router();
const recursoController = require('../controllers/recurso.controller');

/**
 * @swagger
 * /api/recursos:
 *   post:
 *     summary: Publicar un recurso en un curso (HU-008)
 *     tags: [Recurso]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cursoId:
 *                 type: integer
 *               docenteId:
 *                 type: integer
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               enlace:
 *                 type: string
 *                 description: Opcional si se envía archivo
 *               archivo:
 *                 type: string
 *                 description: Archivo en base64 (data:image/...;base64, data:application/pdf;base64, data:application/zip;base64). Opcional si se envía enlace.
 *               archivoNombre:
 *                 type: string
 *                 description: Nombre original del archivo (obligatorio si se envía archivo)
 *     responses:
 *       201:
 *         description: Recurso publicado exitosamente
 *       400:
 *         description: Curso no encontrado, sin permiso, tipo de archivo no soportado, o datos faltantes
 */
router.post('/', recursoController.publicarRecurso);

/**
 * @swagger
 * /api/recursos/curso/{cursoId}:
 *   get:
 *     summary: Listar los recursos de un curso (HU-009)
 *     tags: [Recurso]
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
 *         description: Debe estar inscrito en el curso para consultar sus recursos
 *     responses:
 *       200:
 *         description: Lista de recursos del curso
 *       400:
 *         description: Curso no encontrado o estudiante no inscrito
 */
router.get('/curso/:cursoId', recursoController.listarPorCurso);

/**
 * @swagger
 * /api/recursos/{id}:
 *   put:
 *     summary: Editar un recurso publicado (HU-010)
 *     tags: [Recurso]
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
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               enlace:
 *                 type: string
 *               archivo:
 *                 type: string
 *               archivoNombre:
 *                 type: string
 *     responses:
 *       200:
 *         description: Recurso actualizado exitosamente
 *       400:
 *         description: Recurso no encontrado, sin permiso, o datos inválidos
 */
router.put('/:id', recursoController.actualizarRecurso);

/**
 * @swagger
 * /api/recursos/{id}:
 *   delete:
 *     summary: Eliminar un recurso publicado (HU-010)
 *     tags: [Recurso]
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
 *       200:
 *         description: Recurso eliminado exitosamente
 *       400:
 *         description: Recurso no encontrado o sin permiso
 */
router.delete('/:id', recursoController.eliminarRecurso);

module.exports = router;