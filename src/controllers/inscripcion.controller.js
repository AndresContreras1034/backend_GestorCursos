const inscripcionService = require('../services/inscripcion.service');

function manejarError(res, error) {
  res.status(error.status || 400).json({ error: error.message });
}

function inscribirse(req, res) {
  try {
    const nuevaInscripcion = inscripcionService.inscribirse(req.body);
    res.status(201).json(nuevaInscripcion);
  } catch (error) {
    manejarError(res, error);
  }
}

function listarPorEstudiante(req, res) {
  try {
    const { estudianteId } = req.params;
    const inscripciones = inscripcionService.listarPorEstudiante(estudianteId);
    res.status(200).json(inscripciones);
  } catch (error) {
    manejarError(res, error);
  }
}

function retirarInscripcion(req, res) {
  try {
    const { id } = req.params;
    const { estudianteId } = req.body;
    res.status(200).json(
      inscripcionService.retirarInscripcion(id, estudianteId)
    );
  } catch (error) {
    manejarError(res, error);
  }
}

module.exports = { inscribirse, listarPorEstudiante, retirarInscripcion };