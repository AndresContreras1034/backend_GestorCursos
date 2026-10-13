const visorService = require('../services/visor.service');

function verArchivoRecurso(req, res) {
  try {
    const { id } = req.params;
    const { usuarioId } = req.query;
    const { buffer, tipo, nombre, inline } = visorService.obtenerArchivoRecurso(id, usuarioId);

    const total = buffer.length;
    const disposicion = inline ? 'inline' : 'attachment';

    res.set({
      'Content-Type': tipo,
      'Content-Disposition': `${disposicion}; filename*=UTF-8''${encodeURIComponent(nombre)}`,
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=300',
      // Permite que un frontend en otro origen (ej. localhost:5173) lo muestre
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });

    // Soporte de Range (para adelantar videos y cargar PDFs grandes por partes)
    const rango = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (rango && (rango[1] || rango[2])) {
      let inicio;
      let fin;
      if (rango[1] === '') {
        inicio = Math.max(total - Number(rango[2]), 0);
        fin = total - 1;
      } else {
        inicio = Number(rango[1]);
        fin = rango[2] === '' ? total - 1 : Math.min(Number(rango[2]), total - 1);
      }
      if (inicio > fin || inicio >= total) {
        return res.status(416).set('Content-Range', `bytes */${total}`).end();
      }
      return res
        .status(206)
        .set({
          'Content-Range': `bytes ${inicio}-${fin}/${total}`,
          'Content-Length': fin - inicio + 1,
        })
        .end(buffer.subarray(inicio, fin + 1));
    }

    return res.status(200).set('Content-Length', total).end(buffer);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
}

module.exports = { verArchivoRecurso };