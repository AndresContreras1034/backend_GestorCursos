const cursoRepository = require('../repository/curso.repository');
const matriculaRepository = require('../repository/matricula.repository');
const usuarioRepository = require('../repository/usuario.repository');
const organizacionService = require('./organizacion.service');
const matriculaService = require('./matricula.service');
const cursoGestionService = require('./cursoGestion.service');
const { ErrorApp } = require('../utils/errores');

const MODALIDADES = ['virtual', 'presencial', 'hibrida'];
const ESTADOS = ['borrador', 'abierto', 'en_curso', 'finalizado'];
const ESTADOS_CREACION = ['borrador', 'abierto'];
const TRANSICIONES = {
  borrador: ['abierto'],
  abierto: ['en_curso', 'finalizado'],
  en_curso: ['finalizado'],
  finalizado: [],
};
const REGEX_SEMESTRE = /^\d{4}-[12]$/;
const REGEX_CODIGO = /^[A-Za-z0-9_-]{2,20}$/;
const tieneMaxDosDecimales = (n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-9;

// ---------------- Validaciones de campos ----------------
function validarTextoCurso(nombre, descripcion) {
  if (typeof nombre !== 'string' || nombre.trim().length < 3 || nombre.trim().length > 120) {
    throw new ErrorApp('El nombre debe tener entre 3 y 120 caracteres');
  }
  if (typeof descripcion !== 'string' || descripcion.trim().length === 0) {
    throw new ErrorApp('La descripciÃ³n es obligatoria');
  }
  return { nombre: nombre.trim(), descripcion: descripcion.trim() };
}

function validarImagen(imagenCurso) {
  if (imagenCurso && !String(imagenCurso).startsWith('data:image')) {
    throw new ErrorApp('La imagen del curso debe estar en formato base64 (data:image/...)');
  }
}

function validarSemestre(semestre) {
  if (typeof semestre !== 'string' || !REGEX_SEMESTRE.test(semestre)) {
    throw new ErrorApp('semestre debe tener formato AAAA-1 o AAAA-2 (por ejemplo 2026-2)');
  }
  return semestre;
}

function validarCodigo(codigo) {
  if (codigo === null) return null;
  if (typeof codigo !== 'string' || !REGEX_CODIGO.test(codigo.trim())) {
    throw new ErrorApp('codigo debe tener de 2 a 20 caracteres (letras, nÃºmeros, guion o guion bajo)');
  }
  return codigo.trim().toUpperCase();
}

function validarNotaMinima(nota) {
  if (typeof nota !== 'number' || !(nota > 0 && nota <= 5) || !tieneMaxDosDecimales(nota)) {
    throw new ErrorApp('notaMinima debe ser un nÃºmero mayor a 0 y mÃ¡ximo 5 (mÃ¡x. 2 decimales)');
  }
  return nota;
}

function validarCupoMaximo(cupo) {
  if (cupo === null) return null;
  if (!Number.isInteger(cupo) || cupo < 1 || cupo > 5000) {
    throw new ErrorApp('cupoMaximo debe ser un entero entre 1 y 5000 (o null para sin lÃ­mite)');
  }
  return cupo;
}

// Presencial e hÃ­brida exigen ubicaciÃ³n (nombre + coordenadas del mapa)
function validarModalidadYUbicacion(modalidad, ubicacion, enlaceVirtual) {
  if (!MODALIDADES.includes(modalidad)) {
    throw new ErrorApp('modalidad debe ser virtual, presencial o hibrida');
  }
  const requiereUbicacion = modalidad !== 'virtual';
  const aceptaEnlace = modalidad !== 'presencial';
  const salida = {
    ubicacionNombre: null, latitud: null, longitud: null, enlaceVirtual: null,
  };

  if (requiereUbicacion) {
    const { nombre, latitud, longitud } = ubicacion || {};
    if (typeof nombre !== 'string' || nombre.trim().length < 3 || nombre.trim().length > 150) {
      throw new ErrorApp('ubicacion.nombre es obligatorio para cursos presenciales o hÃ­bridos (3-150 caracteres)');
    }
    if (typeof latitud !== 'number' || latitud < -90 || latitud > 90
      || typeof longitud !== 'number' || longitud < -180 || longitud > 180) {
      throw new ErrorApp('ubicacion.latitud y ubicacion.longitud son obligatorias y deben ser coordenadas vÃ¡lidas');
    }
    salida.ubicacionNombre = nombre.trim();
    salida.latitud = latitud;
    salida.longitud = longitud;
  }

  if (aceptaEnlace && enlaceVirtual !== undefined && enlaceVirtual !== null && enlaceVirtual !== '') {
    if (typeof enlaceVirtual !== 'string' || !/^https?:\/\/\S+$/i.test(enlaceVirtual.trim())) {
      throw new ErrorApp('enlaceVirtual debe ser una URL http(s) vÃ¡lida');
    }
    salida.enlaceVirtual = enlaceVirtual.trim();
  }
  return salida;
}

function obtenerDocente(docenteId) {
  if (!docenteId) throw new ErrorApp('Nombre, descripciÃ³n y docente son obligatorios');
  const docente = usuarioRepository.buscarPorId(Number(docenteId));
  if (!docente || !usuarioRepository.estaActivo(docente.id)) throw new ErrorApp('Docente no encontrado', 404);
  if (docente.rol !== 'docente') throw new ErrorApp('Solo un docente puede crear cursos', 403);
  return docente;
}

function traducirErrorUnico(error) {
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' && String(error.message).includes('codigo')) {
    throw new ErrorApp('El cÃ³digo del curso ya estÃ¡ en uso', 409);
  }
  throw error;
}

