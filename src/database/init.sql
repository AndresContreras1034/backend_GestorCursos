CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('estudiante', 'docente')),
    cedula TEXT UNIQUE,
    fecha_nacimiento TEXT,
    foto_perfil TEXT,
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TEXT,
    ultimo_login TEXT,
    activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cursos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    docente_id INTEGER NOT NULL,
    imagen_curso TEXT,
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (docente_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS inscripciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    estudiante_id INTEGER NOT NULL,
    curso_id INTEGER NOT NULL,
    fecha_inscripcion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','retirada','completada')),
    FOREIGN KEY (estudiante_id) REFERENCES usuarios(id),
    FOREIGN KEY (curso_id) REFERENCES cursos(id),
    UNIQUE (estudiante_id, curso_id)
);

CREATE TABLE IF NOT EXISTS cronograma (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curso_id INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    fecha_inicio TEXT,
    fecha_fin TEXT,
    orden INTEGER NOT NULL DEFAULT 0,
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (curso_id) REFERENCES cursos(id)
);
CREATE TABLE IF NOT EXISTS recursos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curso_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    enlace TEXT,
    archivo TEXT,
    archivo_nombre TEXT,
    archivo_tipo TEXT,
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (curso_id) REFERENCES cursos(id)
);