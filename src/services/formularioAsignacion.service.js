const repo = require('../repository/formularioAsignacion.repository');
const formularioRepo = require('../repository/formulario.repository');
const cursoRepository = require('../repository/curso.repository');
const actividadRepository = require('../repository/actividad.repository');
const entregaRepository = require('../repository/entrega.repository');
const usuarioRepository = require('../repository/usuario.repository');
const inscripcionRepository = require('../repository/inscripcion.repository');
const matriculaRepository = require('../repository/matricula.repository');
const formularioService = require('./formulario.service');
const { ErrorApp } = require('../utils/errores');

const ESTADOS_CREACION = ['borrador', 'publicada'];
const redondear = (numero) => Math.round(numero * 100) / 100;
const ESCALA_EXAMEN = 5;

const serializar = ({ activo, ...asignacion }) => ({
  ...asignacion,
  revisionDocente: asignacion.revisionDocente === 1,
  resultadosPublicados: asignacion.resultadosPublicados === 1,
});

function obtenerCursoActivo(cursoId) {
  const curso = cursoRepository.buscarPorId(cursoId);
  if (!curso || curso.activo !== 1) throw new ErrorApp('Curso no encontrado', 404);
  return curso;
}

function obtenerCursoDelDocente(cursoId, docenteId) {
  const id = Number(docenteId);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorApp('docenteId es obligatorio');
  const curso = obtenerCursoActivo(cursoId);
  const docente = usuarioRepository.buscarPorId(id);
  if (!docente || !usuarioRepository.estaActivo(docente.id)) {
    throw new ErrorApp('Docente no encontrado', 404);
  }
  if (docente.rol !== 'docente' || curso.docente_id !== docente.id) {
    throw new ErrorApp('No tienes permiso sobre este curso', 403);
  }
  return curso;
}

function validarEstudianteInscrito(cursoId, estudianteId) {
  const id = Number(estudianteId);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorApp('estudianteId es obligatorio');
  const estudiante = usuarioRepository.buscarPorId(id);
  if (!estudiante || !usuarioRepository.estaActivo(estudiante.id)) {
    throw new ErrorApp('Estudiante no encontrado', 404);
  }
  if (estudiante.rol !== 'estudiante') {
    throw new ErrorApp('Solo un estudiante puede responder formularios', 403);
  }
  const inscripcion = inscripcionRepository.buscarPorEstudianteYCurso(estudiante.id, cursoId);
  if (!inscripcion || inscripcion.estado !== 'activa') {
    throw new ErrorApp('Debes estar inscrito en el curso para acceder a sus formularios', 403);
  }
  return estudiante;
}

function obtenerAsignacion(id) {
  const asignacionId = Number(id);
  const asignacion = Number.isInteger(asignacionId) && asignacionId > 0
    ? repo.buscarPorId(asignacionId)
    : undefined;
  if (!asignacion || asignacion.activo !== 1) {
    throw new ErrorApp('Formulario asignado no encontrado', 404);
  }
  return asignacion;
}

function obtenerAsignacionDelDocente(id, docenteId) {
  const asignacion = obtenerAsignacion(id);
  obtenerCursoDelDocente(asignacion.cursoId, docenteId);
  return asignacion;
}

function verificarVentana(asignacion, ahora = Date.now()) {
  if (asignacion.estado !== 'publicada') {
    throw new ErrorApp('El formulario no está disponible', 403);
  }
  if (asignacion.fechaApertura && new Date(asignacion.fechaApertura).getTime() > ahora) {
    throw new ErrorApp('El formulario aún no está disponible', 403);
  }
  if (asignacion.fechaCierre && new Date(asignacion.fechaCierre).getTime() <= ahora) {
    throw new ErrorApp('El plazo para responder este formulario ya venció', 403);
  }
}

function estaDisponible(asignacion, ahora = Date.now()) {
  return asignacion.estado === 'publicada' &&
    (!asignacion.fechaApertura || new Date(asignacion.fechaApertura).getTime() <= ahora) &&
    (!asignacion.fechaCierre || new Date(asignacion.fechaCierre).getTime() > ahora);
}

function normalizarFecha(valor, campo) {
  if (valor === undefined || valor === null || valor === '') return null;
  const fecha = typeof valor === 'string' ? new Date(valor) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) {
    throw new ErrorApp(`${campo} debe ser una fecha válida (ISO 8601)`);
  }
  return fecha.toISOString();
}

