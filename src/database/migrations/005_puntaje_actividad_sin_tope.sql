-- migrate:foreign-keys-off

CREATE TABLE actividades_sin_tope (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curso_id INTEGER NOT NULL,
    cronograma_id INTEGER,
    creador_id INTEGER NOT NULL,
    titulo TEXT NOT NULL CHECK (length(trim(titulo)) BETWEEN 3 AND 150),
    instrucciones TEXT NOT NULL CHECK (length(trim(instrucciones)) >= 5),
    fecha_limite TEXT NOT NULL CHECK (datetime(fecha_limite) IS NOT NULL),
    puntaje_maximo REAL NOT NULL DEFAULT 5.0 CHECK (puntaje_maximo > 0),
    permite_entrega_tardia INTEGER NOT NULL DEFAULT 0 CHECK (permite_entrega_tardia IN (0, 1)),
    estado TEXT NOT NULL DEFAULT 'publicada' CHECK (estado IN ('borrador', 'publicada', 'cerrada')),
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TEXT,
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    permite_reemplazo_entrega INTEGER NOT NULL DEFAULT 0 CHECK (permite_reemplazo_entrega IN (0, 1)),
    corte_id INTEGER REFERENCES cortes(id),
    tematica_id INTEGER REFERENCES tematicas(id),
    FOREIGN KEY (curso_id) REFERENCES cursos(id),
    FOREIGN KEY (cronograma_id) REFERENCES cronograma(id),
    FOREIGN KEY (creador_id) REFERENCES usuarios(id)
);

INSERT INTO actividades_sin_tope (
    id, curso_id, cronograma_id, creador_id, titulo, instrucciones, fecha_limite,
    puntaje_maximo, permite_entrega_tardia, estado, fecha_creacion, fecha_actualizacion,
    activo, permite_reemplazo_entrega, corte_id, tematica_id
)
SELECT
    id, curso_id, cronograma_id, creador_id, titulo, instrucciones, fecha_limite,
    puntaje_maximo, permite_entrega_tardia, estado, fecha_creacion, fecha_actualizacion,
    activo, permite_reemplazo_entrega, corte_id, tematica_id
FROM actividades;

DROP TABLE actividades;
ALTER TABLE actividades_sin_tope RENAME TO actividades;

CREATE INDEX idx_actividades_curso ON actividades(curso_id, activo, fecha_limite);
CREATE INDEX idx_actividades_corte ON actividades(corte_id);
