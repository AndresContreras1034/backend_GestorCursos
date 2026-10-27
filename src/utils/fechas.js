// Colombia no usa horario de verano: el offset es fijo.
const ZONA = '-05:00';

function esFechaISO(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

// Un corte cubre desde las 00:00 de fechaInicio hasta las 23:59:59 de fechaFin (hora Colombia)
function limitesCorte(corte) {
  return {
    desde: new Date(`${corte.fechaInicio}T00:00:00.000${ZONA}`).getTime(),
    hasta: new Date(`${corte.fechaFin}T23:59:59.999${ZONA}`).getTime(),
  };
}

function fechaDentroDelCorte(corte, fechaIso) {
  const t = new Date(fechaIso).getTime();
  const { desde, hasta } = limitesCorte(corte);
  return t >= desde && t <= hasta;
}

module.exports = { ZONA, esFechaISO, limitesCorte, fechaDentroDelCorte };