function calcularExpiracion(asignacion, fechaInicio) {
  const inicioMs = new Date(fechaInicio).getTime();
  const finDuracion = inicioMs + asignacion.duracionMinutos * 60_000;
  const finCierre = asignacion.fechaCierre
    ? new Date(asignacion.fechaCierre).getTime()
    : Infinity;
  const expiracionMs = Math.min(finDuracion, finCierre);
  return {
    fechaExpiracion: new Date(expiracionMs).toISOString(),
    segundosRestantes: Math.max(0, Math.ceil((expiracionMs - Date.now()) / 1000)),
  };
}

function sincronizarConGpa(asignacion, envio) {
  if (!asignacion.actividadId) return null;
  const actividad = actividadRepository.buscarPorId(asignacion.actividadId);
  if (!actividad) {
    throw new ErrorApp('La actividad asociada al examen ya no está activa', 409);
  }
  const nota = redondear(
    (envio.nota / asignacion.puntajeMaximo) * actividad.puntajeMaximo
  );
  return entregaRepository.sincronizarDesdeFormulario({
    actividadId: actividad.id,
    estudianteId: envio.estudianteId,
    nota,
    fechaEnvio: envio.fechaEnvio,
    comentario: `Calificado automáticamente desde el formulario "${asignacion.titulo}"`,
  });
}

function asignar(cursoId, datos = {}) {
  const { docenteId, formularioId, actividadId } = datos;
  const curso = obtenerCursoDelDocente(cursoId, docenteId);
  if (curso.estado === 'finalizado') {
    throw new ErrorApp('El curso está finalizado: no se pueden asignar formularios', 409);
  }
  if (!formularioId) throw new ErrorApp('formularioId es obligatorio');
  const formulario = formularioService.obtenerPropio(formularioId, docenteId);

  const fechaApertura = normalizarFecha(datos.fechaApertura, 'fechaApertura');
  const fechaCierre = normalizarFecha(datos.fechaCierre, 'fechaCierre');
  if (fechaApertura && fechaCierre && new Date(fechaApertura) >= new Date(fechaCierre)) {
    throw new ErrorApp('fechaApertura debe ser anterior a fechaCierre');
  }
  if (fechaCierre && new Date(fechaCierre) <= new Date()) {
    throw new ErrorApp('fechaCierre debe ser posterior a la fecha actual');
  }

  if (datos.puntajeMaximo !== undefined && datos.puntajeMaximo !== ESCALA_EXAMEN) {
    throw new ErrorApp('Los exámenes se califican en una escala de 0 a 5');
  }
  const puntajeMaximo = ESCALA_EXAMEN;
  const duracionMinutos = datos.duracionMinutos;
  if (!Number.isInteger(duracionMinutos) || duracionMinutos < 1 || duracionMinutos > 1440) {
    throw new ErrorApp('duracionMinutos debe ser un número entero entre 1 y 1440');
  }
  const revisionDocente = datos.revisionDocente === undefined ? true : datos.revisionDocente;
  if (typeof revisionDocente !== 'boolean') {
    throw new ErrorApp('revisionDocente debe ser true o false');
  }
  const estado = datos.estado ?? 'publicada';
  if (!ESTADOS_CREACION.includes(estado)) {
    throw new ErrorApp('estado debe ser borrador o publicada');
  }

  let actividadFinal = null;
  if (actividadId !== undefined && actividadId !== null) {
    const actividadIdNumero = Number(actividadId);
    const actividad = Number.isInteger(actividadIdNumero) && actividadIdNumero > 0
      ? actividadRepository.buscarPorId(actividadIdNumero)
      : undefined;
    if (!actividad || actividad.cursoId !== curso.id) {
      throw new ErrorApp('La actividad no existe o no pertenece a este curso');
    }
    actividadFinal = actividad.id;
  }

  return repo.transaccion(() => {
    if (actividadFinal && repo.buscarActivaPorActividad(actividadFinal)) {
      throw new ErrorApp('Esta actividad ya tiene un formulario asignado', 409);
    }
    return serializar(repo.crear({
      formularioId: formulario.id,
      cursoId: curso.id,
      actividadId: actividadFinal,
      fechaApertura,
      fechaCierre,
      puntajeMaximo,
      duracionMinutos,
      revisionDocente,
      estado,
    }));
  });
}

