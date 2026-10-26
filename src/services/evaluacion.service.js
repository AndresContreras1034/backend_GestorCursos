const evaluacionRepository = require('../repository/evaluacion.repository');
const cursoRepository = require('../repository/curso.repository');
const { ErrorApp } = require('../utils/errores');

const CAMPOS_PERMITIDOS = new Set([
  'titulo',
  'descripcion',
  'fechaLimite',
  'puntajeMaximo',
]);

function validarPertenencia(cursoId, docenteId) {
  const curso = cursoRepository.buscarPorId(cursoId);
  if (!curso || curso.activo !== 1) {
    throw new ErrorApp('Curso no encontrado', 404);
  }
  if (!docenteId) {
    throw new ErrorApp('docenteId es obligatorio para validar el curso');
  }
  if (curso.docente_id !== Number(docenteId)) {
    throw new ErrorApp('No tienes permiso sobre este curso', 403);
  }
}

function validarFecha(fechaLimite) {
  if (
    fechaLimite !== null &&
    fechaLimite !== undefined &&
    fechaLimite !== '' &&
    (typeof fechaLimite !== 'string' || isNaN(new Date(fechaLimite).getTime()))
  ) {
    throw new ErrorApp('fechaLimite inválida');
  }
}

function validarPuntaje(puntajeMaximo) {
  if (
    typeof puntajeMaximo !== 'number' ||
    !Number.isFinite(puntajeMaximo) ||
    puntajeMaximo <= 0 ||
    puntajeMaximo > 100
  ) {
    throw new ErrorApp('puntajeMaximo debe ser un número mayor que cero y menor o igual a 100');
  }
}

function crearEvaluacion(cursoId, datos) {
  const {
    titulo,
    descripcion,
    fechaLimite,
    puntajeMaximo = 100,
    docenteId,
  } = datos;
  if (typeof titulo !== 'string' || titulo.trim().length < 3) {
    throw new ErrorApp('El título debe tener al menos 3 caracteres');
  }
  validarPertenencia(cursoId, docenteId);
  validarFecha(fechaLimite);
  validarPuntaje(puntajeMaximo);

  return evaluacionRepository.crear({
    cursoId,
    titulo: titulo.trim(),
    descripcion,
    fechaLimite: fechaLimite || null,
    puntajeMaximo,
  });
}

function listarPorCurso(cursoId) {
  const curso = cursoRepository.buscarPorId(cursoId);
  if (!curso || curso.activo !== 1) {
    throw new ErrorApp('Curso no encontrado', 404);
  }
  return evaluacionRepository.listarPorCurso(cursoId);
}

function actualizarEvaluacion(id, datos) {
  const { docenteId, ...cambios } = datos;
  const evaluacion = evaluacionRepository.buscarPorId(id);
  if (!evaluacion || evaluacion.activo !== 1) {
    throw new ErrorApp('Evaluación no encontrada', 404);
  }
  validarPertenencia(evaluacion.curso_id, docenteId);

  if (Object.keys(cambios).some((campo) => !CAMPOS_PERMITIDOS.has(campo))) {
    throw new ErrorApp('La solicitud contiene campos no permitidos');
  }
  if (Object.keys(cambios).length === 0) {
    throw new ErrorApp('Debe enviar al menos un campo para actualizar');
  }
  if (
    cambios.titulo !== undefined &&
    (typeof cambios.titulo !== 'string' || cambios.titulo.trim().length < 3)
  ) {
    throw new ErrorApp('El título debe tener al menos 3 caracteres');
  }
  if (cambios.titulo !== undefined) cambios.titulo = cambios.titulo.trim();
  validarFecha(
    cambios.fechaLimite !== undefined
      ? cambios.fechaLimite
      : evaluacion.fecha_limite
  );
  if (cambios.fechaLimite === '') cambios.fechaLimite = null;
  if (cambios.puntajeMaximo !== undefined) {
    validarPuntaje(cambios.puntajeMaximo);
  }

  return evaluacionRepository.actualizar(id, cambios);
}

function eliminarEvaluacion(id, docenteId) {
  const evaluacion = evaluacionRepository.buscarPorId(id);
  if (!evaluacion || evaluacion.activo !== 1) {
    throw new ErrorApp('Evaluación no encontrada', 404);
  }
  validarPertenencia(evaluacion.curso_id, docenteId);
  evaluacionRepository.eliminar(id);
}

module.exports = {
  crearEvaluacion,
  listarPorCurso,
  actualizarEvaluacion,
  eliminarEvaluacion,
};
