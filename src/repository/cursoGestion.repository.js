const db = require('../database/connection');

function obtenerDetalle(id) {
  return db.prepare(`
    SELECT c.id, c.nombre, c.descripcion, c.docente_id AS docenteId,
           c.imagen_curso AS imagenCurso, c.fecha_creacion AS fechaCreacion,
           c.fecha_actualizacion AS fechaActualizacion, c.activo,
           u.nombre AS docenteNombre, u.apellido AS docenteApellido,
           (SELECT COUNT(*) FROM inscripciones i
             WHERE i.curso_id = c.id AND i.estado = 'activa') AS totalEstudiantes,
           (SELECT COUNT(*) FROM actividades a
             WHERE a.curso_id = c.id AND a.activo = 1) AS totalActividades
    FROM cursos c
    JOIN usuarios u ON u.id = c.docente_id
    WHERE c.id = ?
  `).get(id);
}

function desactivar(id) {
  db.prepare(`
    UPDATE cursos SET activo = 0, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?
  `).run(id);
}

module.exports = { obtenerDetalle, desactivar };
