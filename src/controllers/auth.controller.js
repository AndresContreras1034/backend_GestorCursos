const authService = require('../services/auth.service');

async function registrar(req, res) {
  try {
    const nuevoUsuario = await authService.registrar(req.body);
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const usuario = await authService.login(email, password);
    res.status(200).json(usuario);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
}

module.exports = { registrar, login };