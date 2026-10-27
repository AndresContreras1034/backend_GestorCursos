const express = require('express');
const controller = require('../controllers/matricula.controller');

/** Se monta en /api/cursos/:cursoId */
const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * /api/cursos/{cursoId}/matriculas:
 *   post:
 *     summary: El docente matricula a un estudiante (por id, email o cédula)
 *     description: Respeta el cupo máximo del curso y los cupos de la oferta. No aplica las fechas de apertura/cierre de la oferta.
 *     tags: [Matricula]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [docenteId]
 *             properties:
 *               docenteId: { type: integer }
 *               estudianteId: { type: integer }
 *               email: { type: string }
 *               cedula: { type: string }
 *               ofertaId: { type: integer, description: Obligatorio si el curso tiene ofertas activas }
 *     responses:
 *       201:
 *         description: Estudiante matriculado
 *       404:
 *         description: Curso, estudiante u oferta no encontrados
 *       409:
 *         description: Ya inscrito o sin cupos
 */
router.post('/matriculas', controller.matricular);

/**
 * @swagger
 * /api/cursos/{cursoId}/matriculas/lote:
 *   post:
 *     summary: Matricular varios estudiantes a la vez (máximo 200)
 *     description: No es todo-o-nada; devuelve los matriculados y los omitidos con su motivo.
 *     tags: [Matricula]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [docenteId, estudiantes]
 *             properties:
 *               docenteId: { type: integer }
 *               ofertaId: { type: integer }
 *               estudiantes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     estudianteId: { type: integer }
 *                     email: { type: string }
 *                     cedula: { type: string }
 *     responses:
 *       201:
 *         description: Resultado de la matrícula en lote
 */
router.post('/matriculas/lote', controller.matricularLote);

/**
 * @swagger
 * /api/cursos/{cursoId}/matriculas:
 *   get:
 *     summary: Inscritos, cupos y lista de espera del curso (vista del docente)
 *     tags: [Matricula]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: docenteId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Inscritos y lista de espera
 *       403:
 *         description: El docente no es dueño del curso
 */
router.get('/matriculas', controller.consultarMatriculas);

/**
 * @swagger
 * /api/cursos/{cursoId}/matriculas/{inscripcionId}:
 *   delete:
 *     summary: El docente retira a un estudiante; si hay lista de espera entra el primero de la fila
 *     tags: [Matricula]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: inscripcionId
 *         required: true
 *         schema: { type: integer }
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
 *       200:
 *         description: Inscripción retirada y estudiantes promovidos desde la lista de espera
 *       404:
 *         description: Inscripción activa no encontrada
 */
router.delete('/matriculas/:inscripcionId', controller.retirar);

/**
 * @swagger
 * /api/cursos/{cursoId}/lista-espera:
 *   post:
 *     summary: El estudiante se une a la lista de espera de un curso sin cupos
 *     tags: [Matricula]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estudianteId]
 *             properties:
 *               estudianteId: { type: integer }
 *               ofertaId: { type: integer }
 *     responses:
 *       201:
 *         description: Posición en la lista de espera
 *       400:
 *         description: El curso aún tiene cupos
 *       409:
 *         description: Ya inscrito o ya en espera
 */
router.post('/lista-espera', controller.unirseEspera);

/**
 * @swagger
 * /api/cursos/{cursoId}/lista-espera:
 *   get:
 *     summary: Consultar mi posición en la lista de espera
 *     tags: [Matricula]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: estudianteId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: enListaEspera y posicion
 */
router.get('/lista-espera', controller.posicionEspera);

/**
 * @swagger
 * /api/cursos/{cursoId}/lista-espera:
 *   delete:
 *     summary: Salir de la lista de espera
 *     tags: [Matricula]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estudianteId]
 *             properties:
 *               estudianteId: { type: integer }
 *     responses:
 *       200:
 *         description: Saliste de la lista
 *       404:
 *         description: No estabas en la lista
 */
router.delete('/lista-espera', controller.salirEspera);

module.exports = router;
