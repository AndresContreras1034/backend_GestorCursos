const db = require('../database/connection');

function crear({ estudianteId, cursoId }) {
  const stmt = db.prepare(`
    INSERT INTO inscripciones (estudiante_id, curso_id)
    VALUES (?, ?)
  `);
  const resultado = stmt.run(estudianteId, cursoId);
  return buscarPorId(resultado.lastInsertRowid);
}

function buscarPorId(id) {
  const stmt = db.prepare('SELECT * FROM inscripciones WHERE id = ?');
  return stmt.get(id);
}

function buscarPorEstudianteYCurso(estudianteId, cursoId) {
  const stmt = db.prepare(`
    SELECT * FROM inscripciones WHERE estudiante_id = ? AND curso_id = ? AND estado = 'activa'
  `);
  return stmt.get(estudianteId, cursoId);
}

function listarPorEstudiante(estudianteId) {
  const stmt = db.prepare(`
    SELECT i.id, i.curso_id AS cursoId, c.nombre, c.descripcion, c.imagen_curso AS imagenCurso,
           i.fecha_inscripcion AS fechaInscripcion, i.estado
    FROM inscripciones i
    JOIN cursos c ON i.curso_id = c.id
    WHERE i.estudiante_id = ? AND i.estado = 'activa'
  `);
  return stmt.all(estudianteId);
}

module.exports = { crear, buscarPorId, buscarPorEstudianteYCurso, listarPorEstudiante };