const usuarioService = require('../services/usuario.service');

function obtenerPerfil(req, res) {
  try {
    const { id } = req.params;
    const usuario = usuarioService.obtenerPerfil(id);
    res.status(200).json(usuario);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

function actualizarPerfil(req, res) {
  try {
    const { id } = req.params;
    const usuarioActualizado = usuarioService.actualizarPerfil(id, req.body);
    res.status(200).json(usuarioActualizado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

function desactivarUsuario(req, res) {
  try {
    usuarioService.desactivarUsuario(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(error.status || 404).json({ error: error.message });
  }
}

module.exports = { obtenerPerfil, actualizarPerfil, desactivarUsuario };