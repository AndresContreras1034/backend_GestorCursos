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
           a.corte_id AS corteId, a.tematica_id AS tematicaId, t.nombre AS tematicaNombre,
           a.puntaje_maximo AS puntajeMaximo,
           e.id AS entregaId, e.nota, e.retroalimentacion,
           e.fecha_entrega AS fechaEntrega, e.es_tardia AS esTardia,
           e.fecha_calificacion AS fechaCalificacion
    FROM entregas e
    JOIN actividades a ON a.id = e.actividad_id
    LEFT JOIN tematicas t ON t.id = a.tematica_id
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

// Actividades evaluables por corte (para mostrar "3 de 5 calificadas")
function contarEvaluablesPorCorte(cursoId) {
  return db.prepare(`
    SELECT corte_id AS corteId, COUNT(*) AS total FROM actividades
    WHERE curso_id = ? AND activo = 1 AND estado IN ('publicada', 'cerrada') AND corte_id IS NOT NULL
    GROUP BY corte_id
  `).all(cursoId);
}

function obtenerCortes(cursoId) {
  return db.prepare(`
    SELECT id, numero, fecha_inicio AS fechaInicio, fecha_fin AS fechaFin, porcentaje
    FROM cortes WHERE curso_id = ? ORDER BY numero
  `).all(cursoId);
}

module.exports = {
  tieneAccesoAlCurso, listarCalificadas, contarActividadesEvaluables,
  contarEvaluablesPorCorte, obtenerCortes,
};
