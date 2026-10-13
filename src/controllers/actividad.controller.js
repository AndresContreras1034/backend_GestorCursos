const actividadService = require('../services/actividad.service');

function manejarError(res, error) {
  res.status(error.status || 400).json({ error: error.message });
}

function crearActividad(req, res) {
  try {
    const { cursoId } = req.params;
    const actividad = actividadService.crearActividad(cursoId, req.body);
    res.status(201).json(actividad);
  } catch (error) {
    manejarError(res, error);
  }
}

function listarPorCurso(req, res) {
  try {
    const { cursoId } = req.params;
    const { usuarioId } = req.query;
    const actividades = actividadService.listarCronogramaActividades(cursoId, usuarioId);
    res.status(200).json(actividades);
  } catch (error) {
    manejarError(res, error);
  }
}

function actualizarConfigEntrega(req, res) {
  try {
    const { cursoId, actividadId } = req.params;
    const actividad = actividadService.actualizarConfigEntrega(cursoId, actividadId, req.body);
    res.status(200).json(actividad);
  } catch (error) {
    manejarError(res, error);
  }
}

module.exports = { crearActividad, listarPorCurso, actualizarConfigEntrega };