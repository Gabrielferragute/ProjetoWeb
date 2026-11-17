// ============================================================
// BACK-END (servidor)
// - Entrega as páginas HTML da pasta "public"
// - Oferece uma API (rotas /api/...) que o front-end chama com fetch()
// ============================================================
const express = require('express');
const path = require('node:path');
const db = require('./database');

const app = express();
const PORTA = process.env.PORT || 3000;

app.use(express.json());                                     // permite ler JSON enviado pelo front
app.use(express.static(path.join(__dirname, '..', 'FrontEnd'))); // serve os arquivos HTML, CSS e JS

// Ordem de prioridade do Protocolo de Manchester (1 = mais urgente)
const PRIORIDADE = { VERMELHO: 1, LARANJA: 2, AMARELO: 3, VERDE: 4, AZUL: 5 };

// Função auxiliar: o SQLite não aceita "undefined", então campos opcionais
// que não vieram no formulário são convertidos para null (vazio no banco).
function vazioParaNull(valor) {
  return valor === undefined || valor === '' ? null : valor;
}

// Função auxiliar: devolve os dados do paciente na ordem usada nos SQLs abaixo
function camposPaciente(p) {
  return [p.nome, p.rg, p.data_nascimento, p.nome_pai, p.nome_mae, p.endereco, p.telefone].map(vazioParaNull);
}

// Valida os dados do paciente. Devolve a mensagem de erro, ou null se estiver tudo certo.
// O front já tem máscaras, mas validamos aqui também porque qualquer pessoa
// pode chamar a API direto (sem passar pela tela).
function validarPaciente(p, validarCpf) {
  if (!p.nome || !p.data_nascimento) return 'Nome e data de nascimento são obrigatórios';
  if (validarCpf && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(p.cpf || '')) return 'CPF inválido (use 000.000.000-00)';
  if (p.rg && !/^\d{2}\.\d{3}\.\d{3}-\d$/.test(p.rg)) return 'RG inválido (use 00.000.000-0)';
  if (p.telefone && !/^\(\d{2}\) \d{4,5}-\d{4}$/.test(p.telefone)) return 'Telefone inválido';

  // Limite de tamanho para os campos de texto livre
  const limites = { nome: 100, nome_pai: 100, nome_mae: 100, endereco: 150 };
  for (const campo in limites) {
    if (p[campo] && p[campo].length > limites[campo]) return `O campo ${campo} passou de ${limites[campo]} caracteres`;
  }
  return null;
}

// Função auxiliar: busca um atendimento com os dados do paciente
function buscarAtendimento(id) {
  return db.prepare(`
    SELECT a.*, p.nome, p.cpf, p.rg, p.data_nascimento, p.nome_pai,
           p.nome_mae, p.endereco, p.telefone
    FROM atendimentos a
    JOIN pacientes p ON p.id = a.paciente_id
    WHERE a.id = ?
  `).get(id);
}

// ------------------------------------------------------------
// RECEPÇÃO
// ------------------------------------------------------------

// Listar atendimentos (opcionalmente filtrando pelo nome/CPF/código)
app.get('/api/atendimentos', (req, res) => {
  const busca = `%${req.query.busca || ''}%`;
  const lista = db.prepare(`
    SELECT a.id, a.codigo, a.status, a.data_chegada, p.nome, p.cpf
    FROM atendimentos a
    JOIN pacientes p ON p.id = a.paciente_id
    WHERE p.nome LIKE ? OR p.cpf LIKE ? OR a.codigo LIKE ?
    ORDER BY a.id DESC
  `).all(busca, busca, busca);
  res.json(lista);
});

// Consultar um atendimento completo (paciente + triagem + medicações)
app.get('/api/atendimentos/:id', (req, res) => {
  const atendimento = buscarAtendimento(req.params.id);
  if (!atendimento) return res.status(404).json({ erro: 'Atendimento não encontrado' });

  atendimento.triagem = db.prepare('SELECT * FROM triagens WHERE atendimento_id = ?').get(req.params.id) || null;
  atendimento.medicacoes = db.prepare('SELECT * FROM medicacoes WHERE atendimento_id = ?').all(req.params.id);
  res.json(atendimento);
});