// ---------------- Crear ----------------
function crearCurso(datos = {}) {
  const docente = obtenerDocente(datos.docenteId);
  const { nombre, descripcion } = validarTextoCurso(datos.nombre, datos.descripcion);
  validarImagen(datos.imagenCurso);
  const semestre = validarSemestre(datos.semestre);
  const codigo = datos.codigo === undefined ? null : validarCodigo(datos.codigo);
  const notaMinima = datos.notaMinima === undefined ? 3 : validarNotaMinima(datos.notaMinima);
  const cupoMaximo = datos.cupoMaximo === undefined ? null : validarCupoMaximo(datos.cupoMaximo);
  const estado = datos.estado ?? 'borrador';
  if (!ESTADOS_CREACION.includes(estado)) throw new ErrorApp('estado inicial debe ser borrador o abierto');

  const lugar = validarModalidadYUbicacion(datos.modalidad, datos.ubicacion, datos.enlaceVirtual);
  const cortes = organizacionService.validarCortes(datos.cortes);
  const horarios = organizacionService.validarHorarios(datos.horarios ?? [], {
    docenteId: docente.id, semestre,
  });
  const tematicas = organizacionService.validarTematicasIniciales(datos.tematicas ?? []);

  let cursoId;
  try {
    cursoId = cursoRepository.crearCompleto(
      {
        nombre, descripcion, docenteId: docente.id, imagenCurso: datos.imagenCurso,
        modalidad: datos.modalidad, semestre, codigo, estado, notaMinima, cupoMaximo, ...lugar,
      },
      {
        cortes, horarios, tematicas,
        insertarTematicas: organizacionService.insertarTematicasIniciales,
      }
    );
  } catch (error) {
    traducirErrorUnico(error);
  }
  return cursoGestionService.obtenerCurso(cursoId, docente.id);
}

// ---------------- Listar ----------------
function listarCursos(busqueda, { docenteId, estado } = {}) {
  if (estado !== undefined && !ESTADOS.includes(estado)) {
    throw new ErrorApp(`estado debe ser: ${ESTADOS.join(', ')}`);
  }
  if (docenteId !== undefined && !Number.isInteger(Number(docenteId))) {
    throw new ErrorApp('docenteId debe ser un nÃºmero entero');
  }
  return cursoRepository.listarTodos(busqueda, { docenteId, estado });
}

// ---------------- Editar ----------------
function obtenerCursoEditable(id, docenteId) {
  if (!docenteId) throw new ErrorApp('docenteId es obligatorio para validar el curso');
  const curso = cursoRepository.buscarPorId(id);
  if (!curso || curso.activo !== 1) throw new ErrorApp('Curso no encontrado', 404);
  if (curso.docente_id !== Number(docenteId)) throw new ErrorApp('No tienes permiso para editar este curso', 403);
  return curso;
}

