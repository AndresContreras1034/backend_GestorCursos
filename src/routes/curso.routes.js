const express = require('express');
const router = express.Router();
const cursoController = require('../controllers/curso.controller');

/**
 * @swagger
 * /api/cursos:
 *   post:
 *     summary: Crear un nuevo curso
 *     tags: [Curso]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               docenteId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Curso creado exitosamente
 *       400:
 *         description: Error de validación
 */
router.post('/', cursoController.crearCurso);

/**
 * @swagger
 * /api/cursos:
 *   get:
 *     summary: Consultar cursos disponibles, con filtro/búsqueda opcional
 *     tags: [Curso]
 *     parameters:
 *       - in: query
 *         name: busqueda
 *         schema:
 *           type: string
 *         description: Filtra por nombre, descripción o nombre del docente
 *     responses:
 *       200:
 *         description: Lista de cursos
 */
router.get('/', cursoController.listarCursos);

/**
 * @swagger
 * /api/cursos/{id}:
 *   put:
 *     summary: Editar información de un curso (HU-004)
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
 *             properties:
 *               docenteId:
 *                 type: integer
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               imagenCurso:
 *                 type: string
 *     responses:
 *       200:
 *         description: Curso actualizado exitosamente
 *       400:
 *         description: Error de validación, curso no encontrado o sin permiso
 */
router.put('/:id', cursoController.actualizarCurso);

module.exports = router;