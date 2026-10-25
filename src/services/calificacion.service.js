const calificacionRepository = require('../repository/calificacion.repository');
const cursoRepository = require('../repository/curso.repository');
const usuarioRepository = require('../repository/usuario.repository');
const { ErrorApp } = require('../utils/errores');

const ESCALA_GPA = 5;
const redondear = (n) => Math.round(n * 100) / 100;

function validarEstudianteDelCurso(cursoId, estudianteId) {
  if (!estudianteId) throw new ErrorApp('estudianteId es obligatorio');
  if (!Number.isInteger(Number(cursoId)) || !Number.isInteger(Number(estudianteId))) {
    throw new ErrorApp('cursoId y estudianteId deben ser números enteros');
  }

  const curso = cursoRepository.buscarPorId(Number(cursoId));
  if (!curso || curso.activo !== 1) throw new ErrorApp('Curso no encontrado', 404);

  const estudiante = usuarioRepository.buscarPorId(Number(estudianteId));
  if (!estudiante || !usuarioRepository.estaActivo(estudiante.id)) {
    throw new ErrorApp('Estudiante no encontrado', 404);
  }
  if (estudiante.rol !== 'estudiante') {
    throw new ErrorApp('Solo un estudiante puede consultar sus calificaciones', 403);
  }
  if (!calificacionRepository.tieneAccesoAlCurso(estudiante.id, curso.id)) {
    throw new ErrorApp('Debes estar inscrito en el curso para ver tus calificaciones', 403);
  }

  return { curso, estudiante };
}

function consultarCalificaciones(cursoId, estudianteId) {
  const { curso, estudiante } = validarEstudianteDelCurso(cursoId, estudianteId);
  const calificaciones = calificacionRepository
    .listarCalificadas(curso.id, estudiante.id)
    .map((calificacion) => ({
      ...calificacion,
      esTardia: calificacion.esTardia === 1,
    }));

  return {
    curso: { id: curso.id, nombre: curso.nombre },
    totalCalificadas: calificaciones.length,
    calificaciones,
  };
}

function calcularResumen(calificaciones) {
  if (calificaciones.length === 0) return null;
  const suma = calificaciones.reduce(
    (acc, calificacion) => (
      acc + (calificacion.nota / calificacion.puntajeMaximo) * ESCALA_GPA
    ),
    0
  );
  return redondear(suma / calificaciones.length);
}

function consultarGpa(cursoId, estudianteId) {
  const { curso, estudiante } = validarEstudianteDelCurso(cursoId, estudianteId);
  const calificaciones = calificacionRepository.listarCalificadas(curso.id, estudiante.id);
  const totalActividades = calificacionRepository.contarActividadesEvaluables(curso.id);

  return {
    curso: { id: curso.id, nombre: curso.nombre },
    gpa: calcularResumen(calificaciones),
    escala: ESCALA_GPA,
    actividadesCalificadas: calificaciones.length,
    totalActividades,
    mensaje: calificaciones.length === 0
      ? 'Aún no tienes actividades calificadas en este curso'
      : undefined,
  };
}

module.exports = { consultarCalificaciones, consultarGpa };
