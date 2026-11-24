const cursoService = require('../services/curso.service');

function manejarError(res, error) {
  res.status(error.status || 400).json({ error: error.message });
}

function crearCurso(req, res) {
  try {
    res.status(201).json(cursoService.crearCurso(req.body));
  } catch (error) {
    manejarError(res, error);
  }
}

function listarCursos(req, res) {
  try {
    const { busqueda, docenteId, estado } = req.query;
    res.status(200).json(cursoService.listarCursos(busqueda, { docenteId, estado }));
  } catch (error) {
    manejarError(res, error);
  }
}

function actualizarCurso(req, res) {
  try {
    res.status(200).json(cursoService.actualizarCurso(req.params.id, req.body));
  } catch (error) {
    manejarError(res, error);
  }
}

function cambiarEstado(req, res) {
  try {
    res.status(200).json(cursoService.cambiarEstado(req.params.id, req.body));
  } catch (error) {
    manejarError(res, error);
  }
}

module.exports = { crearCurso, listarCursos, actualizarCurso, cambiarEstado };
