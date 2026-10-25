const db = require('../database/connection');

const COLUMNAS = {
  titulo: 'titulo',
  instrucciones: 'instrucciones',
  fechaLimite: 'fecha_limite',
  puntajeMaximo: 'puntaje_maximo',
  cronogramaId: 'cronograma_id',
  estado: 'estado',
  permiteEntregaTardia: 'permite_entrega_tardia',
  permiteReemplazoEntrega: 'permite_reemplazo_entrega',
};

function buscarPorId(id) {
  return db.prepare(`
    SELECT id, curso_id AS cursoId, cronograma_id AS cronogramaId, creador_id AS creadorId,
           titulo, instrucciones, fecha_limite AS fechaLimite, puntaje_maximo AS puntajeMaximo,
           permite_entrega_tardia AS permiteEntregaTardia,
           permite_reemplazo_entrega AS permiteReemplazoEntrega,
           estado, fecha_creacion AS fechaCreacion,
           fecha_actualizacion AS fechaActualizacion, activo
    FROM actividades WHERE id = ?
  `).get(id);
}

function contarCalificadas(actividadId) {
  return db.prepare(`
    SELECT COUNT(*) AS total FROM entregas WHERE actividad_id = ? AND estado = 'calificada'
  `).get(actividadId).total;
}

function actualizar(id, campos) {
  const sets = [];
  const valores = [];
  for (const [campoJs, columna] of Object.entries(COLUMNAS)) {
    if (campos[campoJs] !== undefined) {
      sets.push(`${columna} = ?`);
      valores.push(campos[campoJs]);
    }
  }
  sets.push('fecha_actualizacion = CURRENT_TIMESTAMP');
  db.prepare(`UPDATE actividades SET ${sets.join(', ')} WHERE id = ?`).run(...valores, id);
  return buscarPorId(id);
}

function desactivar(id) {
  db.prepare(`
    UPDATE actividades
    SET activo = 0, estado = 'cerrada', fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id);
}

module.exports = { buscarPorId, contarCalificadas, actualizar, desactivar };
