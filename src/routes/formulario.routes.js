const express = require('express');
const controller = require('../controllers/formulario.controller');

const router = express.Router();

/**
 * @swagger
 * /api/formularios/generar-ia:
 *   post:
 *     summary: Generar un formulario de selección con DeepSeek
 *     description: Devuelve un borrador por defecto. Con guardar=true lo almacena en el banco del docente.
 *     tags: [Formulario]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [docenteId, prompt]
 *             properties:
 *               docenteId: { type: integer }
 *               prompt: { type: string, example: "Examen de 10 preguntas de algoritmos para estudiantes de 9 semestre" }
 *               guardar: { type: boolean, default: false }
 *     responses:
 *       200: { description: Formulario generado }
 *       422: { description: La solicitud no pide crear una evaluación }
 *       502: { description: Error o respuesta inválida del servicio de IA }
 *       503: { description: IA no configurada }
 */
router.post('/generar-ia', controller.generarConIA);

/**
 * @swagger
 * /api/formularios:
 *   post:
 *     summary: Crear un formulario manualmente (HU-019)
 *     tags: [Formulario]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [docenteId, titulo, preguntas]
 *             properties:
 *               docenteId: { type: integer }
 *               titulo: { type: string }
 *               descripcion: { type: string }
 *               preguntas:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [enunciado, tipo, opciones]
 *                   properties:
 *                     enunciado: { type: string }
 *                     tipo: { type: string, enum: [seleccion_unica, seleccion_multiple] }
 *                     puntaje: { type: number, default: 1 }
 *                     explicacion: { type: string }
 *                     opciones:
 *                       type: array
 *                       items:
 *                         type: object
 *                         required: [texto, esCorrecta]
 *                         properties:
 *                           texto: { type: string }
 *                           esCorrecta: { type: boolean }
 *     responses:
 *       201: { description: Formulario creado }
 *       400: { description: Validación inválida }
 *       403: { description: No es docente }
 */
router.post('/', controller.crear);

/**
 * @swagger
 * /api/formularios:
 *   get:
 *     summary: Listar los formularios del docente
 *     tags: [Formulario]
 *     parameters:
 *       - { in: query, name: docenteId, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Formularios del banco }
 */
router.get('/', controller.listar);

/**
 * @swagger
 * /api/formularios/{id}:
 *   get:
 *     summary: Obtener el formulario completo (solo su docente)
 *     tags: [Formulario]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: query, name: docenteId, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Formulario completo }
 *       403: { description: No es el dueño }
 *       404: { description: No encontrado }
 */
router.get('/:id', controller.obtener);

/**
 * @swagger
 * /api/formularios/{id}/vista-previa:
 *   get:
 *     summary: Vista previa sin respuestas correctas
 *     tags: [Formulario]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: query, name: docenteId, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Vista previa del formulario }
 */
router.get('/:id/vista-previa', controller.vistaPrevia);

/**
 * @swagger
 * /api/formularios/{id}:
 *   put:
 *     summary: Editar un formulario sin envíos previos
 *     tags: [Formulario]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [docenteId]
 *             properties:
 *               docenteId: { type: integer }
 *               titulo: { type: string }
 *               descripcion: { type: string }
 *               preguntas: { type: array, items: { type: object } }
 *     responses:
 *       200: { description: Formulario actualizado }
 *       409: { description: Ya tiene respuestas }
 */
router.put('/:id', controller.actualizar);

/**
 * @swagger
 * /api/formularios/{id}:
 *   delete:
 *     summary: Desactivar un formulario del banco
 *     tags: [Formulario]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [docenteId]
 *             properties:
 *               docenteId: { type: integer }
 *     responses:
 *       204: { description: Formulario desactivado }
 */
router.delete('/:id', controller.eliminar);

module.exports = router;
