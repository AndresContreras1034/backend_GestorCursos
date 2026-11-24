const db = require('../database/connection');
const { ErrorApp } = require('../utils/errores');

function contarActivasCurso(cursoId) {
  return db.prepare(`
    SELECT COUNT(*) AS total FROM inscripciones WHERE curso_id = ? AND estado = 'activa'
  `).get(cursoId).total;
}

function contarActivasOferta(ofertaId) {
  return db.prepare(`
    SELECT COUNT(*) AS total FROM inscripciones WHERE oferta_id = ? AND estado = 'activa'
  `).get(ofertaId).total;
}

function buscarInscripcion(estudianteId, cursoId) {
  return db.prepare(`
    SELECT * FROM inscripciones WHERE estudiante_id = ? AND curso_id = ?
  `).get(estudianteId, cursoId);
}

function buscarInscripcionPorId(id) {
  return db.prepare('SELECT * FROM inscripciones WHERE id = ?').get(id);
}

// Inscribe validando cupos dentro de una transacción.
// matriculadoPor = id del docente (NULL si fue promoción de la lista de espera).
const matricular = db.transaction(({
  estudianteId, cursoId, ofertaId = null, matriculadoPor = null, cupoCurso = null, cuposOferta = null,
}) => {
  const existente = buscarInscripcion(estudianteId, cursoId);
  if (existente?.estado === 'activa') {
    throw new ErrorApp('El estudiante ya está inscrito en este curso', 409);
  }
  if (existente?.estado === 'completada') {
    throw new ErrorApp('El estudiante ya completó este curso', 409);
  }
  if (cupoCurso !== null && contarActivasCurso(cursoId) >= cupoCurso) {
    throw new ErrorApp('El curso no tiene cupos disponibles', 409);
  }
  if (ofertaId && cuposOferta !== null && contarActivasOferta(ofertaId) >= cuposOferta) {
    throw new ErrorApp('La oferta no tiene cupos disponibles', 409);
  }

  let id;
  if (existente) {
    db.prepare(`
      UPDATE inscripciones
      SET estado = 'activa', oferta_id = ?, matriculado_por = ?, fecha_inscripcion = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(ofertaId, matriculadoPor, existente.id);
    id = existente.id;
  } else {
    id = Number(db.prepare(`
      INSERT INTO inscripciones (estudiante_id, curso_id, oferta_id, matriculado_por)
      VALUES (?, ?, ?, ?)
    `).run(estudianteId, cursoId, ofertaId, matriculadoPor).lastInsertRowid);
  }

  // Si estaba en la lista de espera, ya no
  db.prepare(`
    UPDATE lista_espera SET estado = 'promovida'
    WHERE curso_id = ? AND estudiante_id = ? AND estado = 'esperando'
  `).run(cursoId, estudianteId);

  return db.prepare('SELECT * FROM inscripciones WHERE id = ?').get(id);
});

function retirarPorDocente(inscripcionId) {
  db.prepare(`
    UPDATE inscripciones SET estado = 'retirada' WHERE id = ? AND estado = 'activa'
  `).run(inscripcionId);
  return db.prepare('SELECT * FROM inscripciones WHERE id = ?').get(inscripcionId);
}

function listarInscritos(cursoId) {
  return db.prepare(`
    SELECT i.id AS inscripcionId, u.id AS estudianteId, u.nombre, u.apellido, u.email,
           u.cedula, i.oferta_id AS ofertaId, i.fecha_inscripcion AS fechaInscripcion,
           i.matriculado_por AS matriculadoPor
    FROM inscripciones i JOIN usuarios u ON u.id = i.estudiante_id
    WHERE i.curso_id = ? AND i.estado = 'activa'
    ORDER BY u.apellido, u.nombre
  `).all(cursoId);
}

// ---------------- Lista de espera ----------------
function buscarEsperaActiva(cursoId, estudianteId) {
  return db.prepare(`
    SELECT id, oferta_id AS ofertaId FROM lista_espera
    WHERE curso_id = ? AND estudiante_id = ? AND estado = 'esperando'
  `).get(cursoId, estudianteId);
}

function agregarEspera(cursoId, estudianteId, ofertaId) {
  const r = db.prepare(`
    INSERT INTO lista_espera (curso_id, estudiante_id, oferta_id) VALUES (?, ?, ?)
  `).run(cursoId, estudianteId, ofertaId ?? null);
  return Number(r.lastInsertRowid);
}

function cancelarEspera(id) {
  db.prepare(`UPDATE lista_espera SET estado = 'cancelada' WHERE id = ? AND estado = 'esperando'`).run(id);
}

// FIFO: orden de llegada
function listarEsperaActiva(cursoId) {
  return db.prepare(`
    SELECT le.id, le.estudiante_id AS estudianteId, le.oferta_id AS ofertaId,
           le.fecha_solicitud AS fechaSolicitud, u.nombre, u.apellido, u.email
    FROM lista_espera le JOIN usuarios u ON u.id = le.estudiante_id
    WHERE le.curso_id = ? AND le.estado = 'esperando'
    ORDER BY le.id
  `).all(cursoId);
}

module.exports = {
  contarActivasCurso, contarActivasOferta, buscarInscripcion, buscarInscripcionPorId, matricular, retirarPorDocente,
  listarInscritos, buscarEsperaActiva, agregarEspera, cancelarEspera, listarEsperaActiva,
};
