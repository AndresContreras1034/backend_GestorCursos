const service = require('../services/matricula.service');

function manejar(res, fn, estado = 200) {
  try {
    res.status(estado).json(fn());
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
}

const docenteDe = (req) => req.body?.docenteId ?? req.query.docenteId;
const estudianteDe = (req) => req.body?.estudianteId ?? req.query.estudianteId;

module.exports = {
  matricular: (req, res) =>
    manejar(res, () => service.matricularEstudiante(req.params.cursoId, req.body), 201),
  matricularLote: (req, res) =>
    manejar(res, () => service.matricularLote(req.params.cursoId, req.body), 201),
  consultarMatriculas: (req, res) =>
    manejar(res, () => service.consultarMatriculas(req.params.cursoId, req.query.docenteId)),
  retirar: (req, res) =>
    manejar(res, () => service.retirarEstudiante(req.params.cursoId, req.params.inscripcionId, docenteDe(req))),
  unirseEspera: (req, res) =>
    manejar(res, () => service.unirseListaEspera(req.params.cursoId, req.body), 201),
  posicionEspera: (req, res) =>
    manejar(res, () => service.consultarPosicionEspera(req.params.cursoId, req.query.estudianteId)),
  salirEspera: (req, res) =>
    manejar(res, () => service.salirListaEspera(req.params.cursoId, estudianteDe(req))),
};
