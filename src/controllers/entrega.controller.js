const entregaService = require('../services/entrega.service');

function entregar(req, res) {
  try {
    const { cursoId, actividadId } = req.params;
    const { entrega, reemplazada } = entregaService.entregar(cursoId, actividadId, req.body);
    res.status(reemplazada ? 200 : 201).json(entrega);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
}

module.exports = { entregar };
