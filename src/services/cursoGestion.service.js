const repo = require('../repository/cursoGestion.repository');
const organizacionService = require('./organizacion.service');
const { ErrorApp } = require('../utils/errores');

// usuarioId (opcional): un borrador solo lo ve su docente
function obtenerCurso(id, usuarioId) {
  const curso = repo.obtenerDetalle(id);
  if (!curso || curso.activo !== 1) throw new ErrorApp('Curso no encontrado', 404);
  if (curso.estado === 'borrador' && curso.docenteId !== Number(usuarioId)) {
    throw new ErrorApp('Curso no encontrado', 404);
  }

  const { activo, ubicacionNombre, latitud, longitud, ...resto } = curso;
  return {
    ...resto,
    ubicacion: ubicacionNombre ? { nombre: ubicacionNombre, latitud, longitud } : null,
    cuposDisponibles: curso.cupoMaximo === null
      ? null
      : Math.max(0, curso.cupoMaximo - curso.totalEstudiantes),
    organizacion: organizacionService.obtenerOrganizacion(curso.id),
  };
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
