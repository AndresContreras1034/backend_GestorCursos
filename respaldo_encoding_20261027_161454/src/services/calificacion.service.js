const calificacionRepository = require('../repository/calificacion.repository');
const cursoRepository = require('../repository/curso.repository');
const usuarioRepository = require('../repository/usuario.repository');
const { ErrorApp } = require('../utils/errores');

const ESCALA_GPA = 5;
const MARGEN_RIESGO = 0.5;   // entre notaMinima y notaMinima + 0.5 el estudiante estÃ¡ "en riesgo"
const redondear = (n) => Math.round(n * 100) / 100;
const normalizar = (c) => (c.nota / c.puntajeMaximo) * ESCALA_GPA;

function validarEstudianteDelCurso(cursoId, estudianteId) {
  if (!estudianteId) throw new ErrorApp('estudianteId es obligatorio');
  if (!Number.isInteger(Number(cursoId)) || !Number.isInteger(Number(estudianteId))) {
    throw new ErrorApp('cursoId y estudianteId deben ser nÃºmeros enteros');
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

// ---------------- HU-016 ----------------
function consultarCalificaciones(cursoId, estudianteId) {
  const { curso, estudiante } = validarEstudianteDelCurso(cursoId, estudianteId);
  const cortes = calificacionRepository.obtenerCortes(curso.id);
  const calificaciones = calificacionRepository
    .listarCalificadas(curso.id, estudiante.id)
    .map((c) => ({
      ...c,
      esTardia: c.esTardia === 1,
      corteNumero: cortes.find((corte) => corte.id === c.corteId)?.numero ?? null,
    }));

  return {
    curso: { id: curso.id, nombre: curso.nombre },
    totalCalificadas: calificaciones.length,
    calificaciones,
  };
}

// ---------------- HU-017 ----------------
function promedio(valores) {
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

function estadoAcademico(gpa, notaMinima) {
  if (gpa === null) return 'sin_notas';
  if (gpa < notaMinima) return 'reprobando';
  if (gpa < notaMinima + MARGEN_RIESGO) return 'en_riesgo';
  return 'aprobando';
}

// Sin cortes (cursos antiguos): promedio simple de todas las notas
function calcularGpaSimple(calificaciones) {
  return calificaciones.length === 0 ? null : redondear(promedio(calificaciones.map(normalizar)));
}

// Con cortes: promedio por corte (0-5) ponderado por el porcentaje de cada corte.
// Un corte sin notas no cuenta todavÃ­a: el GPA se renormaliza sobre los cortes calificados.
function calcularGpaPonderado(cortes, calificaciones, evaluablesPorCorte) {
  const desglose = cortes.map((corte) => {
    const notas = calificaciones.filter((c) => c.corteId === corte.id).map(normalizar);
    return {
      corteId: corte.id,
      numero: corte.numero,
      fechaInicio: corte.fechaInicio,
      fechaFin: corte.fechaFin,
      porcentaje: corte.porcentaje,
      promedio: notas.length ? redondear(promedio(notas)) : null,
      actividadesCalificadas: notas.length,
      totalActividades: evaluablesPorCorte.get(corte.id) ?? 0,
      promedioSinRedondear: notas.length ? promedio(notas) : null,
    };
  });

  const calificados = desglose.filter((d) => d.promedioSinRedondear !== null);
  const pesoCalificado = calificados.reduce((a, d) => a + d.porcentaje, 0);
  const puntos = calificados.reduce((a, d) => a + d.promedioSinRedondear * (d.porcentaje / 100), 0);

  return {
    gpa: pesoCalificado > 0 ? redondear(puntos / (pesoCalificado / 100)) : null,
    puntosAcumulados: redondear(puntos),
    porcentajeCalificado: redondear(pesoCalificado),
    porcentajePendiente: redondear(100 - pesoCalificado),
    desglose: desglose.map(({ promedioSinRedondear, ...resto }) => resto),
  };
}

// QuÃ© promedio necesita en lo que falta para llegar a la nota mÃ­nima
function proyeccion(puntosAcumulados, porcentajePendiente, notaMinima) {
  if (porcentajePendiente <= 0) return null;
  const necesaria = (notaMinima - puntosAcumulados) / (porcentajePendiente / 100);
  return {
    notaNecesariaEnPendiente: necesaria <= 0 ? 0 : redondear(necesaria),
    yaAprobado: necesaria <= 0,
    aunPuedeAprobar: necesaria <= ESCALA_GPA,
  };
}

function consultarGpa(cursoId, estudianteId) {
  const { curso, estudiante } = validarEstudianteDelCurso(cursoId, estudianteId);
  const calificaciones = calificacionRepository.listarCalificadas(curso.id, estudiante.id);
  const totalActividades = calificacionRepository.contarActividadesEvaluables(curso.id);
  const cortes = calificacionRepository.obtenerCortes(curso.id);

  const base = {
    curso: { id: curso.id, nombre: curso.nombre },
    escala: ESCALA_GPA,
    notaMinima: curso.nota_minima,
    actividadesCalificadas: calificaciones.length,
    totalActividades,
  };

  let resultado;
  if (cortes.length === 0) {
    const gpa = calcularGpaSimple(calificaciones);
    resultado = { ...base, ponderado: false, gpa };
  } else {
    const evaluables = new Map(
      calificacionRepository.contarEvaluablesPorCorte(curso.id).map((r) => [r.corteId, r.total])
    );
    const p = calcularGpaPonderado(cortes, calificaciones, evaluables);
    resultado = {
      ...base,
      ponderado: true,
      gpa: p.gpa,
      porcentajeCalificado: p.porcentajeCalificado,
      porcentajePendiente: p.porcentajePendiente,
      cortes: p.desglose,
      proyeccion: p.gpa === null
        ? null
        : proyeccion(p.puntosAcumulados, p.porcentajePendiente, curso.nota_minima),
    };
  }

  resultado.estadoAcademico = estadoAcademico(resultado.gpa, curso.nota_minima);
  if (resultado.gpa === null) resultado.mensaje = 'AÃºn no tienes actividades calificadas en este curso';
  return resultado;
}

module.exports = { consultarCalificaciones, consultarGpa };
