INSERT INTO services (code, name, description) VALUES
('INS', 'Inscripciones y Reinscripciones', 'Trámites de carga académica y registro escolar'),
('CAJ', 'Caja y Pagos', 'Pago de aranceles, constancias y colegiaturas'),
('INF', 'Información General', 'Orientación estudiantil y recepción de documentos')
ON CONFLICT (code) DO NOTHING;

INSERT INTO operators (name, window_number) VALUES
('Ana López', 'Ventanilla 1'),
('Carlos Méndez', 'Ventanilla 2')
ON CONFLICT (window_number) DO NOTHING;