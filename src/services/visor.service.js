const visorRepository = require('../repository/visor.repository');
const usuarioRepository = require('../repository/usuario.repository');
const inscripcionRepository = require('../repository/inscripcion.repository');
const { ErrorApp } = require('../utils/errores');

// Tipos que es seguro mostrar dentro del navegador.
// SVG y HTML NO están: pueden ejecutar scripts, esos siempre se descargan.
const TIPOS_INLINE = new Set([
  'application/pdf',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/mp4', 'audio/webm',
  'text/plain',
]);

function decodificar(archivo) {
  const coincidencia = /^data:[^,]*;base64,(.*)$/s.exec(archivo);
  return Buffer.from(coincidencia ? coincidencia[1] : archivo, 'base64');
}

function obtenerArchivoRecurso(recursoId, usuarioId) {
  if (!usuarioId) throw new ErrorApp('usuarioId es obligatorio');

  const recurso = visorRepository.buscarRecursoConArchivo(recursoId);
  if (!recurso || recurso.activo !== 1 || !recurso.archivo) {
    throw new ErrorApp('Archivo no encontrado', 404);
  }

  const usuario = usuarioRepository.buscarPorId(usuarioId);
  if (!usuario || !usuarioRepository.estaActivo(usuarioId)) {
    throw new ErrorApp('Usuario no encontrado', 404);
  }

  const esDocenteDueno = usuario.rol === 'docente' && usuario.id === recurso.docenteId;
  const esEstudianteInscrito =
    usuario.rol === 'estudiante' &&
    !!inscripcionRepository.buscarPorEstudianteYCurso(usuario.id, recurso.cursoId);

  if (!esDocenteDueno && !esEstudianteInscrito) {
    throw new ErrorApp('No tienes permiso para ver este archivo', 403);
  }

  return {
    buffer: decodificar(recurso.archivo),
    tipo: recurso.tipo,
    nombre: recurso.nombre,
    inline: TIPOS_INLINE.has(recurso.tipo),
  };
}

module.exports = { obtenerArchivoRecurso };