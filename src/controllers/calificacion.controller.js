const calificacionService = require('../services/calificacion.service');

function manejarError(res, error) {
  res.status(error.status || 400).json({ error: error.message });
}

function consultarCalificaciones(req, res) {
  try {
    const { cursoId } = req.params;
    const { estudianteId } = req.query;
    res.status(200).json(calificacionService.consultarCalificaciones(cursoId, estudianteId));
  } catch (error) {
    manejarError(res, error);
  }
}

function consultarGpa(req, res) {
  try {
    const { cursoId } = req.params;
    const { estudianteId } = req.query;
    res.status(200).json(calificacionService.consultarGpa(cursoId, estudianteId));
  } catch (error) {
    manejarError(res, error);
  }
}

module.exports = { consultarCalificaciones, consultarGpa };
