const inscripcionRepository = require('../repository/inscripcion.repository');
const cursoRepository = require('../repository/curso.repository');
const usuarioRepository = require('../repository/usuario.repository');
const ofertaRepository = require('../repository/oferta.repository');
const { ErrorApp } = require('../utils/errores');
const matriculaService = require('./matricula.service');

function inscribirse(datos) {
  const { estudianteId, ofertaId } = datos;
  let { cursoId } = datos;

  if (!estudianteId || (!cursoId && !ofertaId)) {
    throw new ErrorApp('estudianteId y cursoId u ofertaId son obligatorios');
  }

  const estudiante = usuarioRepository.buscarPorId(estudianteId);
  if (!estudiante || !usuarioRepository.estaActivo(estudianteId)) {
    throw new ErrorApp('Estudiante no encontrado', 404);
  }
  if (estudiante.rol !== 'estudiante') {
    throw new ErrorApp('Solo un usuario con rol estudiante puede inscribirse');
  }

  let oferta;
  if (ofertaId) {
    oferta = ofertaRepository.buscarPorId(ofertaId);
    if (!oferta || oferta.activo !== 1) {
      throw new ErrorApp('Oferta no encontrada', 404);
    }
    if (cursoId && Number(cursoId) !== oferta.curso_id) {
      throw new ErrorApp('La oferta no pertenece al curso indicado');
    }
    cursoId = oferta.curso_id;

    const ahora = Date.now();
    if (oferta.fecha_apertura && new Date(oferta.fecha_apertura).getTime() > ahora) {
      throw new ErrorApp('La inscripción a esta oferta todavía no está abierta');
    }
    if (oferta.fecha_cierre && new Date(oferta.fecha_cierre).getTime() < ahora) {
      throw new ErrorApp('La inscripción a esta oferta ya está cerrada');
    }
  }

  const curso = cursoRepository.buscarPorId(cursoId);
  if (!curso || curso.activo !== 1) {
    throw new ErrorApp('Curso no encontrado', 404);
  }
  if (!oferta && ofertaRepository.tieneOfertasPorCurso(cursoId)) {
    throw new ErrorApp('ofertaId es obligatorio para inscribirse en este curso');
  }

  const existente = inscripcionRepository.buscarPorEstudianteYCurso(estudianteId, cursoId);
  if (existente?.estado === 'activa') {
    throw new ErrorApp('El estudiante ya está inscrito en este curso');
  }
  if (existente?.estado === 'completada') {
    throw new ErrorApp('El estudiante ya completó este curso');
  }

  // Estado del curso y cupo mÃ¡ximo (si no hay cupo, el estudiante puede unirse a la lista de espera)
  matriculaService.validarDisponibilidadCurso(curso);

  if (oferta) {
    return inscripcionRepository.crearConCupo({
      estudianteId,
      cursoId,
      ofertaId: oferta.id,
      cupos: oferta.cupos,
    });
  }

  if (existente) return inscripcionRepository.reactivar(existente.id);
  return inscripcionRepository.crear({ estudianteId, cursoId });
}

function listarPorEstudiante(estudianteId) {
  if (!estudianteId) {
    throw new ErrorApp('estudianteId es obligatorio');
  }
  return inscripcionRepository.listarPorEstudiante(estudianteId);
}

function retirarInscripcion(id, estudianteId) {
  if (!estudianteId) {
    throw new ErrorApp('estudianteId es obligatorio');
  }

  const inscripcion = inscripcionRepository.buscarPorId(id);
  if (!inscripcion || inscripcion.estado !== 'activa') {
    throw new ErrorApp('Inscripción activa no encontrada', 404);
  }
  if (inscripcion.estudiante_id !== Number(estudianteId)) {
    throw new ErrorApp('La inscripción no pertenece al estudiante indicado', 403);
  }

  const retirada = inscripcionRepository.retirar(id);
  matriculaService.promoverDeEspera(inscripcion.curso_id);   // el primero de la lista de espera ocupa el cupo
  return retirada;
}

module.exports = { inscribirse, listarPorEstudiante, retirarInscripcion };