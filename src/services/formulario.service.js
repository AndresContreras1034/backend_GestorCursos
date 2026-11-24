const repo = require('../repository/formulario.repository');
const usuarioRepository = require('../repository/usuario.repository');
const iaService = require('./ia.service');
const { ErrorApp } = require('../utils/errores');

const TIPOS = ['seleccion_unica', 'seleccion_multiple'];
const MAX_PREGUNTAS = 50;
const MAX_OPCIONES = 6;

function validarTitulo(titulo) {
  if (typeof titulo !== 'string' || titulo.trim().length < 3 || titulo.trim().length > 150) {
    throw new ErrorApp('El título debe tener entre 3 y 150 caracteres');
  }
  return titulo.trim();
}

function validarDescripcion(descripcion) {
  if (descripcion === undefined || descripcion === null || descripcion === '') return null;
  if (typeof descripcion !== 'string' || descripcion.trim().length > 1000) {
    throw new ErrorApp('La descripción debe ser texto de máximo 1000 caracteres');
  }
  return descripcion.trim() || null;
}

function validarPreguntas(preguntas) {
  if (!Array.isArray(preguntas) || preguntas.length < 1 || preguntas.length > MAX_PREGUNTAS) {
    throw new ErrorApp(`El formulario debe tener entre 1 y ${MAX_PREGUNTAS} preguntas`);
  }

  return preguntas.map((pregunta, i) => {
    const numero = i + 1;
    if (
      typeof pregunta?.enunciado !== 'string' ||
      pregunta.enunciado.trim().length < 3 ||
      pregunta.enunciado.trim().length > 1000
    ) {
      throw new ErrorApp(`Pregunta ${numero}: el enunciado debe tener entre 3 y 1000 caracteres`);
    }
    if (!TIPOS.includes(pregunta.tipo)) {
      throw new ErrorApp(`Pregunta ${numero}: tipo debe ser ${TIPOS.join(' o ')}`);
    }
    const puntaje = pregunta.puntaje === undefined ? 1 : pregunta.puntaje;
    if (typeof puntaje !== 'number' || !Number.isFinite(puntaje) || puntaje <= 0 || puntaje > 100) {
      throw new ErrorApp(`Pregunta ${numero}: puntaje debe ser un número mayor a 0 y máximo 100`);
    }
    if (
      pregunta.explicacion !== undefined &&
      pregunta.explicacion !== null &&
      (typeof pregunta.explicacion !== 'string' || pregunta.explicacion.length > 1000)
    ) {
      throw new ErrorApp(`Pregunta ${numero}: la explicación debe ser texto de máximo 1000 caracteres`);
    }
    if (
      !Array.isArray(pregunta.opciones) ||
      pregunta.opciones.length < 2 ||
      pregunta.opciones.length > MAX_OPCIONES
    ) {
      throw new ErrorApp(`Pregunta ${numero}: debe tener entre 2 y ${MAX_OPCIONES} opciones`);
    }

    const opciones = pregunta.opciones.map((opcion, j) => {
      if (
        typeof opcion?.texto !== 'string' ||
        opcion.texto.trim().length < 1 ||
        opcion.texto.trim().length > 300
      ) {
        throw new ErrorApp(`Pregunta ${numero}, opción ${j + 1}: el texto debe tener entre 1 y 300 caracteres`);
      }
      if (typeof opcion.esCorrecta !== 'boolean') {
        throw new ErrorApp(`Pregunta ${numero}, opción ${j + 1}: esCorrecta debe ser true o false`);
      }
      return { texto: opcion.texto.trim(), esCorrecta: opcion.esCorrecta };
    });

    const textos = new Set(opciones.map((opcion) => opcion.texto.toLowerCase()));
    if (textos.size !== opciones.length) {
      throw new ErrorApp(`Pregunta ${numero}: tiene opciones repetidas`);
    }

    const correctas = opciones.filter((opcion) => opcion.esCorrecta).length;
    if (pregunta.tipo === 'seleccion_unica' && correctas !== 1) {
      throw new ErrorApp(`Pregunta ${numero}: la selección única debe tener exactamente una opción correcta`);
    }
    if (pregunta.tipo === 'seleccion_multiple' && correctas < 1) {
      throw new ErrorApp(`Pregunta ${numero}: la selección múltiple debe tener al menos una opción correcta`);
    }

    return {
      enunciado: pregunta.enunciado.trim(),
      tipo: pregunta.tipo,
      puntaje,
      explicacion: pregunta.explicacion?.trim() || null,
      opciones,
    };
  });
}

function obtenerDocente(docenteId) {
  const id = Number(docenteId);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorApp('docenteId es obligatorio');
  const usuario = usuarioRepository.buscarPorId(id);
  if (!usuario || !usuarioRepository.estaActivo(usuario.id)) {
    throw new ErrorApp('Docente no encontrado', 404);
  }
  if (usuario.rol !== 'docente') {
    throw new ErrorApp('Solo un docente puede gestionar formularios', 403);
  }
  return usuario;
}

