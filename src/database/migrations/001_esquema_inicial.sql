-- =====================================================
-- USUARIOS
-- =====================================================
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL CHECK (length(trim(nombre)) BETWEEN 2 AND 80),
    apellido TEXT NOT NULL CHECK (length(trim(apellido)) BETWEEN 2 AND 80),
    email TEXT NOT NULL UNIQUE COLLATE NOCASE
        CHECK (length(email) BETWEEN 6 AND 254 AND email LIKE '_%@_%._%' AND email NOT LIKE '% %'),
    password TEXT NOT NULL CHECK (length(password) >= 60),  -- hash bcrypt
    rol TEXT NOT NULL CHECK (rol IN ('estudiante', 'docente')),
    tipo_documento TEXT CHECK (tipo_documento IN ('CC', 'TI', 'CE', 'PASAPORTE')),
    cedula TEXT UNIQUE
        CHECK (cedula IS NULL OR (length(cedula) BETWEEN 5 AND 15 AND cedula NOT GLOB '*[^0-9A-Za-z]*')),
    fecha_nacimiento TEXT NOT NULL CHECK (date(fecha_nacimiento) = fecha_nacimiento),
    genero TEXT NOT NULL CHECK (genero IN ('masculino', 'femenino', 'otro', 'prefiero_no_decir')),
    telefono TEXT CHECK (telefono IS NULL OR (length(telefono) BETWEEN 7 AND 15 AND telefono NOT GLOB '*[^0-9+]*')),
    foto_perfil TEXT,
    ultimo_login TEXT,                                   -- último acceso
    intentos_fallidos INTEGER NOT NULL DEFAULT 0 CHECK (intentos_fallidos >= 0),
    bloqueado_hasta TEXT,
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TEXT,
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    CHECK ((cedula IS NULL) = (tipo_documento IS NULL))  -- ambos o ninguno
);

CREATE TABLE familiares_usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    nombre_completo TEXT NOT NULL CHECK (length(trim(nombre_completo)) BETWEEN 3 AND 120),
    parentesco TEXT NOT NULL
        CHECK (parentesco IN ('padre', 'madre', 'acudiente', 'hermano', 'abuelo', 'tio', 'conyuge', 'otro')),
    telefono TEXT NOT NULL CHECK (length(telefono) BETWEEN 7 AND 15 AND telefono NOT GLOB '*[^0-9+]*'),
    email TEXT CHECK (email IS NULL OR email LIKE '_%@_%._%'),
    es_contacto_emergencia INTEGER NOT NULL DEFAULT 1 CHECK (es_contacto_emergencia IN (0, 1)),
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- =====================================================
-- CURSOS E INSCRIPCIONES
-- =====================================================
CREATE TABLE cursos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL CHECK (length(trim(nombre)) BETWEEN 3 AND 120),
    descripcion TEXT NOT NULL CHECK (length(trim(descripcion)) > 0),
    docente_id INTEGER NOT NULL,
    imagen_curso TEXT CHECK (imagen_curso IS NULL OR imagen_curso LIKE 'data:image/%'),
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TEXT,
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    FOREIGN KEY (docente_id) REFERENCES usuarios(id)
);

CREATE TABLE inscripciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    estudiante_id INTEGER NOT NULL,
    curso_id INTEGER NOT NULL,
    fecha_inscripcion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'retirada', 'completada')),
    FOREIGN KEY (estudiante_id) REFERENCES usuarios(id),
    FOREIGN KEY (curso_id) REFERENCES cursos(id),
    UNIQUE (estudiante_id, curso_id)
);

-- Solo docentes pueden ser dueños de cursos
CREATE TRIGGER trg_cursos_solo_docente_insert
BEFORE INSERT ON cursos
WHEN (SELECT rol FROM usuarios WHERE id = NEW.docente_id) IS NOT 'docente'
BEGIN
    SELECT RAISE(ABORT, 'El docente_id debe pertenecer a un usuario con rol docente');
END;

CREATE TRIGGER trg_cursos_solo_docente_update
BEFORE UPDATE OF docente_id ON cursos
WHEN (SELECT rol FROM usuarios WHERE id = NEW.docente_id) IS NOT 'docente'
BEGIN
    SELECT RAISE(ABORT, 'El docente_id debe pertenecer a un usuario con rol docente');
END;

-- Solo estudiantes pueden inscribirse
CREATE TRIGGER trg_inscripciones_solo_estudiante
BEFORE INSERT ON inscripciones
WHEN (SELECT rol FROM usuarios WHERE id = NEW.estudiante_id) IS NOT 'estudiante'
BEGIN
    SELECT RAISE(ABORT, 'Solo un usuario con rol estudiante puede inscribirse');
END;