function listarPorCurso(cursoId, usuarioId) {
  const id = Number(usuarioId);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorApp('usuarioId es obligatorio');
  const curso = obtenerCursoActivo(cursoId);
  const usuario = usuarioRepository.buscarPorId(id);
  if (!usuario || !usuarioRepository.estaActivo(usuario.id)) {
    throw new ErrorApp('Usuario no encontrado', 404);
  }

  if (usuario.rol === 'docente') {
    obtenerCursoDelDocente(curso.id, usuario.id);
    return repo.listarParaDocente(curso.id).map(serializar);
  }

  validarEstudianteInscrito(curso.id, usuario.id);
  return repo.listarParaEstudiante(curso.id, usuario.id).map((asignacion) => {
    const enviado = asignacion.envioId !== null;
    const timer = asignacion.fechaInicioIntento && asignacion.duracionMinutos
      ? calcularExpiracion(asignacion, asignacion.fechaInicioIntento)
      : null;
    const tiempoAgotado = Boolean(timer && timer.segundosRestantes === 0);
    return {
      id: asignacion.id,
      titulo: asignacion.titulo,
      descripcion: asignacion.descripcion,
      actividadId: asignacion.actividadId,
      fechaApertura: asignacion.fechaApertura,
      fechaCierre: asignacion.fechaCierre,
      puntajeMaximo: asignacion.puntajeMaximo,
      duracionMinutos: asignacion.duracionMinutos,
      fechaInicioIntento: asignacion.fechaInicioIntento,
      fechaExpiracion: timer?.fechaExpiracion ?? null,
      segundosRestantes: timer?.segundosRestantes ?? null,
      tiempoAgotado,
      disponible: !enviado && !tiempoAgotado && estaDisponible(asignacion),
      enviado,
      fechaEnvio: asignacion.fechaEnvio,
      nota: enviado && asignacion.resultadosPublicados === 1 ? asignacion.nota : null,
    };
  });
}

function obtenerParaResponder(asignacionId, estudianteId) {
  const asignacion = obtenerAsignacion(asignacionId);
  const estudiante = validarEstudianteInscrito(asignacion.cursoId, estudianteId);
  if (repo.buscarEnvio(asignacion.id, estudiante.id)) {
    throw new ErrorApp('Ya enviaste este formulario', 409);
  }
  verificarVentana(asignacion);

  let temporizador = null;
  if (asignacion.duracionMinutos) {
    const intento = repo.obtenerOCrearIntento(
      asignacion.id,
      estudiante.id,
      new Date().toISOString()
    );
    temporizador = {
      duracionMinutos: asignacion.duracionMinutos,
      fechaInicio: intento.fechaInicio,
      ...calcularExpiracion(asignacion, intento.fechaInicio),
    };
    if (temporizador.segundosRestantes === 0) {
      throw new ErrorApp('El tiempo para responder este examen ya venció', 409);
    }
  }

  const formulario = formularioService.quitarRespuestas(
    formularioRepo.obtenerCompleto(asignacion.formularioId)
  );
  return {
    asignacionId: asignacion.id,
    titulo: formulario.titulo,
    descripcion: formulario.descripcion,
    fechaCierre: asignacion.fechaCierre,
    temporizador,
    totalPreguntas: formulario.preguntas.length,
    preguntas: formulario.preguntas,
  };
}

