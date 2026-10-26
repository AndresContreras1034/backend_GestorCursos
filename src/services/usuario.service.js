const usuarioRepository = require('../repository/usuario.repository');
const { ErrorApp } = require('../utils/errores');

function obtenerPerfil(id) {
  const usuario = usuarioRepository.buscarPorId(id);
  if (!usuario || !usuarioRepository.estaActivo(id)) {
    throw new Error('Usuario no encontrado');
  }
  return usuario;
}

function actualizarPerfil(id, datos) {
  const { nombre, email, cedula, fechaNacimiento, fotoPerfil } = datos;

  if (!nombre && !email && !cedula && !fechaNacimiento && !fotoPerfil) {
    throw new Error('Debe enviar al menos un campo para actualizar');
  }

  const usuario = usuarioRepository.buscarPorId(id);
  if (!usuario || !usuarioRepository.estaActivo(id)) {
    throw new Error('Usuario no encontrado');
  }

  if (cedula) {
    const existente = usuarioRepository.buscarPorCedula(cedula);
    if (existente && existente.id !== Number(id)) {
      throw new Error('La cédula ya está registrada por otro usuario');
    }
  }

  if (fechaNacimiento) {
    const fecha = new Date(fechaNacimiento);
    if (isNaN(fecha.getTime())) {
      throw new Error('Fecha de nacimiento inválida');
    }
    const edad = new Date().getFullYear() - fecha.getFullYear();
    if (edad < 15 || edad > 100) {
      throw new Error('Fecha de nacimiento fuera de rango permitido');
    }
  }

  if (fotoPerfil && !fotoPerfil.startsWith('data:image')) {
    throw new Error('La foto de perfil debe estar en formato base64 (data:image/...)');
  }

  const actualizado = usuarioRepository.actualizar(id, {
    nombre,
    email,
    cedula,
    fechaNacimiento,
    fotoPerfil,
  });

  return actualizado;
}

function desactivarUsuario(id) {
  const usuario = usuarioRepository.buscarPorId(id);
  if (!usuario || !usuarioRepository.estaActivo(id)) {
    throw new ErrorApp('Usuario no encontrado o ya desactivado', 404);
  }
  usuarioRepository.desactivar(id);
}

module.exports = { obtenerPerfil, actualizarPerfil, desactivarUsuario };