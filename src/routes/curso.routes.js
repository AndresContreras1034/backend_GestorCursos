const express = require('express');
const router = express.Router();
const cursoController = require('../controllers/curso.controller');

/**
 * @swagger
 * /api/cursos:
 *   post:
 *     summary: Crear un curso con su organización completa (cortes, temáticas, horario, ubicación)
 *     description: |
 *       Los 3 cortes son obligatorios, sus porcentajes deben sumar 100 y sus fechas no se traslapan.
 *       Si la modalidad es presencial o híbrida, `ubicacion` (nombre, latitud, longitud) es obligatoria.
 *       El curso nace en `borrador` (solo lo ve su docente) salvo que se envíe estado `abierto`.
 *     tags: [Curso]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, descripcion, docenteId, modalidad, semestre, cortes]
 *             properties:
 *               nombre: { type: string }
 *               descripcion: { type: string }
 *               docenteId: { type: integer }
 *               imagenCurso: { type: string, description: Data URI base64 }
 *               modalidad: { type: string, enum: [virtual, presencial, hibrida] }
 *               semestre: { type: string, example: "2026-2" }
 *               codigo: { type: string, example: "MAT-101" }
 *               estado: { type: string, enum: [borrador, abierto] }
 *               notaMinima: { type: number, example: 3.0 }
 *               cupoMaximo: { type: integer, example: 30 }
 *               enlaceVirtual: { type: string, example: "https://meet.google.com/abc" }
 *               ubicacion:
 *                 type: object
 *                 properties:
 *                   nombre: { type: string, example: "Edificio B, salón 204" }
 *                   latitud: { type: number, example: 4.6382 }
 *                   longitud: { type: number, example: -74.0840 }
 *               cortes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     numero: { type: integer, minimum: 1, maximum: 3 }
 *                     fechaInicio: { type: string, example: "2026-08-03" }
 *                     fechaFin: { type: string, example: "2026-09-18" }
 *                     porcentaje: { type: number, example: 30 }
 *               horarios:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     diaSemana: { type: integer, description: "1 = lunes ... 7 = domingo" }
 *                     horaInicio: { type: string, example: "08:00" }
 *                     horaFin: { type: string, example: "10:00" }
 *                     salon: { type: string }
 *               tematicas:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     nombre: { type: string }
 *                     descripcion: { type: string }
 *                     cortes: { type: array, items: { type: integer }, example: [1, 2] }
 *     responses:
 *       201:
 *         description: Curso creado (detalle completo con organización)
 *       400:
 *         description: Error de validación
 *       409:
 *         description: Código repetido o choque de horario con otro curso del docente
 */
router.post('/', cursoController.crearCurso);

/**
 * @swagger
 * /api/cursos:
 *   get:
 *     summary: Consultar cursos disponibles, con filtros opcionales
 *     description: Sin docenteId no se incluyen los cursos en borrador. Con docenteId se devuelven todos los cursos de ese docente.
 *     tags: [Curso]
 *     parameters:
 *       - in: query
 *         name: busqueda
 *         schema: { type: string }
 *         description: Filtra por nombre, descripción, código o nombre del docente
 *       - in: query
 *         name: docenteId
 *         schema: { type: integer }
 *       - in: query
 *         name: estado
 *         schema: { type: string, enum: [borrador, abierto, en_curso, finalizado] }
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
 *     description: Cualquier subconjunto de campos. Los cortes, temáticas y horarios se editan en sus propios endpoints.
 *     tags: [Curso]
 *     parameters:
 *       - in: path
 *         name: id
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
 *               descripcion: { type: string }
 *               imagenCurso: { type: string }
 *               modalidad: { type: string, enum: [virtual, presencial, hibrida] }
 *               semestre: { type: string }
 *               codigo: { type: string, nullable: true }
 *               notaMinima: { type: number }
 *               cupoMaximo: { type: integer, nullable: true }
 *               enlaceVirtual: { type: string, nullable: true }
 *               ubicacion:
 *                 type: object
 *                 properties:
 *                   nombre: { type: string }
 *                   latitud: { type: number }
 *                   longitud: { type: number }
 *     responses:
 *       200:
 *         description: Curso actualizado
 *       400:
 *         description: Error de validación
 *       403:
 *         description: El docente no es dueño del curso
 *       404:
 *         description: Curso no encontrado
 *       409:
 *         description: Curso finalizado o cupo menor a los inscritos
 */
router.put('/:id', cursoController.actualizarCurso);

/**
 * @swagger
 * /api/cursos/{id}/estado:
 *   patch:
 *     summary: Cambiar el estado del curso
 *     description: "Flujo permitido: borrador → abierto → en_curso → finalizado (abierto también puede pasar a finalizado). Al finalizar, las inscripciones activas pasan a completadas, se cancela la lista de espera y se cierran las actividades."
 *     tags: [Curso]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [docenteId, estado]
 *             properties:
 *               docenteId: { type: integer }
 *               estado: { type: string, enum: [abierto, en_curso, finalizado] }
 *     responses:
 *       200:
 *         description: Curso con el nuevo estado
 *       403:
 *         description: El docente no es dueño del curso
 *       409:
 *         description: Transición no permitida
 */
router.patch('/:id/estado', cursoController.cambiarEstado);

module.exports = router;
