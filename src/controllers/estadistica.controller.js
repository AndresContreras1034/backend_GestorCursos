const service = require('../services/estadistica.service');

function manejar(res, fn) {
  try {
    res.status(200).json(fn());
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
}

const consultarProgreso = (req, res) =>
  manejar(res, () => service.consultarProgreso(req.params.cursoId, req.query.estudianteId));

const consultarEstadisticas = (req, res) =>
  manejar(res, () => service.consultarEstadisticas(req.params.cursoId, req.query.docenteId));

module.exports = { consultarProgreso, consultarEstadisticas };
