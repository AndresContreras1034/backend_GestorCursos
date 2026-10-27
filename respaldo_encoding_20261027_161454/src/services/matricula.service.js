const repo = require('../repository/matricula.repository');
const cursoRepository = require('../repository/curso.repository');
const usuarioRepository = require('../repository/usuario.repository');
const ofertaRepository = require('../repository/oferta.repository');
const organizacionService = require('./organizacion.service');
const { ErrorApp } = require('../utils/errores');

const MAX_LOTE = 200;
const ESTADOS_PROMOCION = ['abierto', 'en_curso'];

// ---------------- Helpers ----------------
function resolverEstudiante(ref) {
  if (!ref || typeof ref !== 'object') throw new ErrorApp('Debes indicar estudianteId, email o cedula');
  const id = ref.estudianteId ?? ref.id;
  let usuario;

  if (id !== undefined && id !== null) {
    usuario = usuarioRepository.buscarPorId(Number(id));
  } else if (typeof ref.email === 'string' && ref.email.trim()) {
    const fila = usuarioRepository.buscarPorEmail(ref.email.trim().toLowerCase());
    usuario = fila && usuarioRepository.buscarPorId(fila.id);
  } else if (ref.cedula !== undefined && ref.cedula !== null && String(ref.cedula).trim()) {
    const fila = usuarioRepository.buscarPorCedula(String(ref.cedula).trim());
    usuario = fila && usuarioRepository.buscarPorId(fila.id);
  } else {
    throw new ErrorApp('Debes indicar estudianteId, email o cedula');
  }

  if (!usuario || !usuarioRepository.estaActivo(usuario.id)) {
    throw new ErrorApp('Estudiante no encontrado', 404);
  }
  if (usuario.rol !== 'estudiante') throw new ErrorApp('Solo un estudiante puede ser matriculado');
  return usuario;
}

function resolverOferta(curso, ofertaId) {
  const hayOferta = ofertaId !== undefined && ofertaId !== null;
  if (!hayOferta) {
    if (ofertaRepository.listarPorCurso(curso.id).length > 0) {
      throw new ErrorApp('ofertaId es obligatorio: el curso tiene ofertas activas');
    }
    return null;
  }
  const oferta = ofertaRepository.buscarPorId(Number(ofertaId));
  if (!oferta || oferta.activo !== 1 || oferta.curso_id !== curso.id) {
    throw new ErrorApp('Oferta no encontrada para este curso', 404);
  }
  return oferta;
}

const resumenEstudiante = (e) => ({ id: e.id, nombre: e.nombre, apellido: e.apellido, email: e.email });

// Usado tambiÃ©n por inscripcion.service cuando el propio estudiante se inscribe
function validarDisponibilidadCurso(curso) {
  if (curso.estado !== 'abierto') {
    throw new ErrorApp('El curso no estÃ¡ abierto a inscripciones', 409);
  }
  if (curso.cupo_maximo !== null && repo.contarActivasCurso(curso.id) >= curso.cupo_maximo) {
    throw new ErrorApp('El curso no tiene cupos disponibles. Puedes unirte a la lista de espera', 409);
  }
}

// ---------------- MatrÃ­cula por el docente ----------------
function matricularUno(curso, ref, ofertaId, docenteId) {
  const estudiante = resolverEstudiante(ref);
  const oferta = resolverOferta(curso, ofertaId);
  const inscripcion = repo.matricular({
    estudianteId: estudiante.id,
    cursoId: curso.id,
    ofertaId: oferta?.id ?? null,
    matriculadoPor: Number(docenteId),
    cupoCurso: curso.cupo_maximo,
    cuposOferta: oferta?.cupos ?? null,
  });
  return { ...inscripcion, estudiante: resumenEstudiante(estudiante) };
}

function matricularEstudiante(cursoId, datos = {}) {
  const curso = organizacionService.obtenerCursoDelDocente(cursoId, datos.docenteId);
  return matricularUno(curso, datos, datos.ofertaId, datos.docenteId);
}

function matricularLote(cursoId, datos = {}) {
  const curso = organizacionService.obtenerCursoDelDocente(cursoId, datos.docenteId);
  const { estudiantes, ofertaId } = datos;
  if (!Array.isArray(estudiantes) || estudiantes.length === 0 || estudiantes.length > MAX_LOTE) {
    throw new ErrorApp(`estudiantes debe ser una lista de 1 a ${MAX_LOTE} elementos`);
  }

  const matriculados = [];
  const omitidos = [];
  for (const ref of estudiantes) {
    try {
      matriculados.push(matricularUno(curso, ref, ofertaId, datos.docenteId));
    } catch (error) {
      if (!(error instanceof ErrorApp)) throw error;
      omitidos.push({ referencia: ref, motivo: error.message });
    }
  }
  return {
    totalMatriculados: matriculados.length,
    totalOmitidos: omitidos.length,
    matriculados,
    omitidos,
  };
}

function retirarEstudiante(cursoId, inscripcionId, docenteId) {
  const curso = organizacionService.obtenerCursoDelDocente(cursoId, docenteId);
  const inscripcion = repo.buscarInscripcionPorId(Number(inscripcionId));
  if (!inscripcion || inscripcion.curso_id !== curso.id || inscripcion.estado !== 'activa') {
    throw new ErrorApp('InscripciÃ³n activa no encontrada en este curso', 404);
  }
  const retirada = repo.retirarPorDocente(inscripcion.id);
  const promovidos = promoverDeEspera(curso.id);
  return { inscripcion: retirada, promovidos };
}

