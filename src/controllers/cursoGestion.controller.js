const service = require('../services/cursoGestion.service');

function manejarError(res, error) {
  res.status(error.status || 400).json({ error: error.message });
}

function obtenerCurso(req, res) {
  try {
    res.status(200).json(service.obtenerCurso(req.params.id, req.query.usuarioId));
  } catch (error) {
    manejarError(res, error);
  }
}

function eliminarCurso(req, res) {
  try {
    const docenteId = req.body?.docenteId ?? req.query.docenteId;
    res.status(200).json(service.eliminarCurso(req.params.id, docenteId));
  } catch (error) {
    manejarError(res, error);
  }
}

module.exports = { obtenerCurso, eliminarCurso };
