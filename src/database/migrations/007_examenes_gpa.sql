ALTER TABLE formulario_asignaciones
    ADD COLUMN corte_id INTEGER REFERENCES cortes(id);

CREATE INDEX idx_formulario_asignaciones_corte
    ON formulario_asignaciones(corte_id, resultados_publicados, activo);
