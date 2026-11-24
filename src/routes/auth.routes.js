const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Crear una nueva cuenta de usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, apellido, email, password, rol, fechaNacimiento, genero]
 *             properties:
 *               nombre:
 *                 type: string
 *               apellido:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *                 description: "8-72 caracteres, mayúscula, minúscula y número"
 *               rol:
 *                 type: string
 *                 enum: [estudiante, docente]
 *               fechaNacimiento:
 *                 type: string
 *                 example: "2000-05-20"
 *               genero:
 *                 type: string
 *                 enum: [masculino, femenino, otro, prefiero_no_decir]
 *               telefono:
 *                 type: string
 *               tipoDocumento:
 *                 type: string
 *                 enum: [CC, TI, CE, PASAPORTE]
 *               cedula:
 *                 type: string
 *               familiar:
 *                 type: object
 *                 description: Obligatorio si el usuario es menor de 18 años
 *                 properties:
 *                   nombreCompleto:
 *                     type: string
 *                   parentesco:
 *                     type: string
 *                     enum: [padre, madre, acudiente, hermano, abuelo, tio, conyuge, otro]
 *                   telefono:
 *                     type: string
 *                   email:
 *                     type: string
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *       400:
 *         description: Error de validación
 */
router.post('/register', authController.registrar);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', authController.login);

module.exports = router;
