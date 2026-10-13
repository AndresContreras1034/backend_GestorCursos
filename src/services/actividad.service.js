const actividadRepository = require('../repository/actividad.repository');
const cursoRepository = require('../repository/curso.repository');
const cronogramaRepository = require('../repository/cronograma.repository');
const usuarioRepository = require('../repository/usuario.repository');
const inscripcionRepository = require('../repository/inscripcion.repository');
const { ErrorApp } = require('../utils/errores');

const ESTADOS_CREACION = ['borrador', 'publicada'];

function obtenerCursoActivo(cursoId) {
  const curso = cursoRepository.buscarPorId(cursoId);
  if (!curso || curso.activo !== 1) throw new ErrorApp('Curso no encontrado', 404);
  return curso;
}

function aBooleanos(a) {
  return { ...a, permiteEntregaTardia: a.permiteEntregaTardia === 1 };
}

// ---------------- HU-011 ----------------
function crearActividad(cursoId, datos) {
  const {
    docenteId, titulo, instrucciones, fechaLimite,
    puntajeMaximo, permiteEntregaTardia, cronogramaId, estado,
  } = datos;

  if (!docenteId) throw new ErrorApp('docenteId es obligatorio');

  const curso = obtenerCursoActivo(cursoId);
  if (curso.docente_id !== Number(docenteId)) {
    throw new ErrorApp('No tienes permiso sobre este curso', 403);
  }

  if (typeof titulo !== 'string' || titulo.trim().length < 3 || titulo.trim().length > 150) {
    throw new ErrorApp('El título debe tener entre 3 y 150 caracteres');
  }
  if (typeof instrucciones !== 'string' || instrucciones.trim().length < 5) {
    throw new ErrorApp('Las instrucciones deben tener al menos 5 caracteres');
  }

  if (typeof fechaLimite !== 'string' || isNaN(new Date(fechaLimite).getTime())) {
    throw new ErrorApp('fechaLimite es obligatoria y debe ser una fecha válida (ISO 8601)');
  }
  const fechaLimiteDate = new Date(fechaLimite);
  if (fechaLimiteDate <= new Date()) {
    throw new ErrorApp('La fecha límite debe ser posterior a la fecha actual');
  }

  const puntaje = puntajeMaximo === undefined ? 5 : Number(puntajeMaximo);
  if (!Number.isFinite(puntaje) || puntaje <= 0 || puntaje > 100) {
    throw new ErrorApp('puntajeMaximo debe ser un número mayor a 0 y máximo 100');
  }

  if (permiteEntregaTardia !== undefined && typeof permiteEntregaTardia !== 'boolean') {
    throw new ErrorApp('permiteEntregaTardia debe ser true o false');
  }

  const estadoFinal = estado ?? 'publicada';
  if (!ESTADOS_CREACION.includes(estadoFinal)) {
    throw new ErrorApp('estado debe ser borrador o publicada');
  }

  // La sesión del cronograma es opcional, pero si viene debe ser de ESTE curso
  let cronogramaFinal = null;
  if (cronogramaId !== undefined && cronogramaId !== null) {
    const sesion = cronogramaRepository.buscarPorId(cronogramaId);
    if (!sesion || sesion.activo !== 1 || sesion.curso_id !== Number(cursoId)) {
      throw new ErrorApp('La sesión del cronograma no existe o no pertenece a este curso');
    }
    cronogramaFinal = sesion.id;
  }

  const creada = actividadRepository.crear({
    cursoId: Number(cursoId),
    cronogramaId: cronogramaFinal,
    creadorId: Number(docenteId),
    titulo: titulo.trim(),
    instrucciones: instrucciones.trim(),
    fechaLimite: fechaLimiteDate.toISOString(),
    puntajeMaximo: puntaje,
    permiteEntregaTardia: permiteEntregaTardia === true,
    estado: estadoFinal,
  });

  return aBooleanos(creada);
}

// ---------------- HU-012 ----------------
function listarCronogramaActividades(cursoId, usuarioId) {
  if (!usuarioId) throw new ErrorApp('usuarioId es obligatorio');

  const curso = obtenerCursoActivo(cursoId);
  const usuario = usuarioRepository.buscarPorId(usuarioId);
  if (!usuario || !usuarioRepository.estaActivo(usuarioId)) {
    throw new ErrorApp('Usuario no encontrado', 404);
  }

  if (usuario.rol === 'docente') {
    if (curso.docente_id !== usuario.id) {
      throw new ErrorApp('No tienes permiso sobre este curso', 403);
    }
    return actividadRepository.listarParaDocente(cursoId).map(aBooleanos);
  }

  // Estudiante: debe estar inscrito y activo en el curso
  const inscripcion = inscripcionRepository.buscarPorEstudianteYCurso(usuario.id, cursoId);
  if (!inscripcion) {
    throw new ErrorApp('Debes estar inscrito en el curso para ver sus actividades', 403);
  }

  const ahora = new Date();
  return actividadRepository.listarParaEstudiante(cursoId, usuario.id).map((a) => {
    const entregada = a.entregaId !== null;
    const vencida = new Date(a.fechaLimite) < ahora;

    let estadoEntrega;
    if (entregada) estadoEntrega = a.estadoEntrega;        // 'entregada' | 'calificada'
    else estadoEntrega = vencida ? 'vencida' : 'pendiente';

    return {
      id: a.id,
      cursoId: a.cursoId,
      cronogramaId: a.cronogramaId,
      titulo: a.titulo,
      instrucciones: a.instrucciones,
      fechaLimite: a.fechaLimite,
      puntajeMaximo: a.puntajeMaximo,
      permiteEntregaTardia: a.permiteEntregaTardia === 1,
      estadoActividad: a.estado,
      entregada,
      estadoEntrega,
      fechaEntrega: a.fechaEntrega,
      entregaTardia: entregada ? a.entregaTardia === 1 : null,
      nota: a.estadoEntrega === 'calificada' ? a.nota : null,
      // Para que el frontend sepa si muestra el botón de entregar (HU-013)
      puedeEntregar: !entregada && a.estado === 'publicada' && (!vencida || a.permiteEntregaTardia === 1),
    };
  });
}

module.exports = { crearActividad, listarCronogramaActividades };