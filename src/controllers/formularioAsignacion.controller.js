const service = require('../services/formularioAsignacion.service');
const manejar = require('../utils/manejar');

module.exports = {
  asignar: manejar(201, (req) => service.asignar(req.params.cursoId, req.body ?? {})),
  listarPorCurso: manejar(200, (req) =>
    service.listarPorCurso(req.params.cursoId, req.query.usuarioId)),
  responder: manejar(200, (req) =>
    service.obtenerParaResponder(req.params.id, req.query.estudianteId)),
  enviar: manejar(201, (req) => service.enviar(req.params.id, req.body ?? {})),
  miResultado: manejar(200, (req) =>
    service.consultarMiResultado(req.params.id, req.query.estudianteId)),
  resultados: manejar(200, (req) =>
    service.consultarResultados(req.params.id, req.query.docenteId)),
  envio: manejar(200, (req) =>
    service.consultarEnvioDocente(req.params.id, req.params.envioId, req.query.docenteId)),
  publicar: manejar(200, (req) =>
    service.publicarResultados(req.params.id, req.body?.docenteId)),
};
