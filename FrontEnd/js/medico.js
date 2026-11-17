// ============================================================
// MÉDICO: painel de atendimento, medicações e confirmação
// ============================================================
const painel = document.getElementById('painel');
const msg = document.getElementById('msg');
const area = document.getElementById('areaAtendimento');
const formMedicacao = document.getElementById('formMedicacao');

let idAtual = null; // atendimento aberto pelo médico

// Carrega o painel (o back-end já devolve na ordem certa)
async function carregarPainel() {
  const lista = await api('/api/painel');

  painel.innerHTML = lista.map((a, posicao) => `
    <tr>
      <td>${posicao + 1}º</td>
      <td>${etiqueta(a.classificacao)}</td>
      <td><strong>${a.codigo}</strong></td>
      <td>${escapar(a.nome)}</td>
      <td>${calcularIdade(a.data_nascimento)}</td>
      <td>${formatarData(a.data_nascimento)}</td>
      <td>${escapar(a.queixas)}</td>
      <td>${a.data_chegada}</td>
      <td><button class="pequeno" onclick="abrirAtendimento(${a.id})">Chamar</button></td>
    </tr>`).join('') || '<tr><td colspan="9">Nenhum paciente aguardando atendimento.</td></tr>';
}

// Abre a tela do atendimento com os dados do paciente e da triagem
async function abrirAtendimento(id) {
  idAtual = id;
  const a = await api('/api/atendimentos/' + id);
  const t = a.triagem;

  document.getElementById('dadosPaciente').innerHTML = `
    <h2>Atendimento ${a.codigo} ${etiqueta(t.classificacao)}</h2>
    <p><strong>Paciente:</strong> ${escapar(a.nome)} — ${calcularIdade(a.data_nascimento)} anos</p>
    <p><strong>Pressão:</strong> ${escapar(t.pressao)} &nbsp;
       <strong>Temperatura:</strong> ${t.temperatura} °C &nbsp;
       <strong>Batimentos:</strong> ${t.batimentos} bpm</p>
    <p><strong>Queixas:</strong> ${escapar(t.queixas)}</p>
  `;

  // Regra: o atendimento sempre fica com pelo menos 1 medicação,
  // por isso o botão Excluir só aparece quando há 2 ou mais.
  const podeExcluir = a.medicacoes.length >= 2;

  document.getElementById('listaMedicacoes').innerHTML = a.medicacoes.map(m => `
    <tr>
      <td>${escapar(m.nome)}</td><td>${escapar(m.dosagem)}</td><td>${escapar(m.observacao)}</td>
      <td>${podeExcluir ? `<button class="pequeno perigo" onclick="excluirMedicacao(${m.id})">Excluir</button>` : ''}</td>
    </tr>
  `).join('') || '<tr><td colspan="4">Nenhuma medicação lançada.</td></tr>';

  area.classList.remove('escondido');
  area.scrollIntoView({ behavior: 'smooth' });
}

function fecharAtendimento() {
  idAtual = null;
  area.classList.add('escondido');
  carregarPainel();
}

// Adiciona uma medicação ao atendimento aberto
formMedicacao.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  try {
    await api(`/api/atendimentos/${idAtual}/medicacoes`, 'POST', lerFormulario(formMedicacao));
    formMedicacao.reset();
    abrirAtendimento(idAtual); // recarrega para mostrar a nova medicação
  } catch (erro) {
    alert(erro.message);
  }
});

// Exclui uma medicação já lançada
async function excluirMedicacao(medicacaoId) {
  if (!confirm('Excluir esta medicação?')) return;
  try {
    await api(`/api/atendimentos/${idAtual}/medicacoes/${medicacaoId}`, 'DELETE');
    abrirAtendimento(idAtual); // recarrega a lista
  } catch (erro) {
    alert(erro.message);
  }
}

// Confirma o atendimento: o paciente recebe alta e sai do painel
async function confirmarAtendimento() {
  if (!confirm('Confirmar o atendimento e dar alta ao paciente?')) return;
  try {
    await api(`/api/atendimentos/${idAtual}/confirmar`, 'POST');
    mostrarMensagem(msg, 'Atendimento confirmado com sucesso!');
    fecharAtendimento();
  } catch (erro) {
    alert(erro.message);
  }
}

carregarPainel();
// Atualiza o painel automaticamente, para ver novos pacientes vindos da triagem
setInterval(carregarPainel, 10000);
