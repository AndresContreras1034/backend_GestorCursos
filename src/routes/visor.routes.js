const express = require('express');
const visorController = require('../controllers/visor.controller');

const router = express.Router();

/**
 * @swagger
 * /api/recursos/{id}/archivo:
 *   get:
 *     summary: Visualizar el archivo de un recurso dentro del navegador (inline)
 *     tags: [Recurso]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: usuarioId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Archivo con su Content-Type original
 *       206:
 *         description: Contenido parcial (Range)
 *       403:
 *         description: Sin permiso sobre el curso del recurso
 *       404:
 *         description: Archivo no encontrado
 */
router.get('/:id/archivo', visorController.verArchivoRecurso);

module.exports = router;