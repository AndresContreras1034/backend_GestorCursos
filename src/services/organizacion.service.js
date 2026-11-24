const repo = require('../repository/organizacion.repository');
const cursoRepository = require('../repository/curso.repository');
const { ErrorApp } = require('../utils/errores');
const { esFechaISO, fechaDentroDelCorte } = require('../utils/fechas');

const DIAS = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const redondear = (n) => Math.round(n * 100) / 100;
const tieneMaxDosDecimales = (n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-9;

// ---------------- Validaciones reutilizables (también las usa curso.service) ----------------
function validarCortes(cortes) {
  if (!Array.isArray(cortes) || cortes.length !== 3) {
    throw new ErrorApp('El curso debe tener exactamente 3 cortes');
  }
  const ordenados = [...cortes].sort((a, b) => Number(a?.numero) - Number(b?.numero));

  const normalizados = ordenados.map((c, i) => {
    const n = i + 1;
    if (!c || typeof c !== 'object' || Number(c.numero) !== n) {
      throw new ErrorApp('Los cortes deben numerarse 1, 2 y 3 sin repetir');
    }
    if (!esFechaISO(c.fechaInicio) || !esFechaISO(c.fechaFin)) {
      throw new ErrorApp(`Corte ${n}: fechaInicio y fechaFin deben tener formato YYYY-MM-DD`);
    }
    if (c.fechaFin < c.fechaInicio) {
      throw new ErrorApp(`Corte ${n}: fechaFin no puede ser anterior a fechaInicio`);
    }
    if (typeof c.porcentaje !== 'number' || !(c.porcentaje > 0 && c.porcentaje <= 100)
      || !tieneMaxDosDecimales(c.porcentaje)) {
      throw new ErrorApp(`Corte ${n}: porcentaje debe ser un número entre 0 y 100 (máx. 2 decimales)`);
    }
    return { numero: n, fechaInicio: c.fechaInicio, fechaFin: c.fechaFin, porcentaje: c.porcentaje };
  });

  for (let i = 0; i < 2; i += 1) {
    if (normalizados[i + 1].fechaInicio <= normalizados[i].fechaFin) {
      throw new ErrorApp(`El corte ${i + 2} debe empezar después de que termine el corte ${i + 1}`);
    }
  }
  const suma = normalizados.reduce((acc, c) => acc + c.porcentaje, 0);
  if (Math.abs(suma - 100) > 1e-6) {
    throw new ErrorApp(`Los porcentajes de los cortes deben sumar 100 (actualmente suman ${redondear(suma)})`);
  }
  return normalizados;
}

function validarHorarios(horarios, { docenteId, semestre, excluirCursoId } = {}) {
  if (!Array.isArray(horarios) || horarios.length > 21) {
    throw new ErrorApp('horarios debe ser una lista de máximo 21 franjas');
  }
  const normalizados = horarios.map((h, i) => {
    const pos = `Horario ${i + 1}`;
    if (!h || typeof h !== 'object') throw new ErrorApp(`${pos} inválido`);
    if (!Number.isInteger(h.diaSemana) || h.diaSemana < 1 || h.diaSemana > 7) {
      throw new ErrorApp(`${pos}: diaSemana debe ser un entero de 1 (lunes) a 7 (domingo)`);
    }
    if (!REGEX_HORA.test(h.horaInicio || '') || !REGEX_HORA.test(h.horaFin || '')) {
      throw new ErrorApp(`${pos}: horaInicio y horaFin deben tener formato HH:MM (24 h)`);
    }
    if (h.horaFin <= h.horaInicio) throw new ErrorApp(`${pos}: horaFin debe ser posterior a horaInicio`);
    if (h.salon !== undefined && h.salon !== null
      && (typeof h.salon !== 'string' || h.salon.trim().length > 60)) {
      throw new ErrorApp(`${pos}: salon debe ser texto de máximo 60 caracteres`);
    }
    return {
      diaSemana: h.diaSemana, horaInicio: h.horaInicio, horaFin: h.horaFin,
      salon: h.salon?.trim() || null,
    };
  });

  const choca = (a, b) => a.diaSemana === b.diaSemana
    && a.horaInicio < b.horaFin && b.horaInicio < a.horaFin;

  for (let i = 0; i < normalizados.length; i += 1) {
    for (let j = i + 1; j < normalizados.length; j += 1) {
      if (choca(normalizados[i], normalizados[j])) {
        throw new ErrorApp(`Los horarios ${i + 1} y ${j + 1} se traslapan el ${DIAS[normalizados[i].diaSemana]}`);
      }
    }
  }

  // El docente no puede dictar dos cursos a la vez en el mismo semestre
  if (docenteId && semestre && normalizados.length > 0) {
    const otros = repo.horariosDeOtrosCursos(docenteId, semestre, excluirCursoId);
    for (const h of normalizados) {
      const conflicto = otros.find((o) => choca(h, o));
      if (conflicto) {
        throw new ErrorApp(
          `El horario del ${DIAS[h.diaSemana]} ${h.horaInicio}-${h.horaFin} choca con tu curso "${conflicto.cursoNombre}"`,
          409
        );
      }
    }
  }
  return normalizados;
}

function normalizarTematica(t, { parcial = false } = {}) {
  if (!t || typeof t !== 'object') throw new ErrorApp('Temática inválida');
  const salida = {};
  if (!parcial || t.nombre !== undefined) {
    if (typeof t.nombre !== 'string' || t.nombre.trim().length < 2 || t.nombre.trim().length > 120) {
      throw new ErrorApp('El nombre de la temática debe tener entre 2 y 120 caracteres');
    }
    salida.nombre = t.nombre.trim();
  }
  if (t.descripcion !== undefined) {
    if (t.descripcion !== null && (typeof t.descripcion !== 'string' || t.descripcion.length > 500)) {
      throw new ErrorApp('La descripción de la temática debe ser texto de máximo 500 caracteres');
    }
    salida.descripcion = t.descripcion?.trim() || null;
  }
  if (t.cortes !== undefined) {
    if (!Array.isArray(t.cortes) || t.cortes.some((n) => !Number.isInteger(n) || n < 1 || n > 3)) {
      throw new ErrorApp('cortes debe ser una lista con números de corte 1, 2 o 3');
    }
    salida.cortes = [...new Set(t.cortes)];
  } else if (!parcial) {
    salida.cortes = [];
  }
  return salida;
}

function validarTematicasIniciales(tematicas) {
  if (!Array.isArray(tematicas) || tematicas.length > 60) {
    throw new ErrorApp('tematicas debe ser una lista de máximo 60 elementos');
  }
  const lista = tematicas.map((t) => normalizarTematica(t));
  const nombres = new Set();
  for (const t of lista) {
    const clave = t.nombre.toLowerCase();
    if (nombres.has(clave)) throw new ErrorApp(`La temática "${t.nombre}" está repetida`);
    nombres.add(clave);
  }
  return lista;
}

// Usado por curso.repository dentro de la transacción de creación
function insertarTematicasIniciales(cursoId, tematicas) {
  const cortes = repo.obtenerCortes(cursoId);
  for (const t of tematicas) {
    repo.insertarTematica(cursoId, t, t.cortes.map((n) => cortes.find((c) => c.numero === n).id));
  }
}

// ---------------- Permisos ----------------
function obtenerCursoDelDocente(cursoId, docenteId, { editable = true } = {}) {
  if (!docenteId) throw new ErrorApp('docenteId es obligatorio');
  const curso = cursoRepository.buscarPorId(cursoId);
  if (!curso || curso.activo !== 1) throw new ErrorApp('Curso no encontrado', 404);
  if (curso.docente_id !== Number(docenteId)) throw new ErrorApp('No tienes permiso sobre este curso', 403);
  if (editable && curso.estado === 'finalizado') {
    throw new ErrorApp('El curso está finalizado y ya no se puede modificar', 409);
  }
  return curso;
}

// ---------------- Consulta ----------------
function obtenerOrganizacion(cursoId) {
  const cortes = repo.obtenerCortes(cursoId).map((c) => ({
    ...c, tematicas: repo.listarTematicasDeCorte(c.id),
  }));
  return { cortes, tematicas: repo.listarTematicas(cursoId), horarios: repo.listarHorarios(cursoId) };
}

function consultarOrganizacion(cursoId) {
  const curso = cursoRepository.buscarPorId(cursoId);
  if (!curso || curso.activo !== 1) throw new ErrorApp('Curso no encontrado', 404);
  return obtenerOrganizacion(curso.id);
}

// ---------------- Cortes ----------------
function actualizarCortes(cursoId, datos = {}) {
  const curso = obtenerCursoDelDocente(cursoId, datos.docenteId);
  const cortes = validarCortes(datos.cortes);

  const existentes = repo.obtenerCortes(curso.id);
  const nuevoPorNumero = new Map(cortes.map((c) => [c.numero, c]));
  for (const act of repo.actividadesConCorte(curso.id)) {
    const viejo = existentes.find((c) => c.id === act.corteId);
    const nuevo = viejo && nuevoPorNumero.get(viejo.numero);
    if (nuevo && !fechaDentroDelCorte(nuevo, act.fechaLimite)) {
      throw new ErrorApp(
        `La actividad "${act.titulo}" quedaría fuera de las fechas del corte ${nuevo.numero}`, 409
      );
    }
  }
  repo.guardarCortes(curso.id, cortes);
  return obtenerOrganizacion(curso.id).cortes;
}

// ---------------- Temáticas ----------------
function idsDeCortes(cursoId, numeros) {
  const cortes = repo.obtenerCortes(cursoId);
  return numeros.map((n) => {
    const corte = cortes.find((c) => c.numero === n);
    if (!corte) throw new ErrorApp(`El corte ${n} no existe en este curso`);
    return corte.id;
  });
}

function obtenerTematicaDelCurso(cursoId, tematicaId) {
  const tematica = repo.obtenerTematica(Number(tematicaId));
  if (!tematica || tematica.cursoId !== Number(cursoId)) throw new ErrorApp('Temática no encontrada', 404);
  return tematica;
}

function crearTematica(cursoId, datos = {}) {
  const curso = obtenerCursoDelDocente(cursoId, datos.docenteId);
  const t = normalizarTematica(datos);
  const ids = idsDeCortes(curso.id, t.cortes);
  if (repo.buscarTematicaPorNombre(curso.id, t.nombre)) {
    throw new ErrorApp('Ya existe una temática con ese nombre en el curso', 409);
  }
  return repo.obtenerTematica(repo.insertarTematica(curso.id, t, ids));
}

function actualizarTematica(cursoId, tematicaId, datos = {}) {
  const curso = obtenerCursoDelDocente(cursoId, datos.docenteId);
  const tematica = obtenerTematicaDelCurso(curso.id, tematicaId);
  const cambios = normalizarTematica(datos, { parcial: true });
  if (Object.keys(cambios).length === 0) throw new ErrorApp('Debe enviar al menos un campo para actualizar');

  if (cambios.nombre && cambios.nombre.toLowerCase() !== tematica.nombre.toLowerCase()
    && repo.buscarTematicaPorNombre(curso.id, cambios.nombre)) {
    throw new ErrorApp('Ya existe una temática con ese nombre en el curso', 409);
  }

  let nuevosIds;
  if (cambios.cortes !== undefined) {
    nuevosIds = idsDeCortes(curso.id, cambios.cortes);
    const quitados = repo.idsDeCortesDeTematica(tematica.id).filter((id) => !nuevosIds.includes(id));
    if (repo.contarActividadesDeTematica(tematica.id, quitados) > 0) {
      throw new ErrorApp('No puedes quitar la temática de un corte donde ya tiene actividades', 409);
    }
  }
  repo.actualizarTematica(tematica.id, cambios, nuevosIds);
  return repo.obtenerTematica(tematica.id);
}

function eliminarTematica(cursoId, tematicaId, docenteId) {
  const curso = obtenerCursoDelDocente(cursoId, docenteId);
  const tematica = obtenerTematicaDelCurso(curso.id, tematicaId);
  if (repo.contarActividadesDeTematica(tematica.id) > 0) {
    throw new ErrorApp('La temática tiene actividades asociadas y no se puede eliminar', 409);
  }
  repo.eliminarTematica(tematica.id);
  return { mensaje: 'Temática eliminada exitosamente', id: tematica.id };
}

// ---------------- Horarios ----------------
function actualizarHorarios(cursoId, datos = {}) {
  const curso = obtenerCursoDelDocente(cursoId, datos.docenteId);
  const horarios = validarHorarios(datos.horarios, {
    docenteId: curso.docente_id, semestre: curso.semestre, excluirCursoId: curso.id,
  });
  repo.reemplazarHorarios(curso.id, horarios);
  return repo.listarHorarios(curso.id);
}

// ---------------- Actividades: corte y temática ----------------
function resolverCorteYTematica(cursoId, { corteId, tematicaId, fechaLimite }) {
  const cortes = repo.obtenerCortes(cursoId);
  const hayCorte = corteId !== undefined && corteId !== null;
  const hayTematica = tematicaId !== undefined && tematicaId !== null;

  if (cortes.length === 0) {
    if (hayCorte || hayTematica) throw new ErrorApp('Este curso no tiene cortes configurados');
    return { corteId: null, tematicaId: null };
  }
  if (!hayCorte) throw new ErrorApp('corteId es obligatorio: el curso está organizado por cortes');

  const corte = cortes.find((c) => c.id === Number(corteId));
  if (!corte) throw new ErrorApp('El corte no existe o no pertenece a este curso');
  if (!fechaDentroDelCorte(corte, fechaLimite)) {
    throw new ErrorApp(
      `La fecha límite debe estar dentro del corte ${corte.numero} (${corte.fechaInicio} a ${corte.fechaFin})`
    );
  }
  if (hayTematica && !repo.tematicaEnCorte(corte.id, Number(tematicaId))) {
    throw new ErrorApp('La temática no está asignada a ese corte');
  }
  return { corteId: corte.id, tematicaId: hayTematica ? Number(tematicaId) : null };
}

module.exports = {
  validarCortes, validarHorarios, validarTematicasIniciales, insertarTematicasIniciales,
  obtenerCursoDelDocente, obtenerOrganizacion, consultarOrganizacion,
  actualizarCortes, crearTematica, actualizarTematica, eliminarTematica,
  actualizarHorarios, resolverCorteYTematica,
};
