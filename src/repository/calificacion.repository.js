const db = require('../database/connection');

function tieneAccesoAlCurso(estudianteId, cursoId) {
  return Boolean(db.prepare(`
    SELECT 1 FROM inscripciones
    WHERE estudiante_id = ? AND curso_id = ? AND estado IN ('activa', 'completada')
  `).get(estudianteId, cursoId));
}

function listarCalificadas(cursoId, estudianteId) {
  return db.prepare(`
    SELECT a.id AS actividadId, a.titulo, a.cronograma_id AS cronogramaId,
           a.puntaje_maximo AS puntajeMaximo,
           e.id AS entregaId, e.nota, e.retroalimentacion,
           e.fecha_entrega AS fechaEntrega, e.es_tardia AS esTardia,
           e.fecha_calificacion AS fechaCalificacion
    FROM entregas e
    JOIN actividades a ON a.id = e.actividad_id
    WHERE a.curso_id = ? AND a.activo = 1
      AND e.estudiante_id = ? AND e.estado = 'calificada'
    ORDER BY e.fecha_calificacion DESC, e.id DESC
  `).all(cursoId, estudianteId);
}

function contarActividadesEvaluables(cursoId) {
  return db.prepare(`
    SELECT COUNT(*) AS total FROM actividades
    WHERE curso_id = ? AND activo = 1 AND estado IN ('publicada', 'cerrada')
  `).get(cursoId).total;
}

module.exports = { tieneAccesoAlCurso, listarCalificadas, contarActividadesEvaluables };
