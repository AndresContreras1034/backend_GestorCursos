const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');

/**
 * @swagger
 * /api/usuarios/{id}:
 *   get:
 *     summary: Consultar el perfil de un usuario
 *     tags: [Usuario]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Perfil encontrado
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/:id', usuarioController.obtenerPerfil);

/**
 * @swagger
 * /api/usuarios/{id}:
 *   put:
 *     summary: Actualizar el perfil de un usuario
 *     tags: [Usuario]
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
 *               nombre:
 *                 type: string
 *               email:
 *                 type: string
 *               cedula:
 *                 type: string
 *               fechaNacimiento:
 *                 type: string
 *                 format: date
 *                 example: "2005-03-14"
 *               fotoPerfil:
 *                 type: string
 *                 description: Imagen en base64 (data:image/png;base64,...)
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       400:
 *         description: Error de validación
 *       404:
 *         description: Usuario no encontrado
 */
router.put('/:id', usuarioController.actualizarPerfil);

/**
 * @swagger
 * /api/usuarios/{id}:
 *   delete:
 *     summary: Desactivar un usuario (baja lógica)
 *     tags: [Usuario]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Usuario desactivado; sus datos e historial se conservan
 *       404:
 *         description: Usuario no encontrado o ya desactivado
 */
router.delete('/:id', usuarioController.desactivarUsuario);

module.exports = router;