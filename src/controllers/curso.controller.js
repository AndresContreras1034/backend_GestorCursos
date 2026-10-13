const cursoService = require('../services/curso.service');

function crearCurso(req, res) {
  try {
    const nuevoCurso = cursoService.crearCurso(req.body);
    res.status(201).json(nuevoCurso);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

function listarCursos(req, res) {
  try {
    const { busqueda } = req.query;
    const cursos = cursoService.listarCursos(busqueda);
    res.status(200).json(cursos);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

function actualizarCurso(req, res) {
  try {
    const { id } = req.params;
    const cursoActualizado = cursoService.actualizarCurso(id, req.body);
    res.status(200).json(cursoActualizado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

module.exports = { crearCurso, listarCursos, actualizarCurso };