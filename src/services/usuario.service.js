const usuarioRepository = require('../repository/usuario.repository');

function obtenerPerfil(id) {
  const usuario = usuarioRepository.buscarPorId(id);
  if (!usuario) {
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
  if (!usuario) {
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

module.exports = { obtenerPerfil, actualizarPerfil };