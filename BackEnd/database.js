// ============================================================
// BANCO DE DADOS
// Usamos o SQLite que já vem embutido no Node.js (versão 22.5+).
// O banco é um único arquivo: "BancoDeDados/pronto_socorro.db".
// As tabelas são criadas pelo script "BancoDeDados/criar_banco.sql".
// ============================================================
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

// Pasta onde ficam o arquivo do banco e os scripts SQL
const PASTA_BANCO = path.join(__dirname, '..', 'BancoDeDados');

// O nome do arquivo pode ser trocado pela variável de ambiente DB_ARQUIVO (útil para testes)
const arquivo = process.env.DB_ARQUIVO || path.join(PASTA_BANCO, 'pronto_socorro.db');
const db = new DatabaseSync(arquivo);

// Executa um script .sql da pasta BancoDeDados
function executarScript(nomeArquivo) {
  const sql = fs.readFileSync(path.join(PASTA_BANCO, nomeArquivo), 'utf8');
  db.exec(sql);
}

// Cria as tabelas (o script usa "IF NOT EXISTS", então pode rodar sempre)
executarScript('criar_banco.sql');

// Permite carregar os dados de exemplo pelo terminal: npm run exemplo
if (require.main === module && process.argv.includes('--exemplo')) {
  executarScript('dados_exemplo.sql');
  console.log('Dados de exemplo carregados em', arquivo);
}

module.exports = db;
