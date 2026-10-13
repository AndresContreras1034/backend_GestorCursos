const entregaRepository = require('../repository/entrega.repository');
const actividadRepository = require('../repository/actividad.repository');
const cursoRepository = require('../repository/curso.repository');
const usuarioRepository = require('../repository/usuario.repository');
const inscripcionRepository = require('../repository/inscripcion.repository');
const { ErrorApp } = require('../utils/errores');

const MAX_BYTES = 10 * 1024 * 1024;
const TIPOS_PERMITIDOS = [
  'image/png',
  'image/jpeg',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function validarArchivo(archivo, archivoNombre) {
  if (typeof archivo !== 'string') throw new ErrorApp('El archivo es obligatorio');
  if (
    typeof archivoNombre !== 'string'
    || archivoNombre.trim().length < 1
    || archivoNombre.trim().length > 150
  ) {
    throw new ErrorApp('archivoNombre es obligatorio (máximo 150 caracteres)');
  }

  const cabecera = /^data:([^;,]+);base64,/.exec(archivo);
  if (!cabecera) throw new ErrorApp('El archivo debe estar en base64 (data:<tipo>;base64,...)');

  const tipo = cabecera[1].toLowerCase();
  if (!TIPOS_PERMITIDOS.includes(tipo)) throw new ErrorApp('Tipo de archivo no soportado');

  const base64 = archivo.slice(cabecera[0].length);
  const relleno = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const tamano = Math.floor((base64.length * 3) / 4) - relleno;

  if (tamano <= 0) throw new ErrorApp('El archivo está vacío');
  if (tamano > MAX_BYTES) throw new ErrorApp('El archivo supera el máximo de 10 MB');

  return { tipo, tamano, nombre: archivoNombre.trim() };
}

const aBooleanos = (e) => ({ ...e, esTardia: e.esTardia === 1 });

function validarDocenteDeActividad(cursoId, actividadId, docenteId) {
  if (!docenteId) throw new ErrorApp('docenteId es obligatorio');

  const curso = cursoRepository.buscarPorId(cursoId);
  if (!curso || curso.activo !== 1) throw new ErrorApp('Curso no encontrado', 404);

  const docente = usuarioRepository.buscarPorId(docenteId);
  if (!docente || !usuarioRepository.estaActivo(docente.id)) {
    throw new ErrorApp('Docente no encontrado', 404);
  }
  if (docente.rol !== 'docente') {
    throw new ErrorApp('Solo un docente puede consultar las entregas', 403);
  }
  if (curso.docente_id !== docente.id) {
    throw new ErrorApp('No tienes permiso sobre este curso', 403);
  }

  const actividad = actividadRepository.buscarPorId(actividadId);
  if (!actividad || actividad.cursoId !== Number(cursoId)) {
    throw new ErrorApp('Actividad no encontrada', 404);
  }

  return actividad;
}

function listarEntregasDeActividad(cursoId, actividadId, docenteId) {
  const actividad = validarDocenteDeActividad(cursoId, actividadId, docenteId);
  const estudiantes = entregaRepository.listarEstudiantesConEntrega(cursoId, actividad.id);
  const entregaron = estudiantes
    .filter((estudiante) => estudiante.entregaId !== null)
    .map((estudiante) => aBooleanos(estudiante));
  const noEntregaron = estudiantes
    .filter((estudiante) => estudiante.entregaId === null)
    .map(({ estudianteId, nombre, apellido, email }) => ({
      estudianteId,
      nombre,
      apellido,
      email,
    }));

  return {
    actividad: {
      id: actividad.id,
      titulo: actividad.titulo,
      fechaLimite: actividad.fechaLimite,
      puntajeMaximo: actividad.puntajeMaximo,
    },
    resumen: {
      totalEstudiantes: estudiantes.length,
      entregaron: entregaron.length,
      noEntregaron: noEntregaron.length,
      pendientesDeRevision: entregaron.filter((entrega) => entrega.estado === 'entregada').length,
    },
    entregaron,
    noEntregaron,
  };
}

function obtenerArchivoEntrega(cursoId, actividadId, entregaId, docenteId) {
  validarDocenteDeActividad(cursoId, actividadId, docenteId);

  const entrega = entregaRepository.obtenerArchivo(entregaId);
  if (!entrega || entrega.actividadId !== Number(actividadId)) {
    throw new ErrorApp('Entrega no encontrada', 404);
  }
  if (typeof entrega.archivo !== 'string' || !entrega.archivo.includes(',')) {
    throw new ErrorApp('Archivo no encontrado', 404);
  }

  const [, base64] = entrega.archivo.split(',', 2);
  return {
    buffer: Buffer.from(base64, 'base64'),
    tipo: entrega.archivoTipo,
    nombre: entrega.archivoNombre,
  };
}

function entregar(cursoId, actividadId, datos) {
  const { estudianteId, archivo, archivoNombre, comentario } = datos;
  if (!estudianteId) throw new ErrorApp('estudianteId es obligatorio');

  const curso = cursoRepository.buscarPorId(cursoId);
  if (!curso || curso.activo !== 1) throw new ErrorApp('Curso no encontrado', 404);

  const actividad = actividadRepository.buscarPorId(actividadId);
  if (!actividad || actividad.cursoId !== Number(cursoId)) {
    throw new ErrorApp('Actividad no encontrada', 404);
  }

  const estudiante = usuarioRepository.buscarPorId(estudianteId);
  if (!estudiante || !usuarioRepository.estaActivo(estudiante.id)) {
    throw new ErrorApp('Estudiante no encontrado', 404);
  }
  if (estudiante.rol !== 'estudiante') {
    throw new ErrorApp('Solo un estudiante puede entregar actividades', 403);
  }
  if (!inscripcionRepository.buscarPorEstudianteYCurso(estudiante.id, cursoId)) {
    throw new ErrorApp('Debes estar inscrito en el curso para entregar', 403);
  }
  if (actividad.estado !== 'publicada') {
    throw new ErrorApp('La actividad no está disponible para entregas', 403);
  }

  if (comentario !== undefined && comentario !== null
    && (typeof comentario !== 'string' || comentario.length > 1000)) {
    throw new ErrorApp('El comentario debe ser texto de máximo 1000 caracteres');
  }

  const ahora = new Date();
  const vencida = new Date(actividad.fechaLimite) < ahora;
  if (vencida && actividad.permiteEntregaTardia !== 1) {
    throw new ErrorApp('El plazo de entrega de esta actividad ya venció', 403);
  }

  const file = validarArchivo(archivo, archivoNombre);
  const datosEntrega = {
    actividadId: actividad.id,
    estudianteId: estudiante.id,
    comentario: comentario?.trim() || null,
    archivo,
    archivoNombre: file.nombre,
    archivoTipo: file.tipo,
    archivoTamano: file.tamano,
    fechaEntrega: ahora.toISOString(),
    esTardia: vencida,
  };

  const existente = entregaRepository.buscarPorActividadYEstudiante(actividad.id, estudiante.id);
  if (existente) {
    if (existente.estado === 'calificada') {
      throw new ErrorApp('La entrega ya fue calificada y no se puede reemplazar', 409);
    }
    if (actividad.permiteReemplazoEntrega !== 1) {
      throw new ErrorApp('Ya entregaste esta actividad y el docente no permite reemplazarla', 409);
    }
    return {
      entrega: aBooleanos(entregaRepository.reemplazar(existente.id, datosEntrega)),
      reemplazada: true,
    };
  }

  return {
    entrega: aBooleanos(entregaRepository.crear(datosEntrega)),
    reemplazada: false,
  };
}

module.exports = { entregar, listarEntregasDeActividad, obtenerArchivoEntrega };
