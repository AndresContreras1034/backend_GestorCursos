const db = require('../database/connection');

// Nunca se selecciona la columna "archivo" (base64 pesado)
const CAMPOS = `
  e.id, e.actividad_id AS actividadId, e.estudiante_id AS estudianteId,
  e.comentario, e.archivo_nombre AS archivoNombre, e.archivo_tipo AS archivoTipo,
  e.archivo_tamano AS archivoTamano, e.fecha_entrega AS fechaEntrega,
  e.es_tardia AS esTardia, e.estado, e.nota, e.retroalimentacion,
  e.fecha_calificacion AS fechaCalificacion
`;

function buscarPorId(id) {
  return db.prepare(`SELECT ${CAMPOS} FROM entregas e WHERE e.id = ?`).get(id);
}

function buscarPorActividadYEstudiante(actividadId, estudianteId) {
  return db
    .prepare(`SELECT ${CAMPOS} FROM entregas e WHERE e.actividad_id = ? AND e.estudiante_id = ?`)
    .get(actividadId, estudianteId);
}

function crear(d) {
  const r = db.prepare(`
    INSERT INTO entregas
    (actividad_id, estudiante_id, comentario, archivo, archivo_nombre,
    archivo_tipo, archivo_tamano, fecha_entrega, es_tardia)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    d.actividadId,
    d.estudianteId,
    d.comentario,
    d.archivo,
    d.archivoNombre,
    d.archivoTipo,
    d.archivoTamano,
    d.fechaEntrega,
    d.esTardia ? 1 : 0
  );
  return buscarPorId(r.lastInsertRowid);
}

function reemplazar(id, d) {
  db.prepare(`
    UPDATE entregas
    SET comentario = ?, archivo = ?, archivo_nombre = ?, archivo_tipo = ?,
    archivo_tamano = ?, fecha_entrega = ?, es_tardia = ?
    WHERE id = ?
  `).run(
    d.comentario,
    d.archivo,
    d.archivoNombre,
    d.archivoTipo,
    d.archivoTamano,
    d.fechaEntrega,
    d.esTardia ? 1 : 0,
    id
  );
  return buscarPorId(id);
}

function listarEstudiantesConEntrega(cursoId, actividadId) {
  return db.prepare(`
    SELECT u.id AS estudianteId, u.nombre, u.apellido, u.email,
           e.id AS entregaId, e.fecha_entrega AS fechaEntrega, e.es_tardia AS esTardia,
           e.estado, e.comentario, e.archivo_nombre AS archivoNombre,
           e.archivo_tipo AS archivoTipo, e.archivo_tamano AS archivoTamano,
           e.nota, e.retroalimentacion
    FROM inscripciones i
    JOIN usuarios u ON u.id = i.estudiante_id
    LEFT JOIN entregas e ON e.estudiante_id = u.id AND e.actividad_id = ?
    WHERE i.curso_id = ? AND i.estado = 'activa'
    ORDER BY u.apellido ASC, u.nombre ASC
  `).all(actividadId, cursoId);
}

function obtenerArchivo(entregaId) {
  return db.prepare(`
    SELECT id, actividad_id AS actividadId, estudiante_id AS estudianteId,
           archivo, archivo_nombre AS archivoNombre, archivo_tipo AS archivoTipo
    FROM entregas
    WHERE id = ?
  `).get(entregaId);
}

module.exports = {
  buscarPorId,
  buscarPorActividadYEstudiante,
  crear,
  reemplazar,
  listarEstudiantesConEntrega,
  obtenerArchivo,
};
