const db = require('../database/connection');

const CAMPOS = `
  a.id, a.curso_id AS cursoId, a.cronograma_id AS cronogramaId,
  a.creador_id AS creadorId, a.titulo, a.instrucciones,
  a.fecha_limite AS fechaLimite, a.puntaje_maximo AS puntajeMaximo,
  a.permite_entrega_tardia AS permiteEntregaTardia,
  a.permite_reemplazo_entrega AS permiteReemplazoEntrega,
  a.corte_id AS corteId, a.tematica_id AS tematicaId,
  a.estado, a.fecha_creacion AS fechaCreacion
`;

function crear(d) {
  const resultado = db.prepare(`
    INSERT INTO actividades
      (curso_id, cronograma_id, creador_id, titulo, instrucciones,
       fecha_limite, puntaje_maximo, permite_entrega_tardia,
       permite_reemplazo_entrega, estado, corte_id, tematica_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    d.cursoId,
    d.cronogramaId ?? null,
    d.creadorId,
    d.titulo,
    d.instrucciones,
    d.fechaLimite,
    d.puntajeMaximo,
    d.permiteEntregaTardia ? 1 : 0,
    d.permiteReemplazoEntrega ? 1 : 0,
    d.estado,
    d.corteId ?? null,
    d.tematicaId ?? null
  );
  return buscarPorId(resultado.lastInsertRowid);
}

function buscarPorId(id) {
  return db.prepare(`SELECT ${CAMPOS} FROM actividades a WHERE a.id = ? AND a.activo = 1`).get(id);
}

// Vista del docente: todo, con conteo de entregas
function listarParaDocente(cursoId) {
  return db.prepare(`
    SELECT ${CAMPOS},
           (SELECT COUNT(*) FROM entregas e WHERE e.actividad_id = a.id) AS totalEntregas
    FROM actividades a
    WHERE a.curso_id = ? AND a.activo = 1
    ORDER BY a.fecha_limite ASC, a.id ASC
  `).all(cursoId);
}

// Vista del estudiante: sin borradores, con su entrega (si existe)
function listarParaEstudiante(cursoId, estudianteId) {
  return db.prepare(`
    SELECT ${CAMPOS},
           e.id AS entregaId,
           e.fecha_entrega AS fechaEntrega,
           e.es_tardia AS entregaTardia,
           e.estado AS estadoEntrega,
           e.nota AS nota
    FROM actividades a
    LEFT JOIN entregas e ON e.actividad_id = a.id AND e.estudiante_id = ?
    WHERE a.curso_id = ? AND a.activo = 1 AND a.estado IN ('publicada', 'cerrada')
    ORDER BY a.fecha_limite ASC, a.id ASC
  `).all(estudianteId, cursoId);
}

function actualizarConfigEntrega(id, { permiteEntregaTardia, permiteReemplazoEntrega }) {
  db.prepare(`
    UPDATE actividades
    SET permite_entrega_tardia = COALESCE(?, permite_entrega_tardia),
        permite_reemplazo_entrega = COALESCE(?, permite_reemplazo_entrega),
        fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    permiteEntregaTardia === undefined ? null : (permiteEntregaTardia ? 1 : 0),
    permiteReemplazoEntrega === undefined ? null : (permiteReemplazoEntrega ? 1 : 0),
    id
  );
  return buscarPorId(id);
}

module.exports = { crear, buscarPorId, listarParaDocente, listarParaEstudiante, actualizarConfigEntrega };