function consultarMatriculas(cursoId, docenteId) {
  const curso = organizacionService.obtenerCursoDelDocente(cursoId, docenteId, { editable: false });
  const inscritos = repo.listarInscritos(curso.id);
  return {
    curso: { id: curso.id, nombre: curso.nombre, estado: curso.estado },
    cupoMaximo: curso.cupo_maximo,
    cuposDisponibles: curso.cupo_maximo === null ? null : Math.max(0, curso.cupo_maximo - inscritos.length),
    totalInscritos: inscritos.length,
    inscritos,
    listaEspera: repo.listarEsperaActiva(curso.id).map((e, i) => ({ posicion: i + 1, ...e })),
  };
}

// ---------------- Lista de espera ----------------
function obtenerCursoActivo(cursoId) {
  const curso = cursoRepository.buscarPorId(cursoId);
  if (!curso || curso.activo !== 1) throw new ErrorApp('Curso no encontrado', 404);
  return curso;
}

function posicionEnEspera(cursoId, estudianteId) {
  const indice = repo.listarEsperaActiva(cursoId).findIndex((e) => e.estudianteId === estudianteId);
  return indice === -1 ? null : indice + 1;
}

function unirseListaEspera(cursoId, datos = {}) {
  const curso = obtenerCursoActivo(cursoId);
  const estudiante = resolverEstudiante({ estudianteId: datos.estudianteId });

  if (curso.estado !== 'abierto') throw new ErrorApp('El curso no estÃ¡ abierto a inscripciones', 409);
  if (curso.cupo_maximo === null || repo.contarActivasCurso(curso.id) < curso.cupo_maximo) {
    throw new ErrorApp('El curso aÃºn tiene cupos disponibles: inscrÃ­bete directamente');
  }
  const inscripcion = repo.buscarInscripcion(estudiante.id, curso.id);
  if (inscripcion?.estado === 'activa') throw new ErrorApp('Ya estÃ¡s inscrito en este curso', 409);
  if (inscripcion?.estado === 'completada') throw new ErrorApp('Ya completaste este curso', 409);
  if (repo.buscarEsperaActiva(curso.id, estudiante.id)) {
    throw new ErrorApp('Ya estÃ¡s en la lista de espera de este curso', 409);
  }

  const oferta = resolverOferta(curso, datos.ofertaId);
  const ahora = Date.now();
  if (oferta?.fecha_apertura && new Date(oferta.fecha_apertura).getTime() > ahora) {
    throw new ErrorApp('La inscripciÃ³n a esta oferta todavÃ­a no estÃ¡ abierta');
  }
  if (oferta?.fecha_cierre && new Date(oferta.fecha_cierre).getTime() < ahora) {
    throw new ErrorApp('La inscripciÃ³n a esta oferta ya estÃ¡ cerrada');
  }

  repo.agregarEspera(curso.id, estudiante.id, oferta?.id ?? null);
  return { mensaje: 'Quedaste en la lista de espera', posicion: posicionEnEspera(curso.id, estudiante.id) };
}

function consultarPosicionEspera(cursoId, estudianteId) {
  const curso = obtenerCursoActivo(cursoId);
  const estudiante = resolverEstudiante({ estudianteId });
  const posicion = posicionEnEspera(curso.id, estudiante.id);
  return { enListaEspera: posicion !== null, posicion };
}

function salirListaEspera(cursoId, estudianteId) {
  const curso = obtenerCursoActivo(cursoId);
  const estudiante = resolverEstudiante({ estudianteId });
  const espera = repo.buscarEsperaActiva(curso.id, estudiante.id);
  if (!espera) throw new ErrorApp('No estÃ¡s en la lista de espera de este curso', 404);
  repo.cancelarEspera(espera.id);
  return { mensaje: 'Saliste de la lista de espera' };
}

// Cuando se libera un cupo (retiro, aumento de cupo) entra el primero de la fila
function promoverDeEspera(cursoId) {
  const curso = cursoRepository.buscarPorId(cursoId);
  if (!curso || curso.activo !== 1 || !ESTADOS_PROMOCION.includes(curso.estado)) return [];

  const promovidos = [];
  for (const item of repo.listarEsperaActiva(curso.id)) {
    if (curso.cupo_maximo !== null && repo.contarActivasCurso(curso.id) >= curso.cupo_maximo) break;

    const oferta = item.ofertaId ? ofertaRepository.buscarPorId(item.ofertaId) : null;
    if (item.ofertaId && (!oferta || oferta.activo !== 1)) continue;
    try {
      repo.matricular({
        estudianteId: item.estudianteId,
        cursoId: curso.id,
        ofertaId: oferta?.id ?? null,
        matriculadoPor: null,
        cupoCurso: curso.cupo_maximo,
        cuposOferta: oferta?.cupos ?? null,
      });
      promovidos.push({ id: item.estudianteId, nombre: item.nombre, apellido: item.apellido, email: item.email });
    } catch (error) {
      if (!(error instanceof ErrorApp)) throw error;   // p. ej. su oferta estÃ¡ llena: sigue esperando
    }
  }
  return promovidos;
}

module.exports = {
  validarDisponibilidadCurso, matricularEstudiante, matricularLote, retirarEstudiante,
  consultarMatriculas, unirseListaEspera, consultarPosicionEspera, salirListaEspera,
  promoverDeEspera,
};
