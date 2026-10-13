const db = require('../database/connection');

function crear({ nombre, descripcion, docenteId, imagenCurso }) {
  const stmt = db.prepare(`
    INSERT INTO cursos (nombre, descripcion, docente_id, imagen_curso)
    VALUES (?, ?, ?, ?)
  `);
  const resultado = stmt.run(
    nombre,
    descripcion,
    docenteId,
    imagenCurso || null
  );

  return buscarPorId(resultado.lastInsertRowid);
}

function buscarPorId(id) {
  const stmt = db.prepare('SELECT * FROM cursos WHERE id = ?');
  return stmt.get(id);
}

function listarTodos(busqueda) {
  let query = `
    SELECT c.id, c.nombre, c.descripcion, c.docente_id AS docenteId, c.imagen_curso AS imagenCurso, u.nombre AS docenteNombre
    FROM cursos c
    JOIN usuarios u ON c.docente_id = u.id
    WHERE c.activo = 1
  `;
  const params = [];

  if (busqueda) {
    query += ` AND (c.nombre LIKE ? OR c.descripcion LIKE ? OR u.nombre LIKE ?)`;
    const like = `%${busqueda}%`;
    params.push(like, like, like);
  }

  const stmt = db.prepare(query);
  return stmt.all(...params);
}

const COLUMNAS_ACTUALIZABLES = {
  nombre: 'nombre',
  descripcion: 'descripcion',
  imagenCurso: 'imagen_curso',
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
    UPDATE cursos
    SET ${campos.join(', ')}
    WHERE id = ?
  `);
  stmt.run(...valores, id);

  return buscarPorId(id);
}

module.exports = { crear, buscarPorId, listarTodos, actualizar };