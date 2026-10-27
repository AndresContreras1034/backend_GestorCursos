const express = require('express');
const controller = require('../controllers/organizacion.controller');

/** Se monta en /api/cursos/:cursoId */
const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * /api/cursos/{cursoId}/organizacion:
 *   get:
 *     summary: Cortes (con sus temÃ¡ticas), catÃ¡logo de temÃ¡ticas y horario semanal del curso
 *     tags: [Organizacion]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: OrganizaciÃ³n del curso
 *       404:
 *         description: Curso no encontrado
 */
router.get('/organizacion', controller.consultarOrganizacion);

/**
 * @swagger
 * /api/cursos/{cursoId}/cortes:
 *   put:
 *     summary: Actualizar fechas y porcentajes de los 3 cortes
 *     description: Siempre se envÃ­an los 3 cortes. Falla (409) si alguna actividad existente quedarÃ­a fuera de las fechas de su corte.
 *     tags: [Organizacion]
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
 *             required: [docenteId, cortes]
 *             properties:
 *               docenteId: { type: integer }
 *               cortes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     numero: { type: integer }
 *                     fechaInicio: { type: string, example: "2026-08-03" }
 *                     fechaFin: { type: string, example: "2026-09-18" }
 *                     porcentaje: { type: number, example: 30 }
 *     responses:
 *       200:
 *         description: Cortes actualizados
 *       400:
 *         description: Fechas o porcentajes invÃ¡lidos
 *       403:
 *         description: El docente no es dueÃ±o del curso
 *       409:
 *         description: Hay actividades que quedarÃ­an fuera del corte
 */
router.put('/cortes', controller.actualizarCortes);

/**
 * @swagger
 * /api/cursos/{cursoId}/tematicas:
 *   post:
 *     summary: Crear una temÃ¡tica y asignarla a uno o varios cortes
 *     tags: [Organizacion]
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
 *             required: [docenteId, nombre]
 *             properties:
 *               docenteId: { type: integer }
 *               nombre: { type: string }
 *               descripcion: { type: string }
 *               cortes: { type: array, items: { type: integer }, example: [1, 3] }
 *     responses:
 *       201:
 *         description: TemÃ¡tica creada
 *       409:
 *         description: Nombre repetido en el curso
 */
router.post('/tematicas', controller.crearTematica);

/**
 * @swagger
 * /api/cursos/{cursoId}/tematicas/{tematicaId}:
 *   put:
 *     summary: Editar una temÃ¡tica o cambiar los cortes donde aparece
 *     tags: [Organizacion]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: tematicaId
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
 *               nombre: { type: string }
 *               descripcion: { type: string, nullable: true }
 *               cortes: { type: array, items: { type: integer } }
 *     responses:
 *       200:
 *         description: TemÃ¡tica actualizada
 *       404:
 *         description: TemÃ¡tica no encontrada
 *       409:
 *         description: Nombre repetido o la temÃ¡tica ya tiene actividades en un corte que se quiere quitar
 */
router.put('/tematicas/:tematicaId', controller.actualizarTematica);

/**
 * @swagger
 * /api/cursos/{cursoId}/tematicas/{tematicaId}:
 *   delete:
 *     summary: Eliminar una temÃ¡tica sin actividades
 *     tags: [Organizacion]
 *     parameters:
 *       - in: path
 *         name: cursoId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: tematicaId
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
 *         description: TemÃ¡tica eliminada
 *       409:
 *         description: La temÃ¡tica tiene actividades asociadas
 */
router.delete('/tematicas/:tematicaId', controller.eliminarTematica);

/**
 * @swagger
 * /api/cursos/{cursoId}/horarios:
 *   put:
 *     summary: Reemplazar el horario semanal del curso
 *     description: Se envÃ­a la lista completa. No se permiten franjas traslapadas ni choques con otros cursos del mismo docente en el mismo semestre.
 *     tags: [Organizacion]
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
 *             required: [docenteId, horarios]
 *             properties:
 *               docenteId: { type: integer }
 *               horarios:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     diaSemana: { type: integer, description: "1 = lunes ... 7 = domingo" }
 *                     horaInicio: { type: string, example: "08:00" }
 *                     horaFin: { type: string, example: "10:00" }
 *                     salon: { type: string }
 *     responses:
 *       200:
 *         description: Horario actualizado
 *       409:
 *         description: Choque de horario con otro curso del docente
 */
router.put('/horarios', controller.actualizarHorarios);

module.exports = router;
