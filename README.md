# 🏥 Sistema de Atendimentos de Pronto Socorro

Projeto Integrador 2 – PUC-Campinas. Um sistema web simples feito para ser **fácil de estudar**.

## Tecnologias

| Parte | Tecnologia | Por quê |
|---|---|---|
| Front-end | HTML + CSS + JavaScript puro | O básico da web, sem frameworks |
| Back-end | Node.js + Express | JavaScript também no servidor |
| Banco de dados | SQLite (já vem no Node 22.5+) | Relacional, sem precisar instalar nada |

## Como rodar

Pré-requisito: **Node.js 22.5 ou superior** (https://nodejs.org).

```bash
npm install        # instala o Express (só na primeira vez)
npm run exemplo    # (opcional) carrega pacientes de exemplo - rode só uma vez
npm start          # inicia o sistema
```

Abra **http://localhost:3000** no navegador.

## Banco de dados

O banco é **local** (SQLite, arquivo único) — não está na nuvem, então não é preciso
nenhum acesso ou senha. Os scripts de criação estão na pasta `BancoDeDados/`:

- `criar_banco.sql` – cria as 4 tabelas. O back-end executa esse script **automaticamente**
  ao iniciar, gerando o arquivo `BancoDeDados/pronto_socorro.db`.
- `dados_exemplo.sql` – (opcional) insere pacientes de exemplo em várias etapas do atendimento.

Também é possível rodar os scripts manualmente com o SQLite:
`sqlite3 pronto_socorro.db < criar_banco.sql`.
Para zerar os dados, basta apagar o arquivo `pronto_socorro.db`.

## Estrutura dos arquivos

```
FrontEnd/              → o que o navegador vê
  index.html           → página inicial
  recepcao.html        → incluir, alterar, consultar e cancelar atendimentos
  triagem.html         → sinais vitais + classificação de Manchester
  medico.html          → painel de atendimento + medicações + confirmação
  css/style.css        → visual de todas as páginas
  js/comum.js          → funções usadas em todas as páginas (ex: api(), máscaras)
  js/recepcao.js, js/triagem.js, js/medico.js → lógica de cada tela
BackEnd/
  server.js            → servidor: todas as rotas da API (/api/...) e regras
  database.js          → conexão com o banco (executa o criar_banco.sql)
BancoDeDados/
  criar_banco.sql      → script de criação das tabelas
  dados_exemplo.sql    → script com dados de exemplo
package.json           → dependências e comandos (npm start / npm run exemplo)
```

## Fluxo do atendimento (status)

```
AGUARDANDO_TRIAGEM → (enfermagem) → AGUARDANDO_MEDICO → (médico) → FINALIZADO
        └──────────── (recepção pode cancelar) ───────────→ CANCELADO
```

## Banco de dados (4 tabelas)

- **pacientes** – dados pessoais (CPF é único, então o paciente não é duplicado)
- **atendimentos** – cada visita ao PS (código AT0001, status, datas)
- **triagens** – pressão, temperatura, batimentos, queixas, classificação
- **medicacoes** – remédios lançados pelo médico (vários por atendimento)

## Rotas da API

| Método | Rota | O que faz |
|---|---|---|
| GET | /api/atendimentos?busca= | Lista/busca atendimentos |
| GET | /api/atendimentos/:id | Consulta completa |
| POST | /api/atendimentos | Inclui (gera ATxxxx) |
| PUT | /api/atendimentos/:id | Altera dados do paciente |
| PATCH | /api/atendimentos/:id/cancelar | Cancela |
| POST | /api/atendimentos/:id/triagem | Registra triagem |
| GET | /api/painel | Fila do médico ordenada por Manchester |
| POST | /api/atendimentos/:id/medicacoes | Lança medicação |
| DELETE | /api/atendimentos/:id/medicacoes/:medId | Exclui medicação (só se houver 2 ou mais) |
| POST | /api/atendimentos/:id/confirmar | Confirma o atendimento (alta) |

## Protocolo de Manchester

| Cor | Prioridade | Tempo máximo |
|---|---|---|
| 🔴 Vermelho | Emergência | Imediato |
| 🟠 Laranja | Muito urgente | 10 min |
| 🟡 Amarelo | Urgente | 60 min |
| 🟢 Verde | Pouco urgente | 120 min |
| 🔵 Azul | Não urgente | 240 min |

## Sugestão de ordem para estudar

1. `BancoDeDados/criar_banco.sql` – entenda as tabelas e como se relacionam.
2. `FrontEnd/recepcao.html` – veja o HTML do formulário e da tabela.
3. `FrontEnd/js/comum.js` – a função `api()` usa `fetch` para falar com o servidor.
4. `FrontEnd/js/recepcao.js` – como o front envia e mostra dados.
5. `BackEnd/server.js` – como o back recebe a requisição, aplica as regras e usa o banco.
6. Repita com triagem e médico – o padrão é sempre o mesmo!
