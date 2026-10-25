const service = require('../services/actividadGestion.service');

function manejarError(res, error) {
  res.status(error.status || 400).json({ error: error.message });
}

function actualizarActividad(req, res) {
  try {
    const { cursoId, actividadId } = req.params;
    res.status(200).json(service.actualizarActividad(cursoId, actividadId, req.body ?? {}));
  } catch (error) {
    manejarError(res, error);
  }
}

function eliminarActividad(req, res) {
  try {
    const { cursoId, actividadId } = req.params;
    const docenteId = req.body?.docenteId ?? req.query.docenteId;
    res.status(200).json(service.eliminarActividad(cursoId, actividadId, docenteId));
  } catch (error) {
    manejarError(res, error);
  }
}

module.exports = { actualizarActividad, eliminarActividad };