// Incluir um novo atendimento
app.post('/api/atendimentos', (req, res) => {
  const p = req.body;
  const erro = validarPaciente(p, true);
  if (erro) return res.status(400).json({ erro });

  // Se o paciente já veio antes (mesmo CPF), reaproveitamos o cadastro
  // e só atualizamos os dados. Assim não duplicamos pacientes no banco.
  let paciente = db.prepare('SELECT id FROM pacientes WHERE cpf = ?').get(p.cpf);
  if (paciente) {
    db.prepare(`UPDATE pacientes SET nome=?, rg=?, data_nascimento=?, nome_pai=?, nome_mae=?, endereco=?, telefone=?
                WHERE id=?`)
      .run(...camposPaciente(p), paciente.id);
  } else {
    const r = db.prepare(`INSERT INTO pacientes (cpf, nome, rg, data_nascimento, nome_pai, nome_mae, endereco, telefone)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(p.cpf, ...camposPaciente(p));
    paciente = { id: r.lastInsertRowid };
  }

  // Cria o atendimento e gera o código no formato AT0001 a partir do id
  const r = db.prepare('INSERT INTO atendimentos (paciente_id) VALUES (?)').run(paciente.id);
  const codigo = 'AT' + String(r.lastInsertRowid).padStart(4, '0');
  db.prepare('UPDATE atendimentos SET codigo = ? WHERE id = ?').run(codigo, r.lastInsertRowid);

  res.status(201).json({ id: r.lastInsertRowid, codigo });
});

// Alterar os dados do paciente de um atendimento
app.put('/api/atendimentos/:id', (req, res) => {
  const atendimento = buscarAtendimento(req.params.id);
  if (!atendimento) return res.status(404).json({ erro: 'Atendimento não encontrado' });

  // Regra do escopo: só pode alterar se o médico ainda não confirmou
  if (atendimento.status === 'FINALIZADO' || atendimento.status === 'CANCELADO') {
    return res.status(400).json({ erro: 'Atendimento finalizado ou cancelado não pode ser alterado' });
  }

  const p = req.body;
  const erro = validarPaciente(p, false); // o CPF não é alterado na edição
  if (erro) return res.status(400).json({ erro });
  db.prepare(`UPDATE pacientes SET nome=?, rg=?, data_nascimento=?, nome_pai=?, nome_mae=?, endereco=?, telefone=?
              WHERE id=?`)
    .run(...camposPaciente(p), atendimento.paciente_id);
  res.json({ mensagem: 'Atendimento alterado' });
});

// Cancelar um atendimento
app.patch('/api/atendimentos/:id/cancelar', (req, res) => {
  const atendimento = buscarAtendimento(req.params.id);
  if (!atendimento) return res.status(404).json({ erro: 'Atendimento não encontrado' });

  // Regra do escopo: só pode cancelar se o médico ainda não confirmou
  if (atendimento.status === 'FINALIZADO') {
    return res.status(400).json({ erro: 'Atendimento já confirmado pelo médico não pode ser cancelado' });
  }

  db.prepare("UPDATE atendimentos SET status = 'CANCELADO' WHERE id = ?").run(req.params.id);
  res.json({ mensagem: 'Atendimento cancelado' });
});

// ------------------------------------------------------------
// TRIAGEM (ENFERMAGEM)
// ------------------------------------------------------------
app.post('/api/atendimentos/:id/triagem', (req, res) => {
  const atendimento = buscarAtendimento(req.params.id);
  if (!atendimento) return res.status(404).json({ erro: 'Atendimento não encontrado' });
  if (atendimento.status !== 'AGUARDANDO_TRIAGEM') {
    return res.status(400).json({ erro: 'Este atendimento não está aguardando triagem' });
  }

  const t = req.body;
  if (!t.pressao || !t.temperatura || !t.batimentos || !t.queixas) {
    return res.status(400).json({ erro: 'Preencha todos os campos da triagem' });
  }
  if (!PRIORIDADE[t.classificacao]) {
    return res.status(400).json({ erro: 'Classificação de Manchester inválida' });
  }

  db.prepare(`INSERT INTO triagens (atendimento_id, pressao, temperatura, batimentos, queixas, classificacao)
              VALUES (?, ?, ?, ?, ?, ?)`)
    .run(req.params.id, t.pressao, t.temperatura, t.batimentos, t.queixas, t.classificacao);

  // Depois da triagem, o paciente passa a esperar o médico
  db.prepare("UPDATE atendimentos SET status = 'AGUARDANDO_MEDICO' WHERE id = ?").run(req.params.id);
  res.status(201).json({ mensagem: 'Triagem registrada' });
});

// ------------------------------------------------------------
// MÉDICO
// ------------------------------------------------------------

// Painel: pacientes que já passaram pela triagem, do mais urgente ao menos urgente.
// Em caso de empate na cor, quem chegou primeiro é atendido primeiro.
app.get('/api/painel', (req, res) => {
  const lista = db.prepare(`
    SELECT a.id, a.codigo, a.data_chegada, p.nome, p.data_nascimento,
           t.classificacao, t.queixas
    FROM atendimentos a
    JOIN pacientes p ON p.id = a.paciente_id
    JOIN triagens  t ON t.atendimento_id = a.id
    WHERE a.status = 'AGUARDANDO_MEDICO'
    ORDER BY CASE t.classificacao
               WHEN 'VERMELHO' THEN 1 WHEN 'LARANJA' THEN 2 WHEN 'AMARELO' THEN 3
               WHEN 'VERDE' THEN 4 ELSE 5 END,
             a.data_chegada
  `).all();
  res.json(lista);
});

// Lançar uma medicação
app.post('/api/atendimentos/:id/medicacoes', (req, res) => {
  const atendimento = buscarAtendimento(req.params.id);
  if (!atendimento) return res.status(404).json({ erro: 'Atendimento não encontrado' });
  if (atendimento.status !== 'AGUARDANDO_MEDICO') {
    return res.status(400).json({ erro: 'Só é possível medicar atendimentos aguardando o médico' });
  }

  const m = req.body;
  if (!m.nome || !m.dosagem) return res.status(400).json({ erro: 'Informe nome e dosagem' });

  db.prepare('INSERT INTO medicacoes (atendimento_id, nome, dosagem, observacao) VALUES (?, ?, ?, ?)')
    .run(req.params.id, m.nome, m.dosagem, vazioParaNull(m.observacao));
  res.status(201).json({ mensagem: 'Medicação registrada' });
});

// Excluir uma medicação lançada
app.delete('/api/atendimentos/:id/medicacoes/:medicacaoId', (req, res) => {
  const atendimento = buscarAtendimento(req.params.id);
  if (!atendimento) return res.status(404).json({ erro: 'Atendimento não encontrado' });
  if (atendimento.status !== 'AGUARDANDO_MEDICO') {
    return res.status(400).json({ erro: 'Só é possível excluir medicações de atendimentos em andamento' });
  }

  // Regra: o atendimento precisa ficar com pelo menos 1 medicação,
  // então só deixamos excluir quando houver 2 ou mais lançadas.
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM medicacoes WHERE atendimento_id = ?').get(req.params.id);
  if (total <= 1) {
    return res.status(400).json({ erro: 'O atendimento precisa ter pelo menos 1 medicação' });
  }

  // O "AND atendimento_id = ?" garante que a medicação pertence a este atendimento
  const r = db.prepare('DELETE FROM medicacoes WHERE id = ? AND atendimento_id = ?')
    .run(req.params.medicacaoId, req.params.id);
  if (r.changes === 0) return res.status(404).json({ erro: 'Medicação não encontrada' });
  res.json({ mensagem: 'Medicação excluída' });
});

// Confirmar (finalizar) o atendimento = alta médica
app.post('/api/atendimentos/:id/confirmar', (req, res) => {
  const atendimento = buscarAtendimento(req.params.id);
  if (!atendimento) return res.status(404).json({ erro: 'Atendimento não encontrado' });
  if (atendimento.status !== 'AGUARDANDO_MEDICO') {
    return res.status(400).json({ erro: 'Este atendimento não está aguardando o médico' });
  }

  db.prepare(`UPDATE atendimentos SET status = 'FINALIZADO', data_confirmacao = datetime('now', 'localtime')
              WHERE id = ?`).run(req.params.id);
  res.json({ mensagem: 'Atendimento confirmado' });
});

app.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
});
