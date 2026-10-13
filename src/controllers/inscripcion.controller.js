const inscripcionService = require('../services/inscripcion.service');

function inscribirse(req, res) {
  try {
    const nuevaInscripcion = inscripcionService.inscribirse(req.body);
    res.status(201).json(nuevaInscripcion);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

function listarPorEstudiante(req, res) {
  try {
    const { estudianteId } = req.params;
    const inscripciones = inscripcionService.listarPorEstudiante(estudianteId);
    res.status(200).json(inscripciones);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

module.exports = { inscribirse, listarPorEstudiante };