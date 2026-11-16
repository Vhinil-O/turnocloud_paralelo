CREATE TABLE IF NOT EXISTS ticket_logs (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    previous_status ticket_status,
    new_status ticket_status NOT NULL,
    operator_id INTEGER REFERENCES operators(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);