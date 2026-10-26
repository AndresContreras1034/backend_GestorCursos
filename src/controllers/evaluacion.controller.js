const evaluacionService = require('../services/evaluacion.service');

function manejarError(res, error) {
  res.status(error.status || 400).json({ error: error.message });
}

function crearEvaluacion(req, res) {
  try {
    const evaluacion = evaluacionService.crearEvaluacion(
      req.params.cursoId,
      req.body
    );
    res.status(201).json(evaluacion);
  } catch (error) {
    manejarError(res, error);
  }
}

function listarPorCurso(req, res) {
  try {
    res.status(200).json(
      evaluacionService.listarPorCurso(req.params.cursoId)
    );
  } catch (error) {
    manejarError(res, error);
  }
}

function actualizarEvaluacion(req, res) {
  try {
    const evaluacion = evaluacionService.actualizarEvaluacion(
      req.params.id,
      req.body
    );
    res.status(200).json(evaluacion);
  } catch (error) {
    manejarError(res, error);
  }
}

function eliminarEvaluacion(req, res) {
  try {
    evaluacionService.eliminarEvaluacion(
      req.params.id,
      req.body?.docenteId ?? req.query.docenteId
    );
    res.status(204).send();
  } catch (error) {
    manejarError(res, error);
  }
}

module.exports = {
  crearEvaluacion,
  listarPorCurso,
  actualizarEvaluacion,
  eliminarEvaluacion,
};
