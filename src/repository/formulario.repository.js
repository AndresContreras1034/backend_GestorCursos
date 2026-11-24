const db = require('../database/connection');

function insertarPreguntas(formularioId, preguntas) {
  const insPregunta = db.prepare(`
    INSERT INTO formulario_preguntas (formulario_id, orden, enunciado, tipo, puntaje, explicacion)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insOpcion = db.prepare(`
    INSERT INTO formulario_opciones (pregunta_id, orden, texto, es_correcta)
    VALUES (?, ?, ?, ?)
  `);

  preguntas.forEach((pregunta, i) => {
    const preguntaId = insPregunta.run(
      formularioId,
      i + 1,
      pregunta.enunciado,
      pregunta.tipo,
      pregunta.puntaje,
      pregunta.explicacion ?? null
    ).lastInsertRowid;
    pregunta.opciones.forEach((opcion, j) => {
      insOpcion.run(preguntaId, j + 1, opcion.texto, opcion.esCorrecta ? 1 : 0);
    });
  });
}

const crear = db.transaction((datos) => {
  const id = Number(db.prepare(`
    INSERT INTO formularios (docente_id, titulo, descripcion, origen, prompt_ia)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    datos.docenteId,
    datos.titulo,
    datos.descripcion ?? null,
    datos.origen ?? 'manual',
    datos.promptIa ?? null
  ).lastInsertRowid);
  insertarPreguntas(id, datos.preguntas);
  return id;
});

const reemplazar = db.transaction((id, datos) => {
  db.prepare(`
    UPDATE formularios
    SET titulo = ?, descripcion = ?, fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(datos.titulo, datos.descripcion ?? null, id);
  if (datos.preguntas) {
    db.prepare('DELETE FROM formulario_preguntas WHERE formulario_id = ?').run(id);
    insertarPreguntas(id, datos.preguntas);
  }
});

function obtenerCompleto(id) {
  const formulario = db.prepare(`
    SELECT id, docente_id AS docenteId, titulo, descripcion, origen,
           fecha_creacion AS fechaCreacion, fecha_actualizacion AS fechaActualizacion, activo
    FROM formularios WHERE id = ?
  `).get(id);
  if (!formulario) return undefined;

  const preguntas = db.prepare(`
    SELECT id, orden, enunciado, tipo, puntaje, explicacion
    FROM formulario_preguntas WHERE formulario_id = ? ORDER BY orden
  `).all(id);
  const opciones = db.prepare(`
    SELECT o.id, o.pregunta_id AS preguntaId, o.orden, o.texto, o.es_correcta AS esCorrecta
    FROM formulario_opciones o
    JOIN formulario_preguntas p ON p.id = o.pregunta_id
    WHERE p.formulario_id = ? ORDER BY o.orden
  `).all(id);

  formulario.preguntas = preguntas.map((pregunta) => ({
    ...pregunta,
    opciones: opciones
      .filter((opcion) => opcion.preguntaId === pregunta.id)
      .map(({ preguntaId, ...opcion }) => ({
        ...opcion,
        esCorrecta: opcion.esCorrecta === 1,
      })),
  }));
  return formulario;
}

function listarPorDocente(docenteId) {
  return db.prepare(`
    SELECT f.id, f.titulo, f.descripcion, f.origen, f.fecha_creacion AS fechaCreacion,
           (SELECT COUNT(*) FROM formulario_preguntas p WHERE p.formulario_id = f.id) AS totalPreguntas,
           (SELECT COUNT(*) FROM formulario_asignaciones a
             WHERE a.formulario_id = f.id AND a.activo = 1) AS totalAsignaciones
    FROM formularios f
    WHERE f.docente_id = ? AND f.activo = 1
    ORDER BY f.id DESC
  `).all(docenteId);
}

function tieneEnvios(formularioId) {
  return Boolean(db.prepare(`
    SELECT 1
    FROM formulario_envios e
    JOIN formulario_asignaciones a ON a.id = e.asignacion_id
    WHERE a.formulario_id = ?
    LIMIT 1
  `).get(formularioId));
}

function desactivar(id) {
  db.prepare(`
    UPDATE formularios SET activo = 0, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?
  `).run(id);
}

module.exports = { crear, reemplazar, obtenerCompleto, listarPorDocente, tieneEnvios, desactivar };
