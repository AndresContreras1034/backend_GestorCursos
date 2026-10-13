const cronogramaRepository = require('../repository/cronograma.repository');
const cursoRepository = require('../repository/curso.repository');

function validarPertenencia(cursoId, docenteId) {
  const curso = cursoRepository.buscarPorId(cursoId);
  if (!curso) {
    throw new Error('Curso no encontrado');
  }
  if (!docenteId) {
    throw new Error('docenteId es obligatorio para validar el curso');
  }
  if (curso.docente_id !== Number(docenteId)) {
    throw new Error('No tienes permiso sobre este curso');
  }
  return curso;
}

function validarFechas(fechaInicio, fechaFin) {
  if (fechaInicio && isNaN(new Date(fechaInicio).getTime())) {
    throw new Error('fechaInicio inválida');
  }
  if (fechaFin && isNaN(new Date(fechaFin).getTime())) {
    throw new Error('fechaFin inválida');
  }
  if (fechaInicio && fechaFin && new Date(fechaInicio) > new Date(fechaFin)) {
    throw new Error('fechaInicio no puede ser posterior a fechaFin');
  }
}

function crearSesion(cursoId, datos) {
  const { titulo, descripcion, fechaInicio, fechaFin, orden, docenteId } = datos;

  if (!titulo) {
    throw new Error('El título de la sesión es obligatorio');
  }

  validarPertenencia(cursoId, docenteId);
  validarFechas(fechaInicio, fechaFin);

  return cronogramaRepository.crear({
    cursoId,
    titulo,
    descripcion,
    fechaInicio,
    fechaFin,
    orden,
  });
}

function listarPorCurso(cursoId) {
  const curso = cursoRepository.buscarPorId(cursoId);
  if (!curso) {
    throw new Error('Curso no encontrado');
  }
  return cronogramaRepository.listarPorCurso(cursoId);
}

function actualizarSesion(id, datos) {
  const { titulo, descripcion, fechaInicio, fechaFin, orden, docenteId } = datos;

  if (
    titulo === undefined &&
    descripcion === undefined &&
    fechaInicio === undefined &&
    fechaFin === undefined &&
    orden === undefined
  ) {
    throw new Error('Debe enviar al menos un campo para actualizar');
  }

  const sesion = cronogramaRepository.buscarPorId(id);
  if (!sesion) {
    throw new Error('Sesión no encontrada');
  }

  validarPertenencia(sesion.curso_id, docenteId);

  const fechaInicioFinal = fechaInicio !== undefined ? fechaInicio : sesion.fecha_inicio;
  const fechaFinFinal = fechaFin !== undefined ? fechaFin : sesion.fecha_fin;
  validarFechas(fechaInicioFinal, fechaFinFinal);

  return cronogramaRepository.actualizar(id, {
    titulo,
    descripcion,
    fechaInicio,
    fechaFin,
    orden,
  });
}

function eliminarSesion(id, docenteId) {
  const sesion = cronogramaRepository.buscarPorId(id);
  if (!sesion) {
    throw new Error('Sesión no encontrada');
  }

  validarPertenencia(sesion.curso_id, docenteId);

  cronogramaRepository.eliminar(id);
}

module.exports = { crearSesion, listarPorCurso, actualizarSesion, eliminarSesion };