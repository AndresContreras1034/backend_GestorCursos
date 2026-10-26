const ofertaRepository = require('../repository/oferta.repository');
const cursoRepository = require('../repository/curso.repository');
const inscripcionRepository = require('../repository/inscripcion.repository');
const { ErrorApp } = require('../utils/errores');

const MODALIDADES = ['virtual', 'presencial', 'hibrida'];
const CAMPOS_PERMITIDOS = new Set([
  'cupos',
  'fechaApertura',
  'fechaCierre',
  'modalidad',
]);

function validarPertenencia(cursoId, docenteId) {
  const curso = cursoRepository.buscarPorId(cursoId);
  if (!curso || curso.activo !== 1) {
    throw new ErrorApp('Curso no encontrado', 404);
  }
  if (!docenteId) {
    throw new ErrorApp('docenteId es obligatorio para validar el curso');
  }
  if (curso.docente_id !== Number(docenteId)) {
    throw new ErrorApp('No tienes permiso sobre este curso', 403);
  }
}

function validarFecha(campo, valor) {
  if (valor !== null && valor !== undefined && valor !== '' &&
      (typeof valor !== 'string' || isNaN(new Date(valor).getTime()))) {
    throw new ErrorApp(`${campo} inválida`);
  }
}

function validarCampos(datos, existentes = {}) {
  const cupos = datos.cupos !== undefined ? datos.cupos : existentes.cupos;
  const modalidad =
    datos.modalidad !== undefined ? datos.modalidad : existentes.modalidad;
  const fechaApertura =
    datos.fechaApertura !== undefined
      ? datos.fechaApertura
      : existentes.fecha_apertura;
  const fechaCierre =
    datos.fechaCierre !== undefined ? datos.fechaCierre : existentes.fecha_cierre;

  if (!Number.isInteger(cupos) || cupos < 1) {
    throw new ErrorApp('cupos debe ser un entero mayor que cero');
  }
  if (!MODALIDADES.includes(modalidad)) {
    throw new ErrorApp('modalidad debe ser virtual, presencial o hibrida');
  }
  validarFecha('fechaApertura', fechaApertura);
  validarFecha('fechaCierre', fechaCierre);
  if (
    fechaApertura &&
    fechaCierre &&
    new Date(fechaApertura).getTime() > new Date(fechaCierre).getTime()
  ) {
    throw new ErrorApp('fechaApertura no puede ser posterior a fechaCierre');
  }
}

function crearOferta(cursoId, datos) {
  const { cupos, fechaApertura, fechaCierre, modalidad, docenteId } = datos;
  validarPertenencia(cursoId, docenteId);
  validarCampos({ cupos, fechaApertura, fechaCierre, modalidad });

  return ofertaRepository.crear({
    cursoId,
    cupos,
    fechaApertura: fechaApertura || null,
    fechaCierre: fechaCierre || null,
    modalidad,
  });
}

function listarPorCurso(cursoId) {
  const curso = cursoRepository.buscarPorId(cursoId);
  if (!curso || curso.activo !== 1) {
    throw new ErrorApp('Curso no encontrado', 404);
  }
  return ofertaRepository.listarPorCurso(cursoId);
}

function actualizarOferta(id, datos) {
  const { docenteId, ...cambios } = datos;
  const oferta = ofertaRepository.buscarPorId(id);
  if (!oferta || oferta.activo !== 1) {
    throw new ErrorApp('Oferta no encontrada', 404);
  }
  validarPertenencia(oferta.curso_id, docenteId);

  if (Object.keys(cambios).some((campo) => !CAMPOS_PERMITIDOS.has(campo))) {
    throw new ErrorApp('La solicitud contiene campos no permitidos');
  }
  if (Object.keys(cambios).length === 0) {
    throw new ErrorApp('Debe enviar al menos un campo para actualizar');
  }
  validarCampos(cambios, oferta);

  if (
    cambios.cupos !== undefined &&
    cambios.cupos < inscripcionRepository.contarActivasPorOferta(id)
  ) {
    throw new ErrorApp('cupos no puede ser menor al número de inscripciones activas');
  }

  if (cambios.fechaApertura === '') cambios.fechaApertura = null;
  if (cambios.fechaCierre === '') cambios.fechaCierre = null;
  return ofertaRepository.actualizar(id, cambios);
}

function eliminarOferta(id, docenteId) {
  const oferta = ofertaRepository.buscarPorId(id);
  if (!oferta || oferta.activo !== 1) {
    throw new ErrorApp('Oferta no encontrada', 404);
  }
  validarPertenencia(oferta.curso_id, docenteId);
  ofertaRepository.eliminar(id);
}

module.exports = { crearOferta, listarPorCurso, actualizarOferta, eliminarOferta };