function evaluar(formulario, respuestas) {
  if (!Array.isArray(respuestas)) throw new ErrorApp('respuestas debe ser una lista');

  const porPregunta = new Map();
  for (const respuesta of respuestas) {
    if (
      !respuesta ||
      !Number.isInteger(respuesta.preguntaId) ||
      !Array.isArray(respuesta.opcionIds) ||
      !respuesta.opcionIds.every(Number.isInteger)
    ) {
      throw new ErrorApp('Cada respuesta debe tener preguntaId y opcionIds (lista de enteros)');
    }
    if (porPregunta.has(respuesta.preguntaId)) {
      throw new ErrorApp(`La pregunta ${respuesta.preguntaId} está repetida`);
    }
    porPregunta.set(respuesta.preguntaId, [...new Set(respuesta.opcionIds)]);
  }

  for (const preguntaId of porPregunta.keys()) {
    if (!formulario.preguntas.some((pregunta) => pregunta.id === preguntaId)) {
      throw new ErrorApp(`La pregunta ${preguntaId} no pertenece a este formulario`);
    }
  }

  let obtenidos = 0;
  let totales = 0;
  const detalle = [];
  for (const pregunta of formulario.preguntas) {
    const elegidas = porPregunta.get(pregunta.id);
    if (!elegidas || elegidas.length === 0) {
      throw new ErrorApp(`Falta responder la pregunta ${pregunta.orden}`);
    }

    const idsValidos = new Set(pregunta.opciones.map((opcion) => opcion.id));
    if (!elegidas.every((id) => idsValidos.has(id))) {
      throw new ErrorApp(`Pregunta ${pregunta.orden}: incluye opciones que no le pertenecen`);
    }
    if (pregunta.tipo === 'seleccion_unica' && elegidas.length !== 1) {
      throw new ErrorApp(`Pregunta ${pregunta.orden}: solo admite una opción`);
    }

    const correctas = pregunta.opciones
      .filter((opcion) => opcion.esCorrecta)
      .map((opcion) => opcion.id);
    const esCorrecta = correctas.length === elegidas.length &&
      correctas.every((id) => elegidas.includes(id));
    const puntos = esCorrecta ? pregunta.puntaje : 0;
    totales += pregunta.puntaje;
    obtenidos += puntos;
    detalle.push({
      preguntaId: pregunta.id,
      opcionIds: elegidas,
      esCorrecta,
      puntos,
    });
  }
  return { obtenidos, totales, detalle };
}

