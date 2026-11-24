const repo = require('../repository/actividadGestion.repository');
const cursoRepository = require('../repository/curso.repository');
const cronogramaRepository = require('../repository/cronograma.repository');
const { ErrorApp } = require('../utils/errores');
const organizacionService = require('./organizacion.service');

const ESTADOS = ['borrador', 'publicada', 'cerrada'];

function aBooleanos(actividad) {
  const { activo, ...resto } = actividad;
  return {
    ...resto,
    permiteEntregaTardia: actividad.permiteEntregaTardia === 1,
    permiteReemplazoEntrega: actividad.permiteReemplazoEntrega === 1,
  };
}

function validarDocenteYActividad(cursoId, actividadId, docenteId) {
  if (!docenteId) throw new ErrorApp('docenteId es obligatorio');

  const curso = cursoRepository.buscarPorId(cursoId);
  if (!curso || curso.activo !== 1) throw new ErrorApp('Curso no encontrado', 404);
  if (curso.docente_id !== Number(docenteId)) {
    throw new ErrorApp('No tienes permiso sobre este curso', 403);
  }

  const actividad = repo.buscarPorId(actividadId);
  if (!actividad || actividad.activo !== 1 || actividad.cursoId !== Number(cursoId)) {
    throw new ErrorApp('Actividad no encontrada', 404);
  }
  return actividad;
}

function actualizarActividad(cursoId, actividadId, datos = {}) {
  const actividad = validarDocenteYActividad(cursoId, actividadId, datos.docenteId);
  const campos = {};

  if (datos.titulo !== undefined) {
    if (typeof datos.titulo !== 'string' || datos.titulo.trim().length < 3 || datos.titulo.trim().length > 150) {
      throw new ErrorApp('El título debe tener entre 3 y 150 caracteres');
    }
    campos.titulo = datos.titulo.trim();
  }
  if (datos.instrucciones !== undefined) {
    if (typeof datos.instrucciones !== 'string' || datos.instrucciones.trim().length < 5) {
      throw new ErrorApp('Las instrucciones deben tener al menos 5 caracteres');
    }
    campos.instrucciones = datos.instrucciones.trim();
  }
  if (datos.fechaLimite !== undefined) {
    if (typeof datos.fechaLimite !== 'string' || isNaN(new Date(datos.fechaLimite).getTime())) {
      throw new ErrorApp('fechaLimite debe ser una fecha válida (ISO 8601)');
    }
    campos.fechaLimite = new Date(datos.fechaLimite).toISOString();
  }
  if (datos.puntajeMaximo !== undefined) {
    const puntaje = Number(datos.puntajeMaximo);
    if (!Number.isFinite(puntaje) || puntaje <= 0 || puntaje > 100) {
      throw new ErrorApp('puntajeMaximo debe ser un número mayor a 0 y máximo 100');
    }
    if (puntaje !== actividad.puntajeMaximo && repo.contarCalificadas(actividad.id) > 0) {
      throw new ErrorApp('No se puede cambiar el puntaje: ya hay entregas calificadas', 409);
    }
    campos.puntajeMaximo = puntaje;
  }
  if (datos.estado !== undefined) {
    if (!ESTADOS.includes(datos.estado)) {
      throw new ErrorApp(`estado debe ser: ${ESTADOS.join(', ')}`);
    }
    campos.estado = datos.estado;
  }
  for (const bandera of ['permiteEntregaTardia', 'permiteReemplazoEntrega']) {
    if (datos[bandera] !== undefined) {
      if (typeof datos[bandera] !== 'boolean') throw new ErrorApp(`${bandera} debe ser true o false`);
      campos[bandera] = datos[bandera] ? 1 : 0;
    }
  }
  if (datos.cronogramaId !== undefined) {
    if (datos.cronogramaId === null) {
      campos.cronogramaId = null;
    } else {
      const sesion = cronogramaRepository.buscarPorId(datos.cronogramaId);
      if (!sesion || sesion.activo !== 1 || sesion.curso_id !== Number(cursoId)) {
        throw new ErrorApp('La sesión del cronograma no existe o no pertenece a este curso');
      }
      campos.cronogramaId = sesion.id;
    }
  }

  // Corte y temÃ¡tica: se revalidan si cambia el corte, la temÃ¡tica o la fecha lÃ­mite
  if (datos.corteId !== undefined || datos.tematicaId !== undefined || datos.fechaLimite !== undefined) {
    const corteFinal = datos.corteId !== undefined ? datos.corteId : actividad.corteId;
    let tematicaFinal = datos.tematicaId !== undefined ? datos.tematicaId : actividad.tematicaId;
    if (datos.corteId !== undefined && datos.tematicaId === undefined && corteFinal !== actividad.corteId) {
      tematicaFinal = null;   // al cambiar de corte la temÃ¡tica anterior ya no aplica
    }
    const org = organizacionService.resolverCorteYTematica(cursoId, {
      corteId: corteFinal,
      tematicaId: tematicaFinal,
      fechaLimite: campos.fechaLimite ?? actividad.fechaLimite,
    });
    campos.corteId = org.corteId;
    campos.tematicaId = org.tematicaId;
  }

  if (Object.keys(campos).length === 0) {
    throw new ErrorApp('Debe enviar al menos un campo para actualizar');
  }
  return aBooleanos(repo.actualizar(actividad.id, campos));
}

function eliminarActividad(cursoId, actividadId, docenteId) {
  const actividad = validarDocenteYActividad(cursoId, actividadId, docenteId);
  repo.desactivar(actividad.id);
  return { mensaje: 'Actividad eliminada exitosamente', id: actividad.id };
}

module.exports = { actualizarActividad, eliminarActividad };
