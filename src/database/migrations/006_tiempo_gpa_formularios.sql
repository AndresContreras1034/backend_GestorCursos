ALTER TABLE formulario_asignaciones
    ADD COLUMN duracion_minutos INTEGER
    CHECK (duracion_minutos IS NULL OR duracion_minutos BETWEEN 1 AND 1440);

CREATE TABLE formulario_intentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asignacion_id INTEGER NOT NULL REFERENCES formulario_asignaciones(id) ON DELETE CASCADE,
    estudiante_id INTEGER NOT NULL REFERENCES usuarios(id),
    fecha_inicio TEXT NOT NULL,
    UNIQUE (asignacion_id, estudiante_id)
);

CREATE INDEX idx_intentos_asignacion_estudiante
    ON formulario_intentos(asignacion_id, estudiante_id);

UPDATE formulario_envios
SET nota = ROUND(
    nota * 5.0 / (
        SELECT puntaje_maximo
        FROM formulario_asignaciones
        WHERE id = formulario_envios.asignacion_id
    ),
    2
)
WHERE EXISTS (
    SELECT 1
    FROM formulario_asignaciones
    WHERE id = formulario_envios.asignacion_id
      AND puntaje_maximo <> 5
);

UPDATE formulario_asignaciones
SET puntaje_maximo = 5
WHERE puntaje_maximo <> 5;
