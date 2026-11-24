const db = require('../database/connection');

function crear({ cursoId, titulo, descripcion, fechaLimite, puntajeMaximo }) {
  const resultado = db.prepare(`
    INSERT INTO evaluaciones (curso_id, titulo, descripcion, fecha_limite, puntaje_maximo)
    VALUES (?, ?, ?, ?, ?)
  `).run(cursoId, titulo, descripcion ?? null, fechaLimite ?? null, puntajeMaximo);
  return buscarPorId(resultado.lastInsertRowid);
}

function buscarPorId(id) {
  return db.prepare('SELECT * FROM evaluaciones WHERE id = ?').get(id);
}

function listarPorCurso(cursoId) {
  return db.prepare(`
    SELECT id, curso_id AS cursoId, titulo, descripcion,
           fecha_limite AS fechaLimite, puntaje_maximo AS puntajeMaximo
    FROM evaluaciones
    WHERE curso_id = ? AND activo = 1
    ORDER BY fecha_limite ASC, id ASC
  `).all(cursoId);
}

const COLUMNAS_ACTUALIZABLES = {
  titulo: 'titulo',
  descripcion: 'descripcion',
  fechaLimite: 'fecha_limite',
  puntajeMaximo: 'puntaje_maximo',
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
    UPDATE evaluaciones
    SET ${campos.join(', ')}
    WHERE id = ?
  `).run(...valores, id);
  return buscarPorId(id);
}

function eliminar(id) {
  db.prepare(`
    UPDATE evaluaciones
    SET activo = 0, fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id);
}

module.exports = { crear, buscarPorId, listarPorCurso, actualizar, eliminar };
