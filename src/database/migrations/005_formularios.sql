CREATE TABLE formularios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docente_id INTEGER NOT NULL REFERENCES usuarios(id),
    titulo TEXT NOT NULL CHECK (length(trim(titulo)) BETWEEN 3 AND 150),
    descripcion TEXT,
    origen TEXT NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual', 'ia')),
    prompt_ia TEXT,
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TEXT,
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
);

CREATE TABLE formulario_preguntas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    formulario_id INTEGER NOT NULL REFERENCES formularios(id) ON DELETE CASCADE,
    orden INTEGER NOT NULL,
    enunciado TEXT NOT NULL CHECK (length(trim(enunciado)) >= 3),
    tipo TEXT NOT NULL CHECK (tipo IN ('seleccion_unica', 'seleccion_multiple')),
    puntaje REAL NOT NULL DEFAULT 1 CHECK (puntaje > 0),
    explicacion TEXT
);

CREATE TABLE formulario_opciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pregunta_id INTEGER NOT NULL REFERENCES formulario_preguntas(id) ON DELETE CASCADE,
    orden INTEGER NOT NULL,
    texto TEXT NOT NULL CHECK (length(trim(texto)) >= 1),
    es_correcta INTEGER NOT NULL DEFAULT 0 CHECK (es_correcta IN (0, 1))
);

CREATE TABLE formulario_asignaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    formulario_id INTEGER NOT NULL REFERENCES formularios(id),
    curso_id INTEGER NOT NULL REFERENCES cursos(id),
    actividad_id INTEGER REFERENCES actividades(id),
    fecha_apertura TEXT CHECK (fecha_apertura IS NULL OR datetime(fecha_apertura) IS NOT NULL),
    fecha_cierre TEXT CHECK (fecha_cierre IS NULL OR datetime(fecha_cierre) IS NOT NULL),
    puntaje_maximo REAL NOT NULL DEFAULT 5 CHECK (puntaje_maximo > 0 AND puntaje_maximo <= 100),
    revision_docente INTEGER NOT NULL DEFAULT 1 CHECK (revision_docente IN (0, 1)),
    resultados_publicados INTEGER NOT NULL DEFAULT 0 CHECK (resultados_publicados IN (0, 1)),
    estado TEXT NOT NULL DEFAULT 'publicada' CHECK (estado IN ('borrador', 'publicada', 'cerrada')),
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
);

CREATE TABLE formulario_envios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asignacion_id INTEGER NOT NULL REFERENCES formulario_asignaciones(id),
    estudiante_id INTEGER NOT NULL REFERENCES usuarios(id),
    fecha_envio TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    puntos_obtenidos REAL NOT NULL CHECK (puntos_obtenidos >= 0),
    puntos_totales REAL NOT NULL CHECK (puntos_totales > 0),
    nota REAL NOT NULL CHECK (nota >= 0),
    UNIQUE (asignacion_id, estudiante_id)
);

CREATE TABLE formulario_respuestas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    envio_id INTEGER NOT NULL REFERENCES formulario_envios(id) ON DELETE CASCADE,
    pregunta_id INTEGER NOT NULL REFERENCES formulario_preguntas(id),
    opciones_ids TEXT NOT NULL,
    es_correcta INTEGER NOT NULL CHECK (es_correcta IN (0, 1)),
    puntos REAL NOT NULL CHECK (puntos >= 0)
);

CREATE INDEX idx_formularios_docente ON formularios(docente_id, activo);
CREATE INDEX idx_preguntas_formulario ON formulario_preguntas(formulario_id, orden);
CREATE INDEX idx_opciones_pregunta ON formulario_opciones(pregunta_id);
CREATE INDEX idx_asignaciones_curso ON formulario_asignaciones(curso_id, activo);
CREATE INDEX idx_asignaciones_formulario ON formulario_asignaciones(formulario_id);
CREATE INDEX idx_envios_asignacion ON formulario_envios(asignacion_id);
CREATE INDEX idx_respuestas_envio ON formulario_respuestas(envio_id);
