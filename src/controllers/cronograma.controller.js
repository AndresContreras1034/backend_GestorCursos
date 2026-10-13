const cronogramaService = require('../services/cronograma.service');

function crearSesion(req, res) {
  try {
    const { cursoId } = req.params;
    const nuevaSesion = cronogramaService.crearSesion(cursoId, req.body);
    res.status(201).json(nuevaSesion);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

function listarPorCurso(req, res) {
  try {
    const { cursoId } = req.params;
    const sesiones = cronogramaService.listarPorCurso(cursoId);
    res.status(200).json(sesiones);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

function actualizarSesion(req, res) {
  try {
    const { id } = req.params;
    const sesionActualizada = cronogramaService.actualizarSesion(id, req.body);
    res.status(200).json(sesionActualizada);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

function eliminarSesion(req, res) {
  try {
    const { id } = req.params;
    const { docenteId } = req.body;
    cronogramaService.eliminarSesion(id, docenteId);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

module.exports = { crearSesion, listarPorCurso, actualizarSesion, eliminarSesion };