const db = require('../database/connection');

function crear({
  cursoId,
  nombre,
  descripcion,
  enlace,
  archivo,
  archivoNombre,
  archivoTipo
}) {
  const stmt = db.prepare(`
    INSERT INTO recursos (
      curso_id,
      nombre,
      descripcion,
      enlace,
      archivo,
      archivo_nombre,
      archivo_tipo
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const resultado = stmt.run(
    cursoId,
    nombre,
    descripcion,
    enlace || null,
    archivo || null,
    archivoNombre || null,
    archivoTipo || null
  );

  return buscarPorId(resultado.lastInsertRowid);
}

function buscarPorId(id) {
  const stmt = db.prepare('SELECT * FROM recursos WHERE id = ?');
  return stmt.get(id);
}

function listarPorCurso(cursoId) {
  const stmt = db.prepare(`
    SELECT
      id,
      curso_id AS cursoId,
      nombre,
      descripcion,
      enlace,
      archivo,
      archivo_nombre AS archivoNombre,
      archivo_tipo AS archivoTipo,
      fecha_creacion AS fechaCreacion
    FROM recursos
    WHERE curso_id = ? AND activo = 1
    ORDER BY fecha_creacion DESC
  `);

  return stmt.all(cursoId);
}

const COLUMNAS_ACTUALIZABLES = {
  nombre: 'nombre',
  descripcion: 'descripcion',
  enlace: 'enlace',
  archivo: 'archivo',
  archivoNombre: 'archivo_nombre',
  archivoTipo: 'archivo_tipo',
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
    UPDATE recursos
    SET ${campos.join(', ')}
    WHERE id = ?
  `);
  stmt.run(...valores, id);

  return buscarPorId(id);
}

function eliminar(id) {
  const stmt = db.prepare(`
    UPDATE recursos
    SET activo = 0, fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(id);

  return buscarPorId(id);
}

module.exports = {
  crear,
  buscarPorId,
  listarPorCurso,
  actualizar,
  eliminar,
};