const db = require('../database/connection');

function obtenerDetalle(id) {
  return db.prepare(`
    SELECT c.id, c.nombre, c.descripcion, c.docente_id AS docenteId,
           c.imagen_curso AS imagenCurso, c.fecha_creacion AS fechaCreacion,
           c.fecha_actualizacion AS fechaActualizacion, c.activo,
           c.modalidad, c.semestre, c.codigo, c.estado,
           c.ubicacion_nombre AS ubicacionNombre, c.latitud, c.longitud,
           c.enlace_virtual AS enlaceVirtual, c.nota_minima AS notaMinima,
           c.cupo_maximo AS cupoMaximo,
           u.nombre AS docenteNombre, u.apellido AS docenteApellido,
           (SELECT COUNT(*) FROM inscripciones i
             WHERE i.curso_id = c.id AND (i.estado = 'activa' OR (c.estado = 'finalizado' AND i.estado = 'completada'))) AS totalEstudiantes,
           (SELECT COUNT(*) FROM actividades a
             WHERE a.curso_id = c.id AND a.activo = 1) AS totalActividades,
           (SELECT COUNT(*) FROM lista_espera le
             WHERE le.curso_id = c.id AND le.estado = 'esperando') AS totalListaEspera
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
