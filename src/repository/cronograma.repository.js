const db = require('../database/connection');

function crear({ cursoId, titulo, descripcion, fechaInicio, fechaFin, orden }) {
  const stmt = db.prepare(`
    INSERT INTO cronograma (curso_id, titulo, descripcion, fecha_inicio, fecha_fin, orden)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const resultado = stmt.run(
    cursoId,
    titulo,
    descripcion ?? null,
    fechaInicio ?? null,
    fechaFin ?? null,
    orden ?? 0
  );

  return buscarPorId(resultado.lastInsertRowid);
}

function buscarPorId(id) {
  const stmt = db.prepare('SELECT * FROM cronograma WHERE id = ?');
  return stmt.get(id);
}

function listarPorCurso(cursoId) {
  const stmt = db.prepare(`
    SELECT id, curso_id AS cursoId, titulo, descripcion,
           fecha_inicio AS fechaInicio, fecha_fin AS fechaFin, orden
    FROM cronograma
    WHERE curso_id = ? AND activo = 1
    ORDER BY orden ASC, fecha_inicio ASC
  `);
  return stmt.all(cursoId);
}

const COLUMNAS_ACTUALIZABLES = {
  titulo: 'titulo',
  descripcion: 'descripcion',
  fechaInicio: 'fecha_inicio',
  fechaFin: 'fecha_fin',
  orden: 'orden',
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

  const stmt = db.prepare(`
    UPDATE cronograma
    SET ${campos.join(', ')}
    WHERE id = ?
  `);
  stmt.run(...valores, id);

  return buscarPorId(id);
}

function eliminar(id) {
  const stmt = db.prepare(`
    UPDATE cronograma
    SET activo = 0, fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(id);
}

module.exports = { crear, buscarPorId, listarPorCurso, actualizar, eliminar };