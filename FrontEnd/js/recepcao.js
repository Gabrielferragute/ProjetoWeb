// ============================================================
// RECEPÇÃO: incluir, alterar, consultar e cancelar atendimentos
// ============================================================
const form = document.getElementById('formPaciente');
const msgForm = document.getElementById('msgForm');
const msgTabela = document.getElementById('msgTabela');
const tabela = document.getElementById('tabela');
const busca = document.getElementById('busca');
const detalhes = document.getElementById('detalhes');

// Guarda o id do atendimento que está sendo editado (null = modo inclusão)
let idEmEdicao = null;

// Máscaras: os campos só aceitam números e têm tamanho limitado
aplicarMascara(form.cpf, '000.000.000-00');
aplicarMascara(form.rg, '00.000.000-0');
aplicarMascara(form.telefone, '(00) 0000-0000', '(00) 00000-0000'); // fixo ou celular

// Carrega a tabela de atendimentos
async function carregarAtendimentos() {
  const lista = await api('/api/atendimentos?busca=' + encodeURIComponent(busca.value));

  tabela.innerHTML = lista.map(a => {
    // Só mostra Editar/Cancelar se o médico ainda não confirmou
    const podeMexer = a.status !== 'FINALIZADO' && a.status !== 'CANCELADO';
    return `
      <tr>
        <td><strong>${a.codigo}</strong></td>
        <td>${escapar(a.nome)}</td>
        <td>${escapar(a.cpf)}</td>
        <td>${a.data_chegada}</td>
        <td>${etiqueta(a.status)}</td>
        <td>
          <button class="pequeno" onclick="verDetalhes(${a.id})">Ver</button>
          ${podeMexer ? `
            <button class="pequeno cinza" onclick="editar(${a.id})">Editar</button>
            <button class="pequeno perigo" onclick="cancelar(${a.id})">Cancelar</button>` : ''}
        </td>
      </tr>`;
  }).join('') || '<tr><td colspan="6">Nenhum atendimento encontrado.</td></tr>';
}

// Envio do formulário: inclui ou altera, dependendo do modo
form.addEventListener('submit', async (evento) => {
  evento.preventDefault(); // impede a página de recarregar
  const dados = lerFormulario(form);

  try {
    if (idEmEdicao) {
      await api('/api/atendimentos/' + idEmEdicao, 'PUT', dados);
      mostrarMensagem(msgForm, 'Atendimento alterado com sucesso!');
    } else {
      const novo = await api('/api/atendimentos', 'POST', dados);
      mostrarMensagem(msgForm, `Atendimento ${novo.codigo} gerado! Encaminhe o paciente para a triagem.`);
    }
    sairDoModoEdicao();
    carregarAtendimentos();
  } catch (erro) {
    mostrarMensagem(msgForm, erro.message, 'erro');
  }
});

// Preenche o formulário com os dados do atendimento para alterar
async function editar(id) {
  const a = await api('/api/atendimentos/' + id);
  for (const campo of form.elements) {
    if (campo.name) campo.value = a[campo.name] ?? '';
  }
  form.cpf.disabled = true; // CPF identifica o paciente, não deixamos trocar
  idEmEdicao = id;
  document.getElementById('tituloForm').textContent = `Alterar atendimento ${a.codigo}`;
  document.getElementById('btnSalvar').textContent = 'Salvar alterações';
  document.getElementById('btnCancelarEdicao').classList.remove('escondido');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function sairDoModoEdicao() {
  idEmEdicao = null;
  form.reset();
  form.cpf.disabled = false;
  document.getElementById('tituloForm').textContent = 'Novo atendimento';
  document.getElementById('btnSalvar').textContent = 'Gerar atendimento';
  document.getElementById('btnCancelarEdicao').classList.add('escondido');
}
document.getElementById('btnCancelarEdicao').addEventListener('click', sairDoModoEdicao);

// Cancela um atendimento
async function cancelar(id) {
  if (!confirm('Tem certeza que deseja cancelar este atendimento?')) return;
  try {
    await api(`/api/atendimentos/${id}/cancelar`, 'PATCH');
    mostrarMensagem(msgTabela, 'Atendimento cancelado.');
    carregarAtendimentos();
  } catch (erro) {
    mostrarMensagem(msgTabela, erro.message, 'erro');
  }
}

// Mostra todos os dados do atendimento (consulta)
async function verDetalhes(id) {
  const a = await api('/api/atendimentos/' + id);
  const t = a.triagem;

  detalhes.innerHTML = `
    <h2>Atendimento ${a.codigo} ${etiqueta(a.status)}</h2>
    <p><strong>Paciente:</strong> ${escapar(a.nome)} (${calcularIdade(a.data_nascimento)} anos)</p>
    <p><strong>CPF:</strong> ${escapar(a.cpf)} &nbsp; <strong>RG:</strong> ${escapar(a.rg)}</p>
    <p><strong>Nascimento:</strong> ${formatarData(a.data_nascimento)}</p>
    <p><strong>Pai:</strong> ${escapar(a.nome_pai)} &nbsp; <strong>Mãe:</strong> ${escapar(a.nome_mae)}</p>
    <p><strong>Endereço:</strong> ${escapar(a.endereco)} &nbsp; <strong>Telefone:</strong> ${escapar(a.telefone)}</p>
    <p><strong>Chegada:</strong> ${a.data_chegada}</p>
    ${t ? `<p><strong>Triagem:</strong> ${etiqueta(t.classificacao)} PA ${escapar(t.pressao)},
           ${t.temperatura} °C, ${t.batimentos} bpm — ${escapar(t.queixas)}</p>` : ''}
    ${a.medicacoes.length ? `<p><strong>Medicações:</strong> ${a.medicacoes
        .map(m => `${escapar(m.nome)} (${escapar(m.dosagem)})`).join(', ')}</p>` : ''}
    ${a.data_confirmacao ? `<p><strong>Alta médica:</strong> ${a.data_confirmacao}</p>` : ''}
  `;
  detalhes.classList.remove('escondido');
  detalhes.scrollIntoView({ behavior: 'smooth' });
}

// Atualiza a tabela enquanto o usuário digita na busca
busca.addEventListener('input', carregarAtendimentos);

carregarAtendimentos();
