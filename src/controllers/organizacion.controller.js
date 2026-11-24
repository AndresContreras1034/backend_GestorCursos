const service = require('../services/organizacion.service');

function manejar(res, fn, estado = 200) {
  try {
    res.status(estado).json(fn());
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
}

const docenteDe = (req) => req.body?.docenteId ?? req.query.docenteId;

module.exports = {
  consultarOrganizacion: (req, res) =>
    manejar(res, () => service.consultarOrganizacion(req.params.cursoId)),
  actualizarCortes: (req, res) =>
    manejar(res, () => service.actualizarCortes(req.params.cursoId, req.body)),
  crearTematica: (req, res) =>
    manejar(res, () => service.crearTematica(req.params.cursoId, req.body), 201),
  actualizarTematica: (req, res) =>
    manejar(res, () => service.actualizarTematica(req.params.cursoId, req.params.tematicaId, req.body)),
  eliminarTematica: (req, res) =>
    manejar(res, () => service.eliminarTematica(req.params.cursoId, req.params.tematicaId, docenteDe(req))),
  actualizarHorarios: (req, res) =>
    manejar(res, () => service.actualizarHorarios(req.params.cursoId, req.body)),
};
