-- ============================================================
-- DADOS DE EXEMPLO (opcional)
-- Insere alguns pacientes em etapas diferentes do atendimento,
-- para facilitar a demonstração do sistema.
--
-- Como carregar:  npm run exemplo
-- (ou manualmente: sqlite3 pronto_socorro.db < dados_exemplo.sql)
-- Rode só uma vez: o CPF é único e repetir causará erro.
-- ============================================================

INSERT INTO pacientes (nome, cpf, rg, data_nascimento, nome_pai, nome_mae, endereco, telefone) VALUES
  ('Maria Aparecida Souza', '123.456.789-00', '12.345.678-9', '1958-03-14', 'José Souza',     'Ana Souza',     'Rua das Flores, 100 - Campinas',   '(19) 99876-5432'),
  ('João Pedro Lima',       '987.654.321-00', '98.765.432-1', '1992-07-22', 'Carlos Lima',    'Fernanda Lima', 'Av. Brasil, 2500 - Campinas',      '(19) 3251-4040'),
  ('Lucas Ferreira',        '456.789.123-00', '45.678.912-3', '2010-11-05', 'Marcos Ferreira','Paula Ferreira','Rua Barão de Jaguara, 50 - Campinas','(19) 98123-4567'),
  ('Beatriz Santos',        '321.654.987-00', NULL,           '1985-01-30', NULL,             'Lúcia Santos',  'Rua Ipiranga, 77 - Campinas',      '(19) 99111-2222');

-- Atendimentos (o código segue o padrão AT + id com 4 dígitos)
INSERT INTO atendimentos (id, codigo, paciente_id, status, data_chegada, data_confirmacao) VALUES
  (1, 'AT0001', 1, 'AGUARDANDO_MEDICO',  datetime('now', 'localtime', '-50 minutes'), NULL),
  (2, 'AT0002', 2, 'AGUARDANDO_MEDICO',  datetime('now', 'localtime', '-40 minutes'), NULL),
  (3, 'AT0003', 3, 'AGUARDANDO_TRIAGEM', datetime('now', 'localtime', '-10 minutes'), NULL),
  (4, 'AT0004', 4, 'FINALIZADO',         datetime('now', 'localtime', '-3 hours'),
                                         datetime('now', 'localtime', '-2 hours'));

-- Triagens (o AT0003 ainda não passou pela triagem)
INSERT INTO triagens (atendimento_id, pressao, temperatura, batimentos, queixas, classificacao) VALUES
  (1, '160/100', 37.2, 110, 'Dor no peito e falta de ar',   'LARANJA'),
  (2, '120/80',  38.5, 90,  'Febre, dor de cabeça e enjoo', 'AMARELO'),
  (4, '110/70',  36.8, 75,  'Dor muscular nas costas',      'VERDE');

-- Medicações (o AT0004 já foi atendido e recebeu alta)
INSERT INTO medicacoes (atendimento_id, nome, dosagem, observacao) VALUES
  (4, 'Dipirona',   '1g',   'Via oral, de 6 em 6 horas'),
  (4, 'Ciclobenzaprina', '5mg', 'Via oral, à noite');
