const repo = require('../repository/cursoGestion.repository');
const { ErrorApp } = require('../utils/errores');

function obtenerCurso(id) {
  const curso = repo.obtenerDetalle(id);
  if (!curso || curso.activo !== 1) throw new ErrorApp('Curso no encontrado', 404);
  const { activo, ...resto } = curso;
  return resto;
}

function eliminarCurso(id, docenteId) {
  if (!docenteId) throw new ErrorApp('docenteId es obligatorio para validar el curso');
  const curso = repo.obtenerDetalle(id);
  if (!curso || curso.activo !== 1) throw new ErrorApp('Curso no encontrado', 404);
  if (curso.docenteId !== Number(docenteId)) {
    throw new ErrorApp('No tienes permiso para eliminar este curso', 403);
  }
  repo.desactivar(curso.id);
  return { mensaje: 'Curso eliminado exitosamente', id: curso.id };
}

module.exports = { obtenerCurso, eliminarCurso };
