-- ============================================================
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS
-- Sistema de Atendimentos de Pronto Socorro - Projeto Integrador 2
-- Banco relacional: SQLite
--
-- Este script é executado automaticamente pelo back-end ao iniciar
-- (BackEnd/database.js). Também pode ser rodado manualmente:
--   sqlite3 pronto_socorro.db < criar_banco.sql
-- ============================================================

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- PACIENTES: dados pessoais (preenchidos pela recepção)
-- O CPF é único para não duplicar o mesmo paciente.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pacientes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nome            TEXT NOT NULL,
  cpf             TEXT NOT NULL UNIQUE,      -- formato 000.000.000-00
  rg              TEXT,                      -- formato 00.000.000-0
  data_nascimento TEXT NOT NULL,             -- formato AAAA-MM-DD
  nome_pai        TEXT,
  nome_mae        TEXT,
  endereco        TEXT,
  telefone        TEXT                       -- formato (00) 00000-0000
);

-- ------------------------------------------------------------
-- ATENDIMENTOS: cada visita do paciente ao Pronto Socorro
-- codigo: AT0001, AT0002... (gerado a partir do id)
-- status: AGUARDANDO_TRIAGEM -> AGUARDANDO_MEDICO -> FINALIZADO
--         ou CANCELADO (pela recepção, antes da confirmação do médico)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS atendimentos (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo           TEXT UNIQUE,
  paciente_id      INTEGER NOT NULL REFERENCES pacientes(id),
  status           TEXT NOT NULL DEFAULT 'AGUARDANDO_TRIAGEM'
                   CHECK (status IN ('AGUARDANDO_TRIAGEM', 'AGUARDANDO_MEDICO', 'FINALIZADO', 'CANCELADO')),
  data_chegada     TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  data_confirmacao TEXT                      -- preenchida quando o médico confirma (alta)
);

-- ------------------------------------------------------------
-- TRIAGENS: dados registrados pela enfermagem (1 por atendimento)
-- classificacao: Protocolo de Manchester
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS triagens (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  atendimento_id INTEGER NOT NULL UNIQUE REFERENCES atendimentos(id),
  pressao        TEXT NOT NULL,              -- ex: 120/80
  temperatura    REAL NOT NULL,              -- em °C
  batimentos     INTEGER NOT NULL,           -- em bpm
  queixas        TEXT NOT NULL,
  classificacao  TEXT NOT NULL
                 CHECK (classificacao IN ('VERMELHO', 'LARANJA', 'AMARELO', 'VERDE', 'AZUL')),
  data_triagem   TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- ------------------------------------------------------------
-- MEDICACOES: medicamentos lançados pelo médico (vários por atendimento)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medicacoes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  atendimento_id INTEGER NOT NULL REFERENCES atendimentos(id),
  nome           TEXT NOT NULL,
  dosagem        TEXT NOT NULL,
  observacao     TEXT
);
