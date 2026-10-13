const cursoRepository = require('../repository/curso.repository');

function crearCurso(datos) {
  const { nombre, descripcion, docenteId, imagenCurso } = datos;

  if (!nombre || !descripcion || !docenteId) {
    throw new Error('Nombre, descripción y docente son obligatorios');
  }

  if (imagenCurso && !imagenCurso.startsWith('data:image')) {
    throw new Error(
      'La imagen del curso debe estar en formato base64 (data:image/...)'
    );
  }

  return cursoRepository.crear({
    nombre,
    descripcion,
    docenteId,
    imagenCurso,
  });
}

function listarCursos(busqueda) {
  return cursoRepository.listarTodos(busqueda);
}

function actualizarCurso(id, datos) {
  const { nombre, descripcion, imagenCurso, docenteId } = datos;

  if (!nombre && !descripcion && !imagenCurso) {
    throw new Error('Debe enviar al menos un campo para actualizar');
  }

  const curso = cursoRepository.buscarPorId(id);

  if (!curso) {
    throw new Error('Curso no encontrado');
  }

  if (!docenteId) {
    throw new Error('docenteId es obligatorio para validar el curso');
  }

  if (curso.docente_id !== Number(docenteId)) {
    throw new Error('No tienes permiso para editar este curso');
  }

  if (imagenCurso && !imagenCurso.startsWith('data:image')) {
    throw new Error(
      'La imagen del curso debe estar en formato base64 (data:image/...)'
    );
  }

  const actualizado = cursoRepository.actualizar(id, {
    nombre,
    descripcion,
    imagenCurso,
  });

  return actualizado;
}

module.exports = { crearCurso, listarCursos, actualizarCurso };