function actualizarCurso(id, datos = {}) {
  const curso = obtenerCursoEditable(id, datos.docenteId);
  if (curso.estado === 'finalizado') {
    throw new ErrorApp('El curso estÃ¡ finalizado y ya no se puede modificar', 409);
  }

  const cambios = {};
  if (datos.nombre !== undefined || datos.descripcion !== undefined) {
    const texto = validarTextoCurso(datos.nombre ?? curso.nombre, datos.descripcion ?? curso.descripcion);
    if (datos.nombre !== undefined) cambios.nombre = texto.nombre;
    if (datos.descripcion !== undefined) cambios.descripcion = texto.descripcion;
  }
  if (datos.imagenCurso !== undefined) {
    validarImagen(datos.imagenCurso);
    cambios.imagenCurso = datos.imagenCurso;
  }
  if (datos.semestre !== undefined) cambios.semestre = validarSemestre(datos.semestre);
  if (datos.codigo !== undefined) cambios.codigo = validarCodigo(datos.codigo);
  if (datos.notaMinima !== undefined) cambios.notaMinima = validarNotaMinima(datos.notaMinima);

  if (datos.cupoMaximo !== undefined) {
    cambios.cupoMaximo = validarCupoMaximo(datos.cupoMaximo);
    if (cambios.cupoMaximo !== null && cambios.cupoMaximo < matriculaRepository.contarActivasCurso(curso.id)) {
      throw new ErrorApp('cupoMaximo no puede ser menor al nÃºmero de estudiantes inscritos', 409);
    }
  }

  if (datos.modalidad !== undefined || datos.ubicacion !== undefined || datos.enlaceVirtual !== undefined) {
    const ubicacionActual = {
      nombre: curso.ubicacion_nombre, latitud: curso.latitud, longitud: curso.longitud,
    };
    Object.assign(cambios, validarModalidadYUbicacion(
      datos.modalidad ?? curso.modalidad,
      datos.ubicacion !== undefined ? datos.ubicacion : ubicacionActual,
      datos.enlaceVirtual !== undefined ? datos.enlaceVirtual : curso.enlace_virtual
    ));
    cambios.modalidad = datos.modalidad ?? curso.modalidad;
  }

  if (Object.keys(cambios).length === 0) {
    throw new ErrorApp('Debe enviar al menos un campo para actualizar');
  }
  if (cambios.semestre && cambios.semestre !== curso.semestre) {
    // Al cambiar de semestre se revisa de nuevo que el horario no choque con otros cursos
    organizacionService.validarHorarios(
      organizacionService.consultarOrganizacion(curso.id).horarios,
      { docenteId: curso.docente_id, semestre: cambios.semestre, excluirCursoId: curso.id }
    );
  }

  try {
    cursoRepository.actualizar(curso.id, cambios);
  } catch (error) {
    traducirErrorUnico(error);
  }
  if (cambios.cupoMaximo !== undefined) matriculaService.promoverDeEspera(curso.id);
  return cursoGestionService.obtenerCurso(curso.id, curso.docente_id);
}

// ---------------- Estado del curso ----------------
function cambiarEstado(id, datos = {}) {
  const curso = obtenerCursoEditable(id, datos.docenteId);
  if (!ESTADOS.includes(datos.estado)) throw new ErrorApp(`estado debe ser: ${ESTADOS.join(', ')}`);
  if (!TRANSICIONES[curso.estado].includes(datos.estado)) {
    const permitidos = TRANSICIONES[curso.estado].join(', ') || 'ninguno';
    throw new ErrorApp(
      `No se puede pasar de "${curso.estado}" a "${datos.estado}". Estados permitidos: ${permitidos}`, 409
    );
  }
  cursoRepository.cambiarEstado(curso.id, datos.estado);
  if (datos.estado === 'abierto') matriculaService.promoverDeEspera(curso.id);
  return cursoGestionService.obtenerCurso(curso.id, curso.docente_id);
}

module.exports = { crearCurso, listarCursos, actualizarCurso, cambiarEstado };
