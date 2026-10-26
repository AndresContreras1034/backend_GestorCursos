const ofertaService = require('../services/oferta.service');

function manejarError(res, error) {
  res.status(error.status || 400).json({ error: error.message });
}

function crearOferta(req, res) {
  try {
    const oferta = ofertaService.crearOferta(req.params.cursoId, req.body);
    res.status(201).json(oferta);
  } catch (error) {
    manejarError(res, error);
  }
}

function listarPorCurso(req, res) {
  try {
    res.status(200).json(ofertaService.listarPorCurso(req.params.cursoId));
  } catch (error) {
    manejarError(res, error);
  }
}

function actualizarOferta(req, res) {
  try {
    const oferta = ofertaService.actualizarOferta(req.params.id, req.body);
    res.status(200).json(oferta);
  } catch (error) {
    manejarError(res, error);
  }
}

function eliminarOferta(req, res) {
  try {
    ofertaService.eliminarOferta(
      req.params.id,
      req.body?.docenteId ?? req.query.docenteId
    );
    res.status(204).send();
  } catch (error) {
    manejarError(res, error);
  }
}

module.exports = { crearOferta, listarPorCurso, actualizarOferta, eliminarOferta };
