const bcrypt = require('bcrypt');
const usuarioRepository = require('../repository/usuario.repository');

const ROLES = ['estudiante', 'docente'];
const GENEROS = ['masculino', 'femenino', 'otro', 'prefiero_no_decir'];
const TIPOS_DOCUMENTO = ['CC', 'TI', 'CE', 'PASAPORTE'];
const PARENTESCOS = ['padre', 'madre', 'acudiente', 'hermano', 'abuelo', 'tio', 'conyuge', 'otro'];

const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_TELEFONO = /^\+?\d{7,15}$/;

function validarTexto(valor, campo, min, max) {
  if (typeof valor !== 'string') throw new Error(`${campo} es obligatorio`);
  const limpio = valor.trim();
  if (limpio.length < min || limpio.length > max) {
    throw new Error(`${campo} debe tener entre ${min} y ${max} caracteres`);
  }
  return limpio;
}

function validarPassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
    throw new Error('La contraseña debe tener entre 8 y 72 caracteres');
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    throw new Error('La contraseña debe incluir mayúscula, minúscula y número');
  }
}

function calcularEdad(fechaNacimiento) {
  if (typeof fechaNacimiento !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) {
    throw new Error('fechaNacimiento debe tener formato YYYY-MM-DD');
  }
  const nacimiento = new Date(`${fechaNacimiento}T00:00:00Z`);
  if (isNaN(nacimiento.getTime()) || nacimiento.toISOString().slice(0, 10) !== fechaNacimiento) {
    throw new Error('fechaNacimiento no es una fecha válida');
  }

  const hoy = new Date();
  let edad = hoy.getUTCFullYear() - nacimiento.getUTCFullYear();
  const diffMes = hoy.getUTCMonth() - nacimiento.getUTCMonth();
  if (diffMes < 0 || (diffMes === 0 && hoy.getUTCDate() < nacimiento.getUTCDate())) edad--;

  if (edad < 0) throw new Error('La fecha de nacimiento no puede ser futura');
  if (edad < 5 || edad > 100) throw new Error('La edad debe estar entre 5 y 100 años');
  return edad;
}

function validarFamiliar(familiar) {
  if (!familiar || typeof familiar !== 'object') {
    throw new Error('Los datos del familiar son inválidos');
  }
  const nombreCompleto = validarTexto(familiar.nombreCompleto, 'El nombre del familiar', 3, 120);
  if (!PARENTESCOS.includes(familiar.parentesco)) {
    throw new Error(`parentesco inválido. Valores permitidos: ${PARENTESCOS.join(', ')}`);
  }
  if (!REGEX_TELEFONO.test(familiar.telefono || '')) {
    throw new Error('El teléfono del familiar debe tener entre 7 y 15 dígitos');
  }
  let email = null;
  if (familiar.email) {
    email = familiar.email.trim().toLowerCase();
    if (!REGEX_EMAIL.test(email)) throw new Error('El correo del familiar es inválido');
  }
  return { nombreCompleto, parentesco: familiar.parentesco, telefono: familiar.telefono, email };
}

async function registrar(datos) {
  const {
    nombre, apellido, email, password, rol,
    fechaNacimiento, genero, telefono, tipoDocumento, cedula, familiar,
  } = datos;

  const nombreFinal = validarTexto(nombre, 'El nombre', 2, 80);
  const apellidoFinal = validarTexto(apellido, 'El apellido', 2, 80);

  const emailFinal = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!REGEX_EMAIL.test(emailFinal) || emailFinal.length > 254) {
    throw new Error('El correo no tiene un formato válido');
  }

  validarPassword(password);

  if (!ROLES.includes(rol)) throw new Error('rol debe ser estudiante o docente');
  if (!GENEROS.includes(genero)) {
    throw new Error(`genero inválido. Valores permitidos: ${GENEROS.join(', ')}`);
  }

  const edad = calcularEdad(fechaNacimiento);
  if (rol === 'docente' && edad < 18) {
    throw new Error('Un docente debe ser mayor de edad');
  }

  if (telefono && !REGEX_TELEFONO.test(telefono)) {
    throw new Error('El teléfono debe tener entre 7 y 15 dígitos');
  }

  if ((cedula && !tipoDocumento) || (!cedula && tipoDocumento)) {
    throw new Error('tipoDocumento y cedula deben enviarse juntos');
  }
  if (tipoDocumento && !TIPOS_DOCUMENTO.includes(tipoDocumento)) {
    throw new Error(`tipoDocumento inválido. Valores permitidos: ${TIPOS_DOCUMENTO.join(', ')}`);
  }
  if (cedula && !/^[0-9A-Za-z]{5,15}$/.test(cedula)) {
    throw new Error('El documento debe tener entre 5 y 15 caracteres alfanuméricos');
  }

  // Menor de edad => familiar obligatorio
  let familiarFinal = null;
  if (edad < 18 && !familiar) {
    throw new Error('Los menores de edad deben registrar un familiar o acudiente');
  }
  if (familiar) familiarFinal = validarFamiliar(familiar);

  if (usuarioRepository.buscarPorEmail(emailFinal)) {
    throw new Error('El correo ya está registrado');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    return usuarioRepository.crearConFamiliar(
      {
        nombre: nombreFinal,
        apellido: apellidoFinal,
        email: emailFinal,
        password: passwordHash,
        rol,
        tipoDocumento: tipoDocumento ?? null,
        cedula: cedula ?? null,
        fechaNacimiento,
        genero,
        telefono: telefono ?? null,
      },
      familiarFinal
    );
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      if (error.message.includes('cedula')) throw new Error('El documento ya está registrado');
      if (error.message.includes('email')) throw new Error('El correo ya está registrado');
    }
    throw error;
  }
}

async function login(email, password) {
  if (!email || !password) throw new Error('Credenciales inválidas');

  const usuario = usuarioRepository.buscarPorEmail(String(email).trim().toLowerCase());
  if (!usuario || usuario.activo !== 1) throw new Error('Credenciales inválidas');

  if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
    throw new Error(`Cuenta bloqueada temporalmente. Intenta de nuevo en ${MINUTOS_BLOQUEO} minutos`);
  }

  const esValido = await bcrypt.compare(password, usuario.password);

  if (!esValido) {
    const intentos = (usuario.intentos_fallidos || 0) + 1;
    if (intentos >= MAX_INTENTOS) {
      const hasta = new Date(Date.now() + MINUTOS_BLOQUEO * 60 * 1000).toISOString();
      usuarioRepository.registrarLoginFallido(usuario.id, 0, hasta);
    } else {
      usuarioRepository.registrarLoginFallido(usuario.id, intentos, null);
    }
    throw new Error('Credenciales inválidas');
  }

  const ultimoAcceso = usuario.ultimo_login ?? null; // el acceso ANTERIOR
  usuarioRepository.registrarLoginExitoso(usuario.id);

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    rol: usuario.rol,
    ultimoAcceso,
  };
}

module.exports = { registrar, login };