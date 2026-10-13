const recursoRepository = require('../repository/recurso.repository');

const cursoRepository = require('../repository/curso.repository');

const inscripcionRepository = require('../repository/inscripcion.repository');

const usuarioRepository = require('../repository/usuario.repository');

const TIPOS_PERMITIDOS = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
];

function extraerTipoBase64(archivo) {
  const match = /^data:([^;]+);base64,/.exec(archivo);
  return match ? match[1] : null;
}

function validarArchivo(archivo, archivoNombre) {
  const archivoTipo = extraerTipoBase64(archivo);

  if (!archivoTipo || !TIPOS_PERMITIDOS.includes(archivoTipo)) {
    throw new Error(
      'Tipo de archivo no soportado. Permitidos: imágenes, PDF y ZIP'
    );
  }

  if (!archivoNombre) {
    throw new Error(
      'archivoNombre es obligatorio cuando se envía un archivo'
    );
  }

  return archivoTipo;
}

function publicarRecurso(datos) {
  const {
    cursoId,
    nombre,
    descripcion,
    enlace,
    archivo,
    archivoNombre,
    docenteId,
  } = datos;

  if (!cursoId || !nombre || !docenteId) {
    throw new Error('cursoId, nombre y docenteId son obligatorios');
  }

  if (!enlace && !archivo) {
    throw new Error('Debe enviar un enlace o un archivo');
  }

  let archivoTipo = null;

  if (archivo) {
    archivoTipo = validarArchivo(archivo, archivoNombre);
  }

  const curso = cursoRepository.buscarPorId(cursoId);

  if (!curso || curso.activo !== 1) {
    throw new Error('Curso no encontrado');
  }

  if (curso.docente_id !== Number(docenteId)) {
    throw new Error(
      'No tienes permiso para publicar recursos en este curso'
    );
  }

  return recursoRepository.crear({
    cursoId,
    nombre,
    descripcion,
    enlace,
    archivo,
    archivoNombre,
    archivoTipo,
  });
}

function listarPorCurso(cursoId, estudianteId) {
  if (!cursoId) {
    throw new Error('cursoId es obligatorio');
  }

  if (!estudianteId) {
    throw new Error('estudianteId es obligatorio');
  }

  const curso = cursoRepository.buscarPorId(cursoId);

  if (!curso || curso.activo !== 1) {
    throw new Error('Curso no encontrado');
  }

  const usuario = usuarioRepository.buscarPorId(estudianteId);

  if (!usuario || !usuarioRepository.estaActivo(estudianteId)) {
    throw new Error('Usuario no encontrado');
  }

  // Docente: solo el dueño del curso, sin exigir inscripción
  if (usuario.rol === 'docente') {
    if (curso.docente_id !== usuario.id) {
      throw new Error('No tienes permiso sobre este curso');
    }

    return recursoRepository.listarPorCurso(cursoId);
  }

  // Estudiante: debe estar inscrito
  const inscripcion = inscripcionRepository.buscarPorEstudianteYCurso(
    estudianteId,
    cursoId
  );

  if (!inscripcion) {
    throw new Error('No estás inscrito en este curso');
  }

  return recursoRepository.listarPorCurso(cursoId);
}

function actualizarRecurso(id, datos) {
  const {
    nombre,
    descripcion,
    enlace,
    archivo,
    archivoNombre,
    docenteId,
  } = datos;

  if (!docenteId) {
    throw new Error('docenteId es obligatorio para validar el recurso');
  }

  if (
    nombre === undefined &&
    descripcion === undefined &&
    enlace === undefined &&
    archivo === undefined
  ) {
    throw new Error('Debe enviar al menos un campo para actualizar');
  }

  const recurso = recursoRepository.buscarPorId(id);

  if (!recurso || recurso.activo !== 1) {
    throw new Error('Recurso no encontrado');
  }

  const curso = cursoRepository.buscarPorId(recurso.curso_id);

  if (!curso) {
    throw new Error('Curso no encontrado');
  }

  if (curso.docente_id !== Number(docenteId)) {
    throw new Error('No tienes permiso para editar este recurso');
  }

  let archivoTipo;

  if (archivo) {
    archivoTipo = validarArchivo(
      archivo,
      archivoNombre ?? recurso.archivo_nombre
    );
  }

  return recursoRepository.actualizar(id, {
    nombre,
    descripcion,
    enlace,
    archivo,
    archivoNombre,
    archivoTipo,
  });
}

function eliminarRecurso(id, docenteId) {
  if (!docenteId) {
    throw new Error('docenteId es obligatorio para validar el recurso');
  }

  const recurso = recursoRepository.buscarPorId(id);

  if (!recurso || recurso.activo !== 1) {
    throw new Error('Recurso no encontrado');
  }

  const curso = cursoRepository.buscarPorId(recurso.curso_id);

  if (!curso) {
    throw new Error('Curso no encontrado');
  }

  if (curso.docente_id !== Number(docenteId)) {
    throw new Error('No tienes permiso para eliminar este recurso');
  }

  return recursoRepository.eliminar(id);
}

module.exports = {
  publicarRecurso,
  listarPorCurso,
  actualizarRecurso,
  eliminarRecurso,
};