const { ErrorApp } = require('./errores');

function manejar(status, fn) {
  return async (req, res) => {
    try {
      const resultado = await fn(req);
      if (status === 204) return res.status(204).send();
      return res.status(status).json(resultado);
    } catch (error) {
      if (error instanceof ErrorApp) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error(error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
}

module.exports = manejar;
