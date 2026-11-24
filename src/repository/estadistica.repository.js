const db = require('../database/connection');

const VISIBLES = "('publicada', 'cerrada')";

function actividades(cursoId) {
  return db.prepare(`
    SELECT id, titulo, fecha_limite AS fechaLimite, puntaje_maximo AS puntajeMaximo
    FROM actividades
    WHERE curso_id = ? AND activo = 1 AND estado IN ${VISIBLES}
    ORDER BY fecha_limite, id
  `).all(cursoId);
}

function entregas(cursoId) {
  return db.prepare(`
    SELECT e.actividad_id AS actividadId, e.estudiante_id AS estudianteId, e.estado,
           e.nota, e.es_tardia AS esTardia, a.puntaje_maximo AS puntajeMaximo
    FROM entregas e
    JOIN actividades a ON a.id = e.actividad_id
    WHERE a.curso_id = ? AND a.activo = 1 AND a.estado IN ${VISIBLES}
  `).all(cursoId);
}

function estudiantes(cursoId) {
  return db.prepare(`
    SELECT u.id AS estudianteId, u.nombre, u.apellido, u.email
    FROM inscripciones ins
    JOIN usuarios u ON u.id = ins.estudiante_id
    WHERE ins.curso_id = ? AND ins.estado = 'activa'
    ORDER BY u.apellido, u.nombre
  `).all(cursoId);
}

module.exports = { actividades, entregas, estudiantes };
