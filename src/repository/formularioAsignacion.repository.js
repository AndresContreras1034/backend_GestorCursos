const db = require('../database/connection');

const COLUMNAS = `
  fa.id, fa.formulario_id AS formularioId, fa.curso_id AS cursoId,
  fa.actividad_id AS actividadId, fa.fecha_apertura AS fechaApertura,
  fa.fecha_cierre AS fechaCierre, fa.puntaje_maximo AS puntajeMaximo,
  fa.duracion_minutos AS duracionMinutos,
  fa.revision_docente AS revisionDocente,
  fa.resultados_publicados AS resultadosPublicados, fa.estado, fa.activo,
  f.titulo, f.descripcion
`;
const FROM = 'FROM formulario_asignaciones fa JOIN formularios f ON f.id = fa.formulario_id';

function crear(datos) {
  const resultado = db.prepare(`
    INSERT INTO formulario_asignaciones
      (formulario_id, curso_id, actividad_id, fecha_apertura, fecha_cierre,
       puntaje_maximo, revision_docente, resultados_publicados, estado, duracion_minutos)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    datos.formularioId,
    datos.cursoId,
    datos.actividadId ?? null,
    datos.fechaApertura ?? null,
    datos.fechaCierre ?? null,
    datos.puntajeMaximo,
    datos.revisionDocente ? 1 : 0,
    datos.revisionDocente ? 0 : 1,
    datos.estado,
    datos.duracionMinutos
  );
  return buscarPorId(Number(resultado.lastInsertRowid));
}

function buscarPorId(id) {
  return db.prepare(`SELECT ${COLUMNAS} ${FROM} WHERE fa.id = ?`).get(id);
}

function listarParaDocente(cursoId) {
  return db.prepare(`
    SELECT ${COLUMNAS},
           (SELECT COUNT(*) FROM formulario_envios e WHERE e.asignacion_id = fa.id) AS totalEnvios
    ${FROM}
    WHERE fa.curso_id = ? AND fa.activo = 1
    ORDER BY fa.id DESC
  `).all(cursoId);
}

function listarParaEstudiante(cursoId, estudianteId) {
  return db.prepare(`
    SELECT ${COLUMNAS}, e.id AS envioId, e.fecha_envio AS fechaEnvio, e.nota,
           i.fecha_inicio AS fechaInicioIntento
    ${FROM}
    LEFT JOIN formulario_envios e
      ON e.asignacion_id = fa.id AND e.estudiante_id = ?
    LEFT JOIN formulario_intentos i
      ON i.asignacion_id = fa.id AND i.estudiante_id = ?
    WHERE fa.curso_id = ? AND fa.activo = 1 AND fa.estado = 'publicada'
    ORDER BY fa.id DESC
  `).all(estudianteId, estudianteId, cursoId);
}

function publicarResultados(id) {
  db.prepare('UPDATE formulario_asignaciones SET resultados_publicados = 1 WHERE id = ?').run(id);
  return buscarPorId(id);
}

function buscarActivaPorActividad(actividadId) {
  return db.prepare(`
    SELECT id FROM formulario_asignaciones
    WHERE actividad_id = ? AND activo = 1
  `).get(actividadId);
}

function obtenerOCrearIntento(asignacionId, estudianteId, fechaInicio) {
  return db.transaction(() => {
    db.prepare(`
      INSERT INTO formulario_intentos (asignacion_id, estudiante_id, fecha_inicio)
      VALUES (?, ?, ?)
      ON CONFLICT(asignacion_id, estudiante_id) DO NOTHING
    `).run(asignacionId, estudianteId, fechaInicio);
    return db.prepare(`
      SELECT fecha_inicio AS fechaInicio FROM formulario_intentos
      WHERE asignacion_id = ? AND estudiante_id = ?
    `).get(asignacionId, estudianteId);
  }).immediate();
}

function buscarIntento(asignacionId, estudianteId) {
  return db.prepare(`
    SELECT fecha_inicio AS fechaInicio
    FROM formulario_intentos
    WHERE asignacion_id = ? AND estudiante_id = ?
  `).get(asignacionId, estudianteId);
}

function transaccion(fn) {
  return db.transaction(fn).immediate();
}

const COLUMNAS_ENVIO = `
  id, asignacion_id AS asignacionId, estudiante_id AS estudianteId,
  fecha_envio AS fechaEnvio, puntos_obtenidos AS puntosObtenidos,
  puntos_totales AS puntosTotales, nota
`;

function buscarEnvio(asignacionId, estudianteId) {
  return db.prepare(`
    SELECT ${COLUMNAS_ENVIO} FROM formulario_envios
    WHERE asignacion_id = ? AND estudiante_id = ?
  `).get(asignacionId, estudianteId);
}

function buscarEnvioPorId(id) {
  return db.prepare(`SELECT ${COLUMNAS_ENVIO} FROM formulario_envios WHERE id = ?`).get(id);
}

const crearEnvio = db.transaction((datos) => {
  const id = Number(db.prepare(`
    INSERT INTO formulario_envios
      (asignacion_id, estudiante_id, puntos_obtenidos, puntos_totales, nota)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    datos.asignacionId,
    datos.estudianteId,
    datos.puntosObtenidos,
    datos.puntosTotales,
    datos.nota
  ).lastInsertRowid);

  const insertarRespuesta = db.prepare(`
    INSERT INTO formulario_respuestas
      (envio_id, pregunta_id, opciones_ids, es_correcta, puntos)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const respuesta of datos.detalle) {
    insertarRespuesta.run(
      id,
      respuesta.preguntaId,
      JSON.stringify(respuesta.opcionIds),
      respuesta.esCorrecta ? 1 : 0,
      respuesta.puntos
    );
  }
  return id;
});

function respuestasDeEnvio(envioId) {
  return db.prepare(`
    SELECT pregunta_id AS preguntaId, opciones_ids AS opcionIds,
           es_correcta AS esCorrecta, puntos
    FROM formulario_respuestas WHERE envio_id = ?
  `).all(envioId).map((respuesta) => ({
    ...respuesta,
    opcionIds: JSON.parse(respuesta.opcionIds),
    esCorrecta: respuesta.esCorrecta === 1,
  }));
}

function listarEnvios(asignacionId) {
  return db.prepare(`
    SELECT e.id AS envioId, e.estudiante_id AS estudianteId,
           u.nombre, u.apellido, u.email, e.fecha_envio AS fechaEnvio,
           e.puntos_obtenidos AS puntosObtenidos,
           e.puntos_totales AS puntosTotales, e.nota
    FROM formulario_envios e
    JOIN usuarios u ON u.id = e.estudiante_id
    WHERE e.asignacion_id = ?
    ORDER BY u.apellido, u.nombre
  `).all(asignacionId);
}

module.exports = {
  crear,
  buscarPorId,
  listarParaDocente,
  listarParaEstudiante,
  publicarResultados,
  buscarActivaPorActividad,
  obtenerOCrearIntento,
  buscarIntento,
  transaccion,
  buscarEnvio,
  buscarEnvioPorId,
  crearEnvio,
  respuestasDeEnvio,
  listarEnvios,
};
