const repo = require('../repository/estadistica.repository');
const cursoRepository = require('../repository/curso.repository');
const usuarioRepository = require('../repository/usuario.repository');
const inscripcionRepository = require('../repository/inscripcion.repository');
const { ErrorApp } = require('../utils/errores');

const ESCALA = 5;
const NOTA_APROBACION = 3;
const redondear = (n) => Math.round(n * 100) / 100;
const promedio = (arr) => (arr.length ? redondear(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
const normalizar = (nota, maximo) => (nota / maximo) * ESCALA;

function cargarDatos(cursoId) {
  return {
    actividades: repo.actividades(cursoId),
    entregas: repo.entregas(cursoId),
  };
}

function calificadasNormalizadas(entregas) {
  return entregas
    .filter((entrega) => entrega.estado === 'calificada' && entrega.nota !== null)
    .map((entrega) => normalizar(entrega.nota, entrega.puntajeMaximo));
}

function progresoDe(estudianteId, datos) {
  const ahora = Date.now();
  const entregas = datos.entregas.filter((entrega) => entrega.estudianteId === estudianteId);
  const actividadesEntregadas = new Set(entregas.map((entrega) => entrega.actividadId));
  const vencidasSinEntrega = datos.actividades
    .filter((actividad) => !actividadesEntregadas.has(actividad.id)
      && new Date(actividad.fechaLimite).getTime() < ahora).length;
  const notasActividades = calificadasNormalizadas(entregas);
  const totalActividades = datos.actividades.length;

  return {
    actividades: {
      total: totalActividades,
      entregadas: actividadesEntregadas.size,
      calificadas: notasActividades.length,
      pendientes: totalActividades - actividadesEntregadas.size - vencidasSinEntrega,
      vencidasSinEntrega,
    },
    porcentajeAvance: totalActividades
      ? redondear((actividadesEntregadas.size / totalActividades) * 100)
      : 0,
    promedioActividades: promedio(notasActividades),
    promedioGeneral: promedio(notasActividades),
    escala: ESCALA,
  };
}

function obtenerCursoActivo(cursoId) {
  const curso = cursoRepository.buscarPorId(cursoId);
  if (!curso || curso.activo !== 1) throw new ErrorApp('Curso no encontrado', 404);
  return curso;
}

function consultarProgreso(cursoId, estudianteId) {
  if (!estudianteId) throw new ErrorApp('estudianteId es obligatorio');
  const curso = obtenerCursoActivo(cursoId);
  const estudiante = usuarioRepository.buscarPorId(estudianteId);
  if (!estudiante || !usuarioRepository.estaActivo(estudiante.id)) {
    throw new ErrorApp('Estudiante no encontrado', 404);
  }
  if (estudiante.rol !== 'estudiante') {
    throw new ErrorApp('Solo un estudiante puede consultar su progreso', 403);
  }
  if (!inscripcionRepository.buscarPorEstudianteYCurso(estudiante.id, curso.id)) {
    throw new ErrorApp('Debes estar inscrito en el curso para ver tu progreso', 403);
  }

  const datos = cargarDatos(curso.id);
  const ahora = Date.now();
  const detalleActividades = datos.actividades.map((actividad) => {
    const entrega = datos.entregas.find((item) =>
      item.actividadId === actividad.id && item.estudianteId === estudiante.id);
    let estado;
    if (entrega) estado = entrega.estado;
    else estado = new Date(actividad.fechaLimite).getTime() < ahora ? 'vencida' : 'pendiente';
    return {
      actividadId: actividad.id,
      titulo: actividad.titulo,
      fechaLimite: actividad.fechaLimite,
      estado,
      nota: entrega && entrega.estado === 'calificada' ? entrega.nota : null,
      puntajeMaximo: actividad.puntajeMaximo,
    };
  });

  return {
    curso: { id: curso.id, nombre: curso.nombre },
    estudiante: { id: estudiante.id, nombre: estudiante.nombre, apellido: estudiante.apellido },
    progreso: progresoDe(estudiante.id, datos),
    detalleActividades,
  };
}

function consultarEstadisticas(cursoId, docenteId) {
  if (!docenteId) throw new ErrorApp('docenteId es obligatorio');
  const curso = obtenerCursoActivo(cursoId);
  if (curso.docente_id !== Number(docenteId)) {
    throw new ErrorApp('No tienes permiso sobre este curso', 403);
  }

  const datos = cargarDatos(curso.id);
  const estudiantes = repo.estudiantes(curso.id);
  const total = estudiantes.length;
  const idsInscritos = new Set(estudiantes.map((estudiante) => estudiante.estudianteId));

  const porActividad = datos.actividades.map((actividad) => {
    const entregas = datos.entregas.filter((entrega) =>
      entrega.actividadId === actividad.id && idsInscritos.has(entrega.estudianteId));
    const notas = calificadasNormalizadas(entregas).map(redondear);
    return {
      actividadId: actividad.id,
      titulo: actividad.titulo,
      entregas: entregas.length,
      sinEntregar: total - entregas.length,
      porcentajeEntrega: total ? redondear((entregas.length / total) * 100) : 0,
      entregasTardias: entregas.filter((entrega) => entrega.esTardia === 1).length,
      calificadas: notas.length,
      promedio: promedio(notas),
      notaMaxima: notas.length ? Math.max(...notas) : null,
      notaMinima: notas.length ? Math.min(...notas) : null,
    };
  });

  const listaEstudiantes = estudiantes.map((estudiante) => ({
    ...estudiante,
    progreso: progresoDe(estudiante.estudianteId, datos),
  }));
  const promedios = listaEstudiantes
    .map((estudiante) => estudiante.progreso.promedioGeneral)
    .filter((nota) => nota !== null);

  const distribucion = { '0-0.99': 0, '1-1.99': 0, '2-2.99': 0, '3-3.99': 0, '4-5': 0 };
  const claves = Object.keys(distribucion);
  promedios.forEach((nota) => {
    distribucion[claves[Math.min(Math.floor(nota), 4)]] += 1;
  });

  return {
    curso: { id: curso.id, nombre: curso.nombre },
    escala: ESCALA,
    notaAprobacion: NOTA_APROBACION,
    resumen: {
      totalEstudiantes: total,
      totalActividades: datos.actividades.length,
      promedioGeneralCurso: promedio(promedios),
      avancePromedio: promedio(listaEstudiantes.map((estudiante) => estudiante.progreso.porcentajeAvance)),
      aprobados: promedios.filter((nota) => nota >= NOTA_APROBACION).length,
      reprobados: promedios.filter((nota) => nota < NOTA_APROBACION).length,
      sinCalificar: total - promedios.length,
    },
    distribucionNotas: distribucion,
    porActividad,
    estudiantes: listaEstudiantes,
  };
}

module.exports = { consultarProgreso, consultarEstadisticas };