function enviar(asignacionId, datos = {}) {
  const asignacion = obtenerAsignacion(asignacionId);
  const estudiante = validarEstudianteInscrito(asignacion.cursoId, datos.estudianteId);
  verificarVentana(asignacion);
  if (repo.buscarEnvio(asignacion.id, estudiante.id)) {
    throw new ErrorApp('Ya enviaste este formulario', 409);
  }
  if (asignacion.duracionMinutos) {
    const intento = repo.buscarIntento(asignacion.id, estudiante.id);
    if (!intento) {
      throw new ErrorApp('Debes abrir el examen antes de enviar tus respuestas', 409);
    }
    if (calcularExpiracion(asignacion, intento.fechaInicio).segundosRestantes === 0) {
      throw new ErrorApp('El tiempo para responder este examen ya venció', 409);
    }
  }

  const formulario = formularioRepo.obtenerCompleto(asignacion.formularioId);
  const { obtenidos, totales, detalle } = evaluar(formulario, datos.respuestas);
  const nota = redondear((obtenidos / totales) * asignacion.puntajeMaximo);

  let envioId;
  try {
    envioId = repo.transaccion(() => {
      const nuevoEnvioId = repo.crearEnvio({
        asignacionId: asignacion.id,
        estudianteId: estudiante.id,
        puntosObtenidos: obtenidos,
        puntosTotales: totales,
        nota,
        detalle,
      });
      if (asignacion.resultadosPublicados === 1) {
        sincronizarConGpa(asignacion, repo.buscarEnvioPorId(nuevoEnvioId));
      }
      return nuevoEnvioId;
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new ErrorApp('Ya enviaste este formulario', 409);
    }
    throw error;
  }

  const envio = repo.buscarEnvioPorId(envioId);
  const visible = asignacion.resultadosPublicados === 1;
  return {
    mensaje: 'Respuestas recibidas correctamente',
    envioId,
    fechaEnvio: envio.fechaEnvio,
    resultadosPublicados: visible,
    ...(visible
      ? {
          nota: envio.nota,
          puntosObtenidos: envio.puntosObtenidos,
          puntosTotales: envio.puntosTotales,
        }
      : { aviso: 'Tu calificación estará disponible cuando el docente publique los resultados' }),
  };
}

function detalleEnvio(formulario, envio) {
  const respuestas = new Map(
    repo.respuestasDeEnvio(envio.id).map((respuesta) => [respuesta.preguntaId, respuesta])
  );
  return {
    envioId: envio.id,
    estudianteId: envio.estudianteId,
    fechaEnvio: envio.fechaEnvio,
    nota: envio.nota,
    puntosObtenidos: envio.puntosObtenidos,
    puntosTotales: envio.puntosTotales,
    preguntas: formulario.preguntas.map((pregunta) => {
      const respuesta = respuestas.get(pregunta.id);
      return {
        preguntaId: pregunta.id,
        orden: pregunta.orden,
        enunciado: pregunta.enunciado,
        tipo: pregunta.tipo,
        puntaje: pregunta.puntaje,
        puntosObtenidos: respuesta?.puntos ?? 0,
        esCorrecta: respuesta?.esCorrecta ?? false,
        explicacion: pregunta.explicacion,
        opciones: pregunta.opciones.map((opcion) => ({
          id: opcion.id,
          texto: opcion.texto,
          esCorrecta: opcion.esCorrecta,
          seleccionada: respuesta?.opcionIds.includes(opcion.id) ?? false,
        })),
      };
    }),
  };
}

function consultarMiResultado(asignacionId, estudianteId) {
  const asignacion = obtenerAsignacion(asignacionId);
  const estudiante = validarEstudianteInscrito(asignacion.cursoId, estudianteId);
  const envio = repo.buscarEnvio(asignacion.id, estudiante.id);
  if (!envio) throw new ErrorApp('Aún no has respondido este formulario', 404);

  if (asignacion.resultadosPublicados !== 1) {
    return {
      enviado: true,
      resultadosPublicados: false,
      fechaEnvio: envio.fechaEnvio,
      aviso: 'El docente aún no publica los resultados',
    };
  }
  return {
    enviado: true,
    resultadosPublicados: true,
    ...detalleEnvio(formularioRepo.obtenerCompleto(asignacion.formularioId), envio),
  };
}

function consultarResultados(asignacionId, docenteId) {
  const asignacion = obtenerAsignacionDelDocente(asignacionId, docenteId);
  const envios = repo.listarEnvios(asignacion.id);
  const inscritos = matriculaRepository.listarInscritos(asignacion.cursoId);
  const enviaron = new Set(envios.map((envio) => envio.estudianteId));

  return {
    asignacion: serializar(asignacion),
    resumen: {
      totalInscritos: inscritos.length,
      enviaron: envios.length,
      sinEnviar: inscritos.filter((inscrito) => !enviaron.has(inscrito.estudianteId)).length,
      promedioNota: envios.length
        ? redondear(envios.reduce((suma, envio) => suma + envio.nota, 0) / envios.length)
        : null,
    },
    envios,
    sinEnviar: inscritos
      .filter((inscrito) => !enviaron.has(inscrito.estudianteId))
      .map(({ estudianteId, nombre, apellido, email }) => ({
        estudianteId,
        nombre,
        apellido,
        email,
      })),
  };
}

function consultarEnvioDocente(asignacionId, envioId, docenteId) {
  const asignacion = obtenerAsignacionDelDocente(asignacionId, docenteId);
  const id = Number(envioId);
  const envio = Number.isInteger(id) && id > 0 ? repo.buscarEnvioPorId(id) : undefined;
  if (!envio || envio.asignacionId !== asignacion.id) {
    throw new ErrorApp('Envío no encontrado', 404);
  }
  return detalleEnvio(formularioRepo.obtenerCompleto(asignacion.formularioId), envio);
}

function publicarResultados(asignacionId, docenteId) {
  const asignacion = obtenerAsignacionDelDocente(asignacionId, docenteId);
  if (asignacion.resultadosPublicados === 1) {
    throw new ErrorApp('Los resultados ya están publicados', 409);
  }
  return repo.transaccion(() => {
    const publicada = repo.publicarResultados(asignacion.id);
    const gpa = asignacion.actividadId ? { creada: 0, actualizada: 0, omitida: 0 } : null;
    if (gpa) {
      for (const envio of repo.listarEnvios(asignacion.id)) {
        const resultado = sincronizarConGpa(asignacion, envio);
        if (resultado) gpa[resultado] += 1;
      }
    }
    return { ...serializar(publicada), gpa };
  });
}

module.exports = {
  asignar,
  listarPorCurso,
  obtenerParaResponder,
  enviar,
  consultarMiResultado,
  consultarResultados,
  consultarEnvioDocente,
  publicarResultados,
};
