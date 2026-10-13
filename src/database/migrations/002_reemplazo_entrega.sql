ALTER TABLE actividades
ADD COLUMN permite_reemplazo_entrega INTEGER NOT NULL DEFAULT 0
CHECK (permite_reemplazo_entrega IN (0, 1));
