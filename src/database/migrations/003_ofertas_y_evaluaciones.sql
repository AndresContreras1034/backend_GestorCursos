CREATE TABLE ofertas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curso_id INTEGER NOT NULL,
    cupos INTEGER NOT NULL CHECK (cupos > 0),
    fecha_apertura TEXT CHECK (
        fecha_apertura IS NULL OR datetime(fecha_apertura) IS NOT NULL
    ),
    fecha_cierre TEXT CHECK (
        fecha_cierre IS NULL OR datetime(fecha_cierre) IS NOT NULL
    ),
    modalidad TEXT NOT NULL CHECK (
        modalidad IN ('virtual', 'presencial', 'hibrida')
    ),
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TEXT,
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    FOREIGN KEY (curso_id) REFERENCES cursos(id),
    CHECK (
        fecha_apertura IS NULL OR fecha_cierre IS NULL OR
        julianday(fecha_cierre) >= julianday(fecha_apertura)
    )
);

ALTER TABLE inscripciones
ADD COLUMN oferta_id INTEGER REFERENCES ofertas(id);

CREATE TABLE evaluaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curso_id INTEGER NOT NULL,
    titulo TEXT NOT NULL CHECK (length(trim(titulo)) BETWEEN 3 AND 150),
    descripcion TEXT,
    fecha_limite TEXT CHECK (
        fecha_limite IS NULL OR datetime(fecha_limite) IS NOT NULL
    ),
    puntaje_maximo REAL NOT NULL DEFAULT 100 CHECK (puntaje_maximo > 0),
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TEXT,
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    FOREIGN KEY (curso_id) REFERENCES cursos(id)
);

CREATE INDEX idx_ofertas_curso_activo ON ofertas(curso_id, activo);
CREATE INDEX idx_inscripciones_oferta_estado ON inscripciones(oferta_id, estado);
CREATE INDEX idx_evaluaciones_curso_activo ON evaluaciones(curso_id, activo);
