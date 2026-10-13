const recursoService = require('../services/recurso.service');

function publicarRecurso(req, res) {
  try {
    const nuevoRecurso = recursoService.publicarRecurso(req.body);
    res.status(201).json(nuevoRecurso);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

function listarPorCurso(req, res) {
  try {
    const { cursoId } = req.params;
    const { estudianteId } = req.query;
    const recursos = recursoService.listarPorCurso(cursoId, estudianteId);
    res.status(200).json(recursos);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

function actualizarRecurso(req, res) {
  try {
    const { id } = req.params;
    const recursoActualizado = recursoService.actualizarRecurso(id, req.body);
    res.status(200).json(recursoActualizado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

function eliminarRecurso(req, res) {
  try {
    const { id } = req.params;
    const { docenteId } = req.body;
    const recursoEliminado = recursoService.eliminarRecurso(id, docenteId);
    res.status(200).json(recursoEliminado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

module.exports = {
  publicarRecurso,
  listarPorCurso,
  actualizarRecurso,
  eliminarRecurso,
};