-- =====================================================
-- CRONOGRAMA (sesiones) Y RECURSOS
-- =====================================================
CREATE TABLE cronograma (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curso_id INTEGER NOT NULL,
    titulo TEXT NOT NULL CHECK (length(trim(titulo)) BETWEEN 3 AND 150),
    descripcion TEXT,
    fecha_inicio TEXT,
    fecha_fin TEXT,
    orden INTEGER NOT NULL DEFAULT 0 CHECK (orden >= 0),
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TEXT,
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    FOREIGN KEY (curso_id) REFERENCES cursos(id),
    CHECK (fecha_inicio IS NULL OR fecha_fin IS NULL OR julianday(fecha_fin) >= julianday(fecha_inicio))
);

CREATE TABLE recursos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curso_id INTEGER NOT NULL,
    nombre TEXT NOT NULL CHECK (length(trim(nombre)) BETWEEN 2 AND 150),
    descripcion TEXT,
    enlace TEXT CHECK (enlace IS NULL OR enlace LIKE 'http://%' OR enlace LIKE 'https://%'),
    archivo TEXT,
    archivo_nombre TEXT,
    archivo_tipo TEXT,                                   -- MIME: application/pdf, image/png, video/mp4...
    archivo_tamano INTEGER CHECK (archivo_tamano IS NULL OR archivo_tamano >= 0),  -- bytes
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TEXT,
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    FOREIGN KEY (curso_id) REFERENCES cursos(id),
    CHECK (enlace IS NOT NULL OR archivo IS NOT NULL),
    CHECK (archivo IS NULL OR (archivo_nombre IS NOT NULL AND archivo_tipo IS NOT NULL))
);

-- =====================================================
-- ACTIVIDADES Y ENTREGAS (se usan en HU-011 a HU-017)
-- =====================================================
CREATE TABLE actividades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curso_id INTEGER NOT NULL,
    cronograma_id INTEGER,                               -- sesión del cronograma (opcional)
    creador_id INTEGER NOT NULL,
    titulo TEXT NOT NULL CHECK (length(trim(titulo)) BETWEEN 3 AND 150),
    instrucciones TEXT NOT NULL CHECK (length(trim(instrucciones)) >= 5),
    fecha_limite TEXT NOT NULL CHECK (datetime(fecha_limite) IS NOT NULL),
    puntaje_maximo REAL NOT NULL DEFAULT 5.0 CHECK (puntaje_maximo > 0 AND puntaje_maximo <= 100),
    permite_entrega_tardia INTEGER NOT NULL DEFAULT 0 CHECK (permite_entrega_tardia IN (0, 1)),
    estado TEXT NOT NULL DEFAULT 'publicada' CHECK (estado IN ('borrador', 'publicada', 'cerrada')),
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TEXT,
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    FOREIGN KEY (curso_id) REFERENCES cursos(id),
    FOREIGN KEY (cronograma_id) REFERENCES cronograma(id),
    FOREIGN KEY (creador_id) REFERENCES usuarios(id)
);

CREATE TABLE entregas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actividad_id INTEGER NOT NULL,
    estudiante_id INTEGER NOT NULL,
    comentario TEXT,
    enlace TEXT CHECK (enlace IS NULL OR enlace LIKE 'http://%' OR enlace LIKE 'https://%'),
    archivo TEXT,
    archivo_nombre TEXT,
    archivo_tipo TEXT,
    archivo_tamano INTEGER CHECK (archivo_tamano IS NULL OR archivo_tamano >= 0),
    fecha_entrega TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    es_tardia INTEGER NOT NULL DEFAULT 0 CHECK (es_tardia IN (0, 1)),
    nota REAL CHECK (nota IS NULL OR nota >= 0),
    retroalimentacion TEXT,
    fecha_calificacion TEXT,
    estado TEXT NOT NULL DEFAULT 'entregada' CHECK (estado IN ('entregada', 'calificada')),
    FOREIGN KEY (actividad_id) REFERENCES actividades(id),
    FOREIGN KEY (estudiante_id) REFERENCES usuarios(id),
    UNIQUE (actividad_id, estudiante_id)
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_familiares_usuario ON familiares_usuario(usuario_id);
CREATE INDEX idx_cursos_docente ON cursos(docente_id, activo);
CREATE INDEX idx_inscripciones_estudiante ON inscripciones(estudiante_id, estado);
CREATE INDEX idx_inscripciones_curso ON inscripciones(curso_id);
CREATE INDEX idx_cronograma_curso ON cronograma(curso_id, activo, orden);
CREATE INDEX idx_recursos_curso ON recursos(curso_id, activo);
CREATE INDEX idx_actividades_curso ON actividades(curso_id, activo, fecha_limite);
CREATE INDEX idx_entregas_actividad ON entregas(actividad_id);
CREATE INDEX idx_entregas_estudiante ON entregas(estudiante_id);