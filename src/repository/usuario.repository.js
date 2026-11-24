const db = require('../database/connection');

function crearConFamiliar(usuario, familiar) {
  const transaccion = db.transaction(() => {
    const resultado = db.prepare(`
      INSERT INTO usuarios
        (
          nombre,
          apellido,
          email,
          password,
          rol,
          tipo_documento,
          cedula,
          fecha_nacimiento,
          genero,
          telefono
        )
      VALUES
        (
          @nombre,
          @apellido,
          @email,
          @password,
          @rol,
          @tipoDocumento,
          @cedula,
          @fechaNacimiento,
          @genero,
          @telefono
        )
    `).run(usuario);

    const usuarioId = resultado.lastInsertRowid;

    if (familiar) {
      db.prepare(`
        INSERT INTO familiares_usuario
          (
            usuario_id,
            nombre_completo,
            parentesco,
            telefono,
            email
          )
        VALUES (?, ?, ?, ?, ?)
      `).run(
        usuarioId,
        familiar.nombreCompleto,
        familiar.parentesco,
        familiar.telefono,
        familiar.email ?? null
      );
    }

    return usuarioId;
  });

  return buscarPerfilPorId(transaccion());
}

// Busca un usuario por email.
// Incluye password porque esta función puede ser utilizada
// durante el proceso de autenticación.
function buscarPorEmail(email) {
  const stmt = db.prepare(`
    SELECT *
    FROM usuarios
    WHERE email = ?
  `);

  return stmt.get(email);
}

// Devuelve el perfil completo SIN password.
function buscarPerfilPorId(id) {
  const usuario = db.prepare(`
    SELECT
      id,
      nombre,
      apellido,
      email,
      rol,
      tipo_documento AS tipoDocumento,
      cedula,
      fecha_nacimiento AS fechaNacimiento,
      genero,
      telefono,
      foto_perfil AS fotoPerfil,
      ultimo_login AS ultimoAcceso,
      fecha_creacion AS fechaCreacion
    FROM usuarios
    WHERE id = ?
  `).get(id);

  if (!usuario) {
    return undefined;
  }

  usuario.familiares = db.prepare(`
    SELECT
      id,
      nombre_completo AS nombreCompleto,
      parentesco,
      telefono,
      email,
      es_contacto_emergencia AS esContactoEmergencia
    FROM familiares_usuario
    WHERE usuario_id = ?
  `).all(id);

  return usuario;
}

function buscarPorId(id) {
  return buscarPerfilPorId(id);
}

function estaActivo(id) {
  const usuario = db.prepare('SELECT activo FROM usuarios WHERE id = ?').get(id);
  return usuario?.activo === 1;
}

function desactivar(id) {
  db.prepare(`
    UPDATE usuarios
    SET activo = 0, fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE id = ? AND activo = 1
  `).run(id);
}

function buscarPorCedula(cedula) {
  const stmt = db.prepare(`
    SELECT *
    FROM usuarios
    WHERE cedula = ?
  `);

  return stmt.get(cedula);
}

function registrarLoginExitoso(id) {
  db.prepare(`
    UPDATE usuarios
    SET
      ultimo_login = ?,
      intentos_fallidos = 0,
      bloqueado_hasta = NULL
    WHERE id = ?
  `).run(new Date().toISOString(), id);
}

function registrarLoginFallido(id, intentos, bloqueadoHasta) {
  db.prepare(`
    UPDATE usuarios
    SET
      intentos_fallidos = ?,
      bloqueado_hasta = ?
    WHERE id = ?
  `).run(
    intentos,
    bloqueadoHasta ?? null,
    id
  );
}

function actualizar(id, {
  nombre,
  apellido,
  email,
  tipoDocumento,
  cedula,
  fechaNacimiento,
  genero,
  telefono,
  fotoPerfil
}) {
  const actual = buscarPerfilPorId(id);

  if (!actual) {
    return undefined;
  }

  const nuevoNombre = nombre ?? actual.nombre;
  const nuevoApellido = apellido ?? actual.apellido;
  const nuevoEmail = email ?? actual.email;
  const nuevoTipoDocumento = tipoDocumento ?? actual.tipoDocumento;
  const nuevaCedula = cedula ?? actual.cedula;
  const nuevaFechaNacimiento =
    fechaNacimiento ?? actual.fechaNacimiento;
  const nuevoGenero = genero ?? actual.genero;
  const nuevoTelefono = telefono ?? actual.telefono;
  const nuevaFotoPerfil = fotoPerfil ?? actual.fotoPerfil;

  db.prepare(`
    UPDATE usuarios
    SET
      nombre = ?,
      apellido = ?,
      email = ?,
      tipo_documento = ?,
      cedula = ?,
      fecha_nacimiento = ?,
      genero = ?,
      telefono = ?,
      foto_perfil = ?
    WHERE id = ?
  `).run(
    nuevoNombre,
    nuevoApellido,
    nuevoEmail,
    nuevoTipoDocumento,
    nuevaCedula,
    nuevaFechaNacimiento,
    nuevoGenero,
    nuevoTelefono,
    nuevaFotoPerfil,
    id
  );

  return buscarPerfilPorId(id);
}

module.exports = {
  crearConFamiliar,
  buscarPorEmail,
  buscarPorId,
  estaActivo,
  desactivar,
  buscarPerfilPorId,
  buscarPorCedula,
  registrarLoginExitoso,
  registrarLoginFallido,
  actualizar
};