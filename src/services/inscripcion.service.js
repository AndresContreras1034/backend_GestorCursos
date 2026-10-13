const inscripcionRepository = require('../repository/inscripcion.repository');
const cursoRepository = require('../repository/curso.repository');
const usuarioRepository = require('../repository/usuario.repository');

function inscribirse(datos) {
  const { estudianteId, cursoId } = datos;

  if (!estudianteId || !cursoId) {
    throw new Error('estudianteId y cursoId son obligatorios');
  }

  const estudiante = usuarioRepository.buscarPorId(estudianteId);
  if (!estudiante) {
    throw new Error('Estudiante no encontrado');
  }
  if (estudiante.rol !== 'estudiante') {
    throw new Error('Solo un usuario con rol estudiante puede inscribirse');
  }

  const curso = cursoRepository.buscarPorId(cursoId);
  if (!curso || curso.activo !== 1) {
    throw new Error('Curso no encontrado');
  }

  const existente = inscripcionRepository.buscarPorEstudianteYCurso(estudianteId, cursoId);
  if (existente) {
    throw new Error('El estudiante ya está inscrito en este curso');
  }

  return inscripcionRepository.crear({ estudianteId, cursoId });
}

function listarPorEstudiante(estudianteId) {
  if (!estudianteId) {
    throw new Error('estudianteId es obligatorio');
  }
  return inscripcionRepository.listarPorEstudiante(estudianteId);
}

module.exports = { inscribirse, listarPorEstudiante };