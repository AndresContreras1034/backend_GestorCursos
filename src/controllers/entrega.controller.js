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

function listarEntregas(req, res) {
  try {
    const { cursoId, actividadId } = req.params;
    const { docenteId } = req.query;
    const resultado = entregaService.listarEntregasDeActividad(cursoId, actividadId, docenteId);
    res.status(200).json(resultado);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
}

function verArchivo(req, res) {
  try {
    const { cursoId, actividadId, entregaId } = req.params;
    const { docenteId } = req.query;
    const { buffer, tipo, nombre } = entregaService.obtenerArchivoEntrega(
      cursoId,
      actividadId,
      entregaId,
      docenteId
    );
    const disposition = req.query.descargar === 'true' ? 'attachment' : 'inline';
    const safeName = nombre
      .replace(/["\\/\r\n]/g, '_')
      .replace(/[^\x20-\x7E]/g, '_');
    const encodedName = encodeURIComponent(nombre)
      .replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);

    res.set({
      'Content-Type': tipo,
      'Content-Disposition': `${disposition}; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
      'Content-Length': buffer.length,
      'X-Content-Type-Options': 'nosniff',
    });
    res.status(200).send(buffer);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
}

module.exports = { entregar, listarEntregas, verArchivo };
