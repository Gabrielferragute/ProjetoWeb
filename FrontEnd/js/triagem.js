// ============================================================
// TRIAGEM: enfermagem registra sinais vitais, queixas e
// a classificação do Protocolo de Manchester
// ============================================================
const tabela = document.getElementById('tabela');
const msg = document.getElementById('msg');
const areaTriagem = document.getElementById('areaTriagem');
const form = document.getElementById('formTriagem');

let idSelecionado = null; // atendimento que está sendo triado

async function carregarFila() {
  const lista = await api('/api/atendimentos');
  // Mostra só quem ainda não passou pela triagem, por ordem de chegada
  const fila = lista.filter(a => a.status === 'AGUARDANDO_TRIAGEM').reverse();

  tabela.innerHTML = fila.map(a => `
    <tr>
      <td><strong>${a.codigo}</strong></td>
      <td>${escapar(a.nome)}</td>
      <td>${a.data_chegada}</td>
      <td><button class="pequeno" onclick="abrirTriagem(${a.id}, '${a.codigo}')">Fazer triagem</button></td>
    </tr>`).join('') || '<tr><td colspan="4">Nenhum paciente aguardando triagem.</td></tr>';
}

function abrirTriagem(id, codigo) {
  idSelecionado = id;
  form.reset();
  document.getElementById('tituloTriagem').textContent = `Triagem do atendimento ${codigo}`;
  areaTriagem.classList.remove('escondido');
  areaTriagem.scrollIntoView({ behavior: 'smooth' });
}

function fecharTriagem() {
  idSelecionado = null;
  areaTriagem.classList.add('escondido');
}

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  try {
    await api(`/api/atendimentos/${idSelecionado}/triagem`, 'POST', lerFormulario(form));
    mostrarMensagem(msg, 'Triagem registrada! Paciente encaminhado para o médico.');
    fecharTriagem();
    carregarFila();
  } catch (erro) {
    mostrarMensagem(msg, erro.message, 'erro');
  }
});

carregarFila();
