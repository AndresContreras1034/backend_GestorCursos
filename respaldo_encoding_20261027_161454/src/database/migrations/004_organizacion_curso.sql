-- =====================================================
-- OrganizaciÃ³n realista del curso: modalidad, ubicaciÃ³n, estado,
-- nota mÃ­nima, cupo, 3 cortes, temÃ¡ticas, horario semanal,
-- matrÃ­cula por docente y lista de espera.
-- =====================================================
ALTER TABLE cursos ADD COLUMN modalidad TEXT NOT NULL DEFAULT 'virtual'
    CHECK (modalidad IN ('virtual', 'presencial', 'hibrida'));
ALTER TABLE cursos ADD COLUMN semestre TEXT
    CHECK (semestre IS NULL OR semestre GLOB '[0-9][0-9][0-9][0-9]-[12]');
ALTER TABLE cursos ADD COLUMN codigo TEXT;
ALTER TABLE cursos ADD COLUMN estado TEXT NOT NULL DEFAULT 'abierto'
    CHECK (estado IN ('borrador', 'abierto', 'en_curso', 'finalizado'));
ALTER TABLE cursos ADD COLUMN ubicacion_nombre TEXT;
ALTER TABLE cursos ADD COLUMN latitud REAL
    CHECK (latitud IS NULL OR latitud BETWEEN -90 AND 90);
ALTER TABLE cursos ADD COLUMN longitud REAL
    CHECK (longitud IS NULL OR longitud BETWEEN -180 AND 180);
ALTER TABLE cursos ADD COLUMN enlace_virtual TEXT
    CHECK (enlace_virtual IS NULL OR enlace_virtual LIKE 'http://%' OR enlace_virtual LIKE 'https://%');
ALTER TABLE cursos ADD COLUMN nota_minima REAL NOT NULL DEFAULT 3.0
    CHECK (nota_minima > 0 AND nota_minima <= 5);
ALTER TABLE cursos ADD COLUMN cupo_maximo INTEGER
    CHECK (cupo_maximo IS NULL OR cupo_maximo > 0);

CREATE UNIQUE INDEX idx_cursos_codigo ON cursos(codigo COLLATE NOCASE) WHERE codigo IS NOT NULL;

CREATE TABLE cortes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curso_id INTEGER NOT NULL,
    numero INTEGER NOT NULL CHECK (numero BETWEEN 1 AND 3),
    fecha_inicio TEXT NOT NULL CHECK (date(fecha_inicio) = fecha_inicio),
    fecha_fin TEXT NOT NULL CHECK (date(fecha_fin) = fecha_fin),
    porcentaje REAL NOT NULL CHECK (porcentaje > 0 AND porcentaje <= 100),
    fecha_actualizacion TEXT,
    FOREIGN KEY (curso_id) REFERENCES cursos(id),
    UNIQUE (curso_id, numero),
    CHECK (fecha_fin >= fecha_inicio)
);

CREATE TABLE tematicas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curso_id INTEGER NOT NULL,
    nombre TEXT NOT NULL CHECK (length(trim(nombre)) BETWEEN 2 AND 120),
    descripcion TEXT,
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (curso_id) REFERENCES cursos(id)
);
CREATE UNIQUE INDEX idx_tematicas_nombre ON tematicas(curso_id, nombre COLLATE NOCASE);

-- Una temÃ¡tica puede estar en varios cortes y un corte tiene varias temÃ¡ticas
CREATE TABLE corte_tematicas (
    corte_id INTEGER NOT NULL,
    tematica_id INTEGER NOT NULL,
    orden INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (corte_id, tematica_id),
    FOREIGN KEY (corte_id) REFERENCES cortes(id) ON DELETE CASCADE,
    FOREIGN KEY (tematica_id) REFERENCES tematicas(id) ON DELETE CASCADE
);

CREATE TABLE horarios_curso (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curso_id INTEGER NOT NULL,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),  -- 1 = lunes
    hora_inicio TEXT NOT NULL CHECK (hora_inicio GLOB '[0-2][0-9]:[0-5][0-9]'),
    hora_fin TEXT NOT NULL CHECK (hora_fin GLOB '[0-2][0-9]:[0-5][0-9]'),
    salon TEXT,
    FOREIGN KEY (curso_id) REFERENCES cursos(id),
    CHECK (hora_fin > hora_inicio)
);

ALTER TABLE actividades ADD COLUMN corte_id INTEGER REFERENCES cortes(id);
ALTER TABLE actividades ADD COLUMN tematica_id INTEGER REFERENCES tematicas(id);

-- QuiÃ©n matriculÃ³ (NULL = el propio estudiante se inscribiÃ³)
ALTER TABLE inscripciones ADD COLUMN matriculado_por INTEGER REFERENCES usuarios(id);

CREATE TABLE lista_espera (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curso_id INTEGER NOT NULL,
    estudiante_id INTEGER NOT NULL,
    oferta_id INTEGER REFERENCES ofertas(id),
    fecha_solicitud TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado TEXT NOT NULL DEFAULT 'esperando' CHECK (estado IN ('esperando', 'promovida', 'cancelada')),
    FOREIGN KEY (curso_id) REFERENCES cursos(id),
    FOREIGN KEY (estudiante_id) REFERENCES usuarios(id)
);
CREATE UNIQUE INDEX idx_espera_unica ON lista_espera(curso_id, estudiante_id) WHERE estado = 'esperando';
CREATE INDEX idx_espera_curso ON lista_espera(curso_id, estado, id);
CREATE INDEX idx_actividades_corte ON actividades(corte_id);
CREATE INDEX idx_horarios_curso ON horarios_curso(curso_id);
CREATE INDEX idx_cursos_estado ON cursos(estado, activo);