function obtenerPropio(id, docenteId) {
  obtenerDocente(docenteId);
  const formularioId = Number(id);
  if (!Number.isInteger(formularioId) || formularioId <= 0) {
    throw new ErrorApp('formularioId inválido');
  }
  const formulario = repo.obtenerCompleto(formularioId);
  if (!formulario || formulario.activo !== 1) {
    throw new ErrorApp('Formulario no encontrado', 404);
  }
  if (formulario.docenteId !== Number(docenteId)) {
    throw new ErrorApp('No tienes permiso sobre este formulario', 403);
  }
  return formulario;
}

function quitarRespuestas(formulario) {
  return {
    id: formulario.id,
    titulo: formulario.titulo,
    descripcion: formulario.descripcion,
    preguntas: formulario.preguntas.map((pregunta) => ({
      id: pregunta.id,
      orden: pregunta.orden,
      enunciado: pregunta.enunciado,
      tipo: pregunta.tipo,
      puntaje: pregunta.puntaje,
      opciones: pregunta.opciones.map(({ id, orden, texto }) => ({ id, orden, texto })),
    })),
  };
}

function crearFormulario(datos = {}, { origen = 'manual', promptIa = null } = {}) {
  const docente = obtenerDocente(datos.docenteId);
  const id = repo.crear({
    docenteId: docente.id,
    titulo: validarTitulo(datos.titulo),
    descripcion: validarDescripcion(datos.descripcion),
    preguntas: validarPreguntas(datos.preguntas),
    origen,
    promptIa,
  });
  return repo.obtenerCompleto(id);
}

function listar(docenteId) {
  const docente = obtenerDocente(docenteId);
  return repo.listarPorDocente(docente.id);
}

function obtener(id, docenteId) {
  return obtenerPropio(id, docenteId);
}

function vistaPrevia(id, docenteId) {
  return quitarRespuestas(obtenerPropio(id, docenteId));
}

function actualizar(id, datos = {}) {
  const actual = obtenerPropio(id, datos.docenteId);
  if (repo.tieneEnvios(actual.id)) {
    throw new ErrorApp('El formulario ya tiene respuestas de estudiantes y no se puede editar. Crea una copia nueva', 409);
  }
  if (
    datos.titulo === undefined &&
    datos.descripcion === undefined &&
    datos.preguntas === undefined
  ) {
    throw new ErrorApp('Debe enviar al menos un campo para actualizar');
  }
  repo.reemplazar(actual.id, {
    titulo: datos.titulo !== undefined ? validarTitulo(datos.titulo) : actual.titulo,
    descripcion: datos.descripcion !== undefined
      ? validarDescripcion(datos.descripcion)
      : actual.descripcion,
    preguntas: datos.preguntas !== undefined ? validarPreguntas(datos.preguntas) : undefined,
  });
  return repo.obtenerCompleto(actual.id);
}

function eliminar(id, docenteId) {
  const formulario = obtenerPropio(id, docenteId);
  repo.desactivar(formulario.id);
}

async function generarConIA(datos = {}) {
  const docente = obtenerDocente(datos.docenteId);
  const prompt = typeof datos.prompt === 'string' ? datos.prompt.trim() : '';
  if (prompt.length < 10 || prompt.length > 1000) {
    throw new ErrorApp('prompt debe tener entre 10 y 1000 caracteres');
  }
  if (datos.guardar !== undefined && typeof datos.guardar !== 'boolean') {
    throw new ErrorApp('guardar debe ser true o false');
  }

  const generado = await iaService.generarFormulario(prompt);
  let formulario;
  try {
    formulario = {
      titulo: validarTitulo(String(generado.titulo ?? '').slice(0, 150)),
      descripcion: validarDescripcion(
        generado.descripcion ? String(generado.descripcion).slice(0, 1000) : null
      ),
      preguntas: validarPreguntas(generado.preguntas),
    };
  } catch (error) {
    if (error instanceof ErrorApp) {
      throw new ErrorApp(
        `La IA devolvió un formulario inválido (${error.message}). Intenta de nuevo o ajusta la descripción`,
        502
      );
    }
    throw error;
  }

  if (datos.guardar === true) {
    const id = repo.crear({
      docenteId: docente.id,
      ...formulario,
      origen: 'ia',
      promptIa: prompt,
    });
    return { guardado: true, formulario: repo.obtenerCompleto(id) };
  }
  return { guardado: false, formulario };
}

module.exports = {
  crearFormulario,
  listar,
  obtener,
  vistaPrevia,
  actualizar,
  eliminar,
  generarConIA,
  obtenerPropio,
  quitarRespuestas,
};
