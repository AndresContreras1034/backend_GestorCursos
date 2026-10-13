const express = require('express');
const actividadController = require('../controllers/actividad.controller');
const entregaController = require('../controllers/entrega.controller');

/**
 * Router anidado: se monta en /api/cursos/:cursoId/actividades
 */
const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * /api/cursos/{cursoId}/actividades:
 *   post:
 *     summary: Crear una actividad o tarea en un curso (HU-011)
 *     tags: [Actividad]
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
 *             required: [docenteId, titulo, instrucciones, fechaLimite]
 *             properties:
 *               docenteId: { type: integer }
 *               titulo: { type: string }
 *               instrucciones: { type: string }
 *               fechaLimite: { type: string, example: "2026-12-15T23:59:00-05:00" }
 *               puntajeMaximo: { type: number, example: 5 }
 *               permiteEntregaTardia: { type: boolean }
 *               permiteReemplazoEntrega: { type: boolean }
 *               cronogramaId: { type: integer, description: Sesión del cronograma (opcional) }
 *               estado: { type: string, enum: [borrador, publicada] }
 *     responses:
 *       201:
 *         description: Actividad creada
 *       400:
 *         description: Error de validación
 *       403:
 *         description: El docente no es dueño del curso
 *       404:
 *         description: Curso no encontrado
 */
router.post('/', actividadController.crearActividad);

/**
 * @swagger
 * /api/cursos/{cursoId}/actividades:
 *   get:
 *     summary: Consultar el cronograma de actividades de un curso (HU-012)
 *     tags: [Actividad]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: usuarioId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Estudiante inscrito o docente dueño del curso
 *     responses:
 *       200:
 *         description: Actividades con fecha límite y estado de entrega
 *       403:
 *         description: No inscrito o sin permiso
 *       404:
 *         description: Curso o usuario no encontrado
 */
router.get('/', actividadController.listarPorCurso);

/**
 * @swagger
 * /api/cursos/{cursoId}/actividades/{actividadId}/entregas:
 *   get:
 *     summary: Consultar entregas de estudiantes de una actividad (HU-014)
 *     tags: [Actividad]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: actividadId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: docenteId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Entregas y estudiantes sin entrega
 *       400:
 *         description: Error de validación
 *       403:
 *         description: El usuario no es el docente dueño del curso
 *       404:
 *         description: Curso, docente o actividad no encontrada
 */
router.get('/:actividadId/entregas', entregaController.listarEntregas);

/**
 * @swagger
 * /api/cursos/{cursoId}/actividades/{actividadId}/entregas/{entregaId}/archivo:
 *   get:
 *     summary: Abrir el archivo entregado en una actividad (HU-014)
 *     tags: [Actividad]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: actividadId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: entregaId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: docenteId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: descargar
 *         required: false
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Archivo de la entrega
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Error de validación
 *       403:
 *         description: El usuario no es el docente dueño del curso
 *       404:
 *         description: Curso, docente, actividad, entrega o archivo no encontrado
 */
router.get('/:actividadId/entregas/:entregaId/archivo', entregaController.verArchivo);

/**
 * @swagger
 * /api/cursos/{cursoId}/actividades/{actividadId}/entregas:
 *   post:
 *     summary: Entregar una actividad (HU-013)
 *     tags: [Actividad]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: actividadId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estudianteId, archivo, archivoNombre]
 *             properties:
 *               estudianteId: { type: integer }
 *               archivo: { type: string, description: Data URI base64 del archivo }
 *               archivoNombre: { type: string }
 *               comentario: { type: string }
 *     responses:
 *       200:
 *         description: Entrega reemplazada
 *       201:
 *         description: Entrega creada
 *       400:
 *         description: Archivo o validación inválida
 *       403:
 *         description: Reglas de negocio no cumplidas
 *       404:
 *         description: Curso o actividad no encontrada
 *       409:
 *         description: Entrega ya calificada o reemplazo no permitido
 */
router.post('/:actividadId/entregas', entregaController.entregar);

// Configuración de entrega y reemplazos del docente
/**
 * @swagger
 * /api/cursos/{cursoId}/actividades/{actividadId}/configuracion-entrega:
 *   patch:
 *     summary: Actualizar la configuración de entrega de una actividad
 *     tags: [Actividad]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: actividadId
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
 *               docenteId: { type: integer }
 *               permiteEntregaTardia: { type: boolean }
 *               permiteReemplazoEntrega: { type: boolean }
 *     responses:
 *       200:
 *         description: Configuración actualizada
 *       400:
 *         description: Validación inválida
 *       403:
 *         description: El docente no es dueño del curso
 *       404:
 *         description: Curso o actividad no encontrada
 */
router.patch('/:actividadId/configuracion-entrega', actividadController.actualizarConfigEntrega);

module.exports = router;