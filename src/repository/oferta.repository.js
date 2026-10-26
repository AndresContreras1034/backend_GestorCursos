const db = require('../database/connection');

function crear({ cursoId, cupos, fechaApertura, fechaCierre, modalidad }) {
  const resultado = db.prepare(`
    INSERT INTO ofertas (curso_id, cupos, fecha_apertura, fecha_cierre, modalidad)
    VALUES (?, ?, ?, ?, ?)
  `).run(cursoId, cupos, fechaApertura ?? null, fechaCierre ?? null, modalidad);
  return buscarPorId(resultado.lastInsertRowid);
}

function buscarPorId(id) {
  return db.prepare('SELECT * FROM ofertas WHERE id = ?').get(id);
}

function tieneOfertasPorCurso(cursoId) {
  return Boolean(db.prepare(`
    SELECT 1 FROM ofertas
    WHERE curso_id = ?
    LIMIT 1
  `).get(cursoId));
}

function listarPorCurso(cursoId) {
  return db.prepare(`
    SELECT id, curso_id AS cursoId, cupos,
           fecha_apertura AS fechaApertura, fecha_cierre AS fechaCierre, modalidad
    FROM ofertas
    WHERE curso_id = ? AND activo = 1
    ORDER BY fecha_apertura ASC, id ASC
  `).all(cursoId);
}

const COLUMNAS_ACTUALIZABLES = {
  cupos: 'cupos',
  fechaApertura: 'fecha_apertura',
  fechaCierre: 'fecha_cierre',
  modalidad: 'modalidad',
};

function actualizar(id, datos) {
  const campos = [];
  const valores = [];

  for (const [campoJs, columnaDb] of Object.entries(COLUMNAS_ACTUALIZABLES)) {
    if (datos[campoJs] !== undefined) {
      campos.push(`${columnaDb} = ?`);
      valores.push(datos[campoJs]);
    }
  }

  campos.push('fecha_actualizacion = CURRENT_TIMESTAMP');
  db.prepare(`
    UPDATE ofertas
    SET ${campos.join(', ')}
    WHERE id = ?
  `).run(...valores, id);

  return buscarPorId(id);
}

function eliminar(id) {
  db.prepare(`
    UPDATE ofertas
    SET activo = 0, fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id);
}

module.exports = {
  crear,
  buscarPorId,
  tieneOfertasPorCurso,
  listarPorCurso,
  actualizar,
  eliminar,
};
