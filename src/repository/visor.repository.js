const db = require('../database/connection');

function buscarRecursoConArchivo(id) {
  return db.prepare(`
    SELECT r.id, r.curso_id AS cursoId, r.archivo, r.archivo_nombre AS nombre,
           r.archivo_tipo AS tipo, r.activo, c.docente_id AS docenteId
    FROM recursos r
    JOIN cursos c ON c.id = r.curso_id
    WHERE r.id = ?
  `).get(id);
}

module.exports = { buscarRecursoConArchivo };