const db = require('../database/connection');

function tieneAccesoAlCurso(estudianteId, cursoId) {
  return Boolean(db.prepare(`
    SELECT 1 FROM inscripciones
    WHERE estudiante_id = ? AND curso_id = ? AND estado IN ('activa', 'completada')
  `).get(estudianteId, cursoId));
}

function listarCalificadas(cursoId, estudianteId) {
  return db.prepare(`
    SELECT * FROM (
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

      UNION ALL

      SELECT NULL AS actividadId, f.titulo, NULL AS cronogramaId,
             fa.corte_id AS corteId, NULL AS tematicaId, NULL AS tematicaNombre,
             fa.puntaje_maximo AS puntajeMaximo,
             fe.id AS entregaId, fe.nota, NULL AS retroalimentacion,
             fe.fecha_envio AS fechaEntrega, 0 AS esTardia,
             fe.fecha_envio AS fechaCalificacion
      FROM formulario_envios fe
      JOIN formulario_asignaciones fa ON fa.id = fe.asignacion_id
      JOIN formularios f ON f.id = fa.formulario_id
      WHERE fa.curso_id = ? AND fa.activo = 1 AND fa.resultados_publicados = 1
        AND fa.corte_id IS NOT NULL AND fa.actividad_id IS NULL
        AND fe.estudiante_id = ?
    )
    ORDER BY fechaCalificacion DESC, entregaId DESC
  `).all(cursoId, estudianteId, cursoId, estudianteId);
}

function contarActividadesEvaluables(cursoId) {
  return db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM actividades
       WHERE curso_id = ? AND activo = 1 AND estado IN ('publicada', 'cerrada'))
      +
      (SELECT COUNT(*) FROM formulario_asignaciones
       WHERE curso_id = ? AND activo = 1 AND resultados_publicados = 1
         AND corte_id IS NOT NULL AND actividad_id IS NULL) AS total
  `).get(cursoId, cursoId).total;
}

function contarEvaluablesPorCorte(cursoId) {
  const actividades = db.prepare(`
    SELECT corte_id AS corteId, COUNT(*) AS total FROM actividades
    WHERE curso_id = ? AND activo = 1 AND estado IN ('publicada', 'cerrada')
      AND corte_id IS NOT NULL
    GROUP BY corte_id
  `).all(cursoId);
  const examenes = db.prepare(`
    SELECT corte_id AS corteId, COUNT(*) AS total FROM formulario_asignaciones
    WHERE curso_id = ? AND activo = 1 AND resultados_publicados = 1
      AND corte_id IS NOT NULL AND actividad_id IS NULL
    GROUP BY corte_id
  `).all(cursoId);
  const totales = new Map();
  for (const { corteId, total } of [...actividades, ...examenes]) {
    totales.set(corteId, (totales.get(corteId) ?? 0) + total);
  }
  return [...totales].map(([corteId, total]) => ({ corteId, total }));
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
