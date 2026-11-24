const service = require('../services/formulario.service');
const manejar = require('../utils/manejar');

const docenteId = (req) => req.body?.docenteId ?? req.query.docenteId;

module.exports = {
  generarConIA: manejar(200, (req) => service.generarConIA(req.body ?? {})),
  crear: manejar(201, (req) => service.crearFormulario(req.body ?? {})),
  listar: manejar(200, (req) => service.listar(req.query.docenteId)),
  obtener: manejar(200, (req) => service.obtener(req.params.id, req.query.docenteId)),
  vistaPrevia: manejar(200, (req) => service.vistaPrevia(req.params.id, req.query.docenteId)),
  actualizar: manejar(200, (req) => service.actualizar(req.params.id, req.body ?? {})),
  eliminar: manejar(204, (req) => service.eliminar(req.params.id, docenteId(req))),
};
