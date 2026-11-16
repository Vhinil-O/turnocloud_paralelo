CREATE TYPE ticket_status AS ENUM ('pendiente', 'en_atencion', 'atendido', 'cancelado');

CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(20) NOT NULL, -- Ej: 'CAJA-001'
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    operator_id INTEGER REFERENCES operators(id) ON DELETE SET NULL,
    requester_name VARCHAR(100) NOT NULL,
    status ticket_status NOT NULL DEFAULT 'pendiente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_tickets_status_created ON tickets(status, created_at);