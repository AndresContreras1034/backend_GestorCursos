const db = require('../database/connection');

function crear({ estudianteId, cursoId, ofertaId = null }) {
  const stmt = db.prepare(`
    INSERT INTO inscripciones (estudiante_id, curso_id, oferta_id)
    VALUES (?, ?, ?)
  `);
  const resultado = stmt.run(estudianteId, cursoId, ofertaId);
  return buscarPorId(resultado.lastInsertRowid);
}

function buscarPorId(id) {
  const stmt = db.prepare('SELECT * FROM inscripciones WHERE id = ?');
  return stmt.get(id);
}

function buscarPorEstudianteYCurso(estudianteId, cursoId) {
  const stmt = db.prepare(`
    SELECT * FROM inscripciones WHERE estudiante_id = ? AND curso_id = ?
  `);
  return stmt.get(estudianteId, cursoId);
}

function reactivar(id, ofertaId = null) {
  db.prepare(`
    UPDATE inscripciones
    SET estado = 'activa', oferta_id = ?, fecha_inscripcion = CURRENT_TIMESTAMP
    WHERE id = ? AND estado = 'retirada'
  `).run(ofertaId, id);
  return buscarPorId(id);
}

function retirar(id) {
  db.prepare(`
    UPDATE inscripciones
    SET estado = 'retirada'
    WHERE id = ? AND estado = 'activa'
  `).run(id);
  return buscarPorId(id);
}

function contarActivasPorOferta(ofertaId) {
  return db.prepare(`
    SELECT COUNT(*) AS total
    FROM inscripciones
    WHERE oferta_id = ? AND estado = 'activa'
  `).get(ofertaId).total;
}

function crearConCupo({ estudianteId, cursoId, ofertaId, cupos }) {
  const inscribir = db.transaction(() => {
    const existente = buscarPorEstudianteYCurso(estudianteId, cursoId);
    if (existente?.estado === 'activa') {
      throw new Error('El estudiante ya está inscrito en este curso');
    }
    if (existente?.estado === 'completada') {
      throw new Error('El estudiante ya completó este curso');
    }
    if (contarActivasPorOferta(ofertaId) >= cupos) {
      throw new Error('La oferta no tiene cupos disponibles');
    }
    if (existente) {
      return reactivar(existente.id, ofertaId);
    }
    return crear({ estudianteId, cursoId, ofertaId });
  });
  return inscribir();
}

function listarPorEstudiante(estudianteId) {
  const stmt = db.prepare(`
    SELECT i.id, i.curso_id AS cursoId, c.nombre, c.descripcion, c.imagen_curso AS imagenCurso,
           i.oferta_id AS ofertaId, i.fecha_inscripcion AS fechaInscripcion, i.estado
    FROM inscripciones i
    JOIN cursos c ON i.curso_id = c.id
    WHERE i.estudiante_id = ? AND i.estado = 'activa'
  `);
  return stmt.all(estudianteId);
}

module.exports = {
  crear,
  buscarPorId,
  buscarPorEstudianteYCurso,
  reactivar,
  retirar,
  contarActivasPorOferta,
  crearConCupo,
  listarPorEstudiante,
};