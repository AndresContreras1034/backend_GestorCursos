const db = require('../database/connection');

// ---------------- Cortes ----------------
function obtenerCortes(cursoId) {
  return db.prepare(`
    SELECT id, curso_id AS cursoId, numero, fecha_inicio AS fechaInicio,
           fecha_fin AS fechaFin, porcentaje
    FROM cortes WHERE curso_id = ? ORDER BY numero
  `).all(cursoId);
}

// Sin transacción propia: se puede componer dentro de otra
function insertarCortes(cursoId, cortes) {
  const stmt = db.prepare(`
    INSERT INTO cortes (curso_id, numero, fecha_inicio, fecha_fin, porcentaje)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (curso_id, numero) DO UPDATE SET
      fecha_inicio = excluded.fecha_inicio,
      fecha_fin = excluded.fecha_fin,
      porcentaje = excluded.porcentaje,
      fecha_actualizacion = CURRENT_TIMESTAMP
  `);
  for (const c of cortes) {
    stmt.run(cursoId, c.numero, c.fechaInicio, c.fechaFin, c.porcentaje);
  }
}

const guardarCortes = db.transaction((cursoId, cortes) => insertarCortes(cursoId, cortes));

function actividadesConCorte(cursoId) {
  return db.prepare(`
    SELECT id, titulo, corte_id AS corteId, fecha_limite AS fechaLimite
    FROM actividades
    WHERE curso_id = ? AND activo = 1 AND corte_id IS NOT NULL
  `).all(cursoId);
}

// ---------------- Temáticas ----------------
function mapearTematica(fila) {
  if (!fila) return undefined;
  const cortes = db.prepare(`
    SELECT c.numero FROM corte_tematicas ct
    JOIN cortes c ON c.id = ct.corte_id
    WHERE ct.tematica_id = ? ORDER BY c.numero
  `).all(fila.id).map((r) => r.numero);
  return { ...fila, cortes };
}

function obtenerTematica(id) {
  return mapearTematica(db.prepare(`
    SELECT id, curso_id AS cursoId, nombre, descripcion FROM tematicas WHERE id = ?
  `).get(id));
}

function listarTematicas(cursoId) {
  return db.prepare(`
    SELECT id, curso_id AS cursoId, nombre, descripcion
    FROM tematicas WHERE curso_id = ? ORDER BY nombre COLLATE NOCASE
  `).all(cursoId).map(mapearTematica);
}

function listarTematicasDeCorte(corteId) {
  return db.prepare(`
    SELECT t.id, t.nombre, t.descripcion
    FROM corte_tematicas ct JOIN tematicas t ON t.id = ct.tematica_id
    WHERE ct.corte_id = ? ORDER BY ct.orden, t.id
  `).all(corteId);
}

function buscarTematicaPorNombre(cursoId, nombre) {
  return db.prepare(`
    SELECT id FROM tematicas WHERE curso_id = ? AND nombre = ? COLLATE NOCASE
  `).get(cursoId, nombre);
}

function vincularCortes(tematicaId, corteIds) {
  const stmt = db.prepare(`
    INSERT INTO corte_tematicas (corte_id, tematica_id, orden)
    VALUES (?, ?, (SELECT COUNT(*) FROM corte_tematicas WHERE corte_id = ?))
  `);
  for (const corteId of corteIds) stmt.run(corteId, tematicaId, corteId);
}

// Sin transacción propia: se puede componer dentro de otra
function insertarTematica(cursoId, { nombre, descripcion }, corteIds) {
  const r = db.prepare(`
    INSERT INTO tematicas (curso_id, nombre, descripcion) VALUES (?, ?, ?)
  `).run(cursoId, nombre, descripcion ?? null);
  vincularCortes(r.lastInsertRowid, corteIds);
  return Number(r.lastInsertRowid);
}

const actualizarTematica = db.transaction((id, campos, corteIds) => {
  if (campos.nombre !== undefined) {
    db.prepare('UPDATE tematicas SET nombre = ? WHERE id = ?').run(campos.nombre, id);
  }
  if (campos.descripcion !== undefined) {
    db.prepare('UPDATE tematicas SET descripcion = ? WHERE id = ?').run(campos.descripcion, id);
  }
  if (corteIds !== undefined) {
    db.prepare('DELETE FROM corte_tematicas WHERE tematica_id = ?').run(id);
    vincularCortes(id, corteIds);
  }
});

function eliminarTematica(id) {
  db.prepare('DELETE FROM tematicas WHERE id = ?').run(id);
}

function tematicaEnCorte(corteId, tematicaId) {
  return Boolean(db.prepare(`
    SELECT 1 FROM corte_tematicas WHERE corte_id = ? AND tematica_id = ?
  `).get(corteId, tematicaId));
}

// corteIds opcional: si no viene, cuenta en todos los cortes
function contarActividadesDeTematica(tematicaId, corteIds) {
  if (corteIds && corteIds.length === 0) return 0;
  const filtro = corteIds ? `AND corte_id IN (${corteIds.map(() => '?').join(',')})` : '';
  return db.prepare(`
    SELECT COUNT(*) AS total FROM actividades
    WHERE tematica_id = ? AND activo = 1 ${filtro}
  `).get(tematicaId, ...(corteIds || [])).total;
}

function idsDeCortesDeTematica(tematicaId) {
  return db.prepare('SELECT corte_id AS id FROM corte_tematicas WHERE tematica_id = ?')
    .all(tematicaId).map((r) => r.id);
}

// ---------------- Horarios ----------------
function listarHorarios(cursoId) {
  return db.prepare(`
    SELECT id, dia_semana AS diaSemana, hora_inicio AS horaInicio,
           hora_fin AS horaFin, salon
    FROM horarios_curso WHERE curso_id = ? ORDER BY dia_semana, hora_inicio
  `).all(cursoId);
}

function insertarHorarios(cursoId, horarios) {
  const stmt = db.prepare(`
    INSERT INTO horarios_curso (curso_id, dia_semana, hora_inicio, hora_fin, salon)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const h of horarios) {
    stmt.run(cursoId, h.diaSemana, h.horaInicio, h.horaFin, h.salon ?? null);
  }
}

const reemplazarHorarios = db.transaction((cursoId, horarios) => {
  db.prepare('DELETE FROM horarios_curso WHERE curso_id = ?').run(cursoId);
  insertarHorarios(cursoId, horarios);
});

function horariosDeOtrosCursos(docenteId, semestre, excluirCursoId) {
  return db.prepare(`
    SELECT h.dia_semana AS diaSemana, h.hora_inicio AS horaInicio,
           h.hora_fin AS horaFin, c.nombre AS cursoNombre
    FROM horarios_curso h JOIN cursos c ON c.id = h.curso_id
    WHERE c.docente_id = ? AND c.semestre = ? AND c.activo = 1
      AND c.estado != 'finalizado' AND c.id != ?
  `).all(docenteId, semestre, excluirCursoId ?? -1);
}

module.exports = {
  obtenerCortes, insertarCortes, guardarCortes, actividadesConCorte,
  obtenerTematica, listarTematicas, listarTematicasDeCorte, buscarTematicaPorNombre,
  insertarTematica, actualizarTematica, eliminarTematica, tematicaEnCorte,
  contarActividadesDeTematica, idsDeCortesDeTematica,
  listarHorarios, insertarHorarios, reemplazarHorarios, horariosDeOtrosCursos,
};
