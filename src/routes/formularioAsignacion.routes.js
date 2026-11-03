const express = require('express');
const controller = require('../controllers/formularioAsignacion.controller');

const routerAnidado = express.Router({ mergeParams: true });

/**
 * @swagger
 * /api/cursos/{cursoId}/formularios:
 *   post:
 *     summary: Asignar un formulario del banco al curso
 *     description: Con revisionDocente=true, el docente debe publicar manualmente los resultados.
 *     tags: [Formulario asignado]
 *     parameters:
 *       - { in: path, name: cursoId, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [docenteId, formularioId]
 *             properties:
 *               docenteId: { type: integer }
 *               formularioId: { type: integer }
 *               actividadId: { type: integer }
 *               fechaApertura: { type: string, format: date-time }
 *               fechaCierre: { type: string, format: date-time }
 *               puntajeMaximo: { type: number, enum: [5], default: 5 }
 *               duracionMinutos: { type: integer, nullable: true, minimum: 1, maximum: 1440, description: Omitir o enviar null para no establecer límite de tiempo. El reloj inicia cuando el estudiante abre el examen por primera vez }
 *               revisionDocente: { type: boolean, default: true }
 *               estado: { type: string, enum: [borrador, publicada], default: publicada }
 *     responses:
 *       201: { description: Formulario asignado y calificado sobre 5 }
 *       409: { description: La actividad ya tiene un formulario asignado }
 *       403: { description: El docente no es dueño del curso o del formulario }
 */
routerAnidado.post('/', controller.asignar);

/**
 * @swagger
 * /api/cursos/{cursoId}/formularios:
 *   get:
 *     summary: Listar formularios del curso para docente o estudiante
 *     tags: [Formulario asignado]
 *     parameters:
 *       - { in: path, name: cursoId, required: true, schema: { type: integer } }
 *       - { in: query, name: usuarioId, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Formularios asignados }
 */
routerAnidado.get('/', controller.listarPorCurso);

const routerPlano = express.Router();

/**
 * @swagger
 * /api/formulario-asignaciones/{id}/responder:
 *   get:
 *     summary: Obtener el formulario sin respuestas correctas (HU-020)
 *     tags: [Formulario asignado]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: query, name: estudianteId, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Preguntas, hora de inicio y tiempo restante del examen }
 *       403: { description: No inscrito o fuera de la ventana de disponibilidad }
 *       409: { description: Ya fue respondido o se agotó el tiempo }
 */
routerPlano.get('/:id/responder', controller.responder);

/**
 * @swagger
 * /api/formulario-asignaciones/{id}/envios:
 *   post:
 *     summary: Enviar respuestas y calificar automáticamente (HU-020/HU-021)
 *     tags: [Formulario asignado]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estudianteId, respuestas]
 *             properties:
 *               estudianteId: { type: integer }
 *               respuestas:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [preguntaId, opcionIds]
 *                   properties:
 *                     preguntaId: { type: integer }
 *                     opcionIds: { type: array, items: { type: integer } }
 *     responses:
 *       201: { description: Envío recibido }
 *       400: { description: Respuestas inválidas o incompletas }
 *       403: { description: Fuera del plazo o no inscrito }
 *       409: { description: Ya enviado }
 */
routerPlano.post('/:id/envios', controller.enviar);

/**
 * @swagger
 * /api/formulario-asignaciones/{id}/mi-resultado:
 *   get:
 *     summary: Consultar resultado cuando haya sido publicado
 *     tags: [Formulario asignado]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: query, name: estudianteId, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Resultado o aviso de publicación pendiente }
 *       404: { description: Aún no respondido }
 */
routerPlano.get('/:id/mi-resultado', controller.miResultado);

/**
 * @swagger
 * /api/formulario-asignaciones/{id}/resultados:
 *   get:
 *     summary: Revisar resultados del curso (HU-021)
 *     tags: [Formulario asignado]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: query, name: docenteId, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Resumen de envíos y estudiantes sin enviar }
 */
routerPlano.get('/:id/resultados', controller.resultados);

/**
 * @swagger
 * /api/formulario-asignaciones/{id}/resultados/{envioId}:
 *   get:
 *     summary: Consultar el detalle de un envío
 *     tags: [Formulario asignado]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: path, name: envioId, required: true, schema: { type: integer } }
 *       - { in: query, name: docenteId, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Respuestas y calificación detallada }
 */
routerPlano.get('/:id/resultados/:envioId', controller.envio);

/**
 * @swagger
 * /api/formulario-asignaciones/{id}/publicar-resultados:
 *   patch:
 *     summary: Publicar resultados para los estudiantes (HU-021)
 *     tags: [Formulario asignado]
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
 *       200: { description: Resultados publicados }
 *       409: { description: Ya estaban publicados }
 */
routerPlano.patch('/:id/publicar-resultados', controller.publicar);

module.exports = { routerAnidado, routerPlano };
