// ============================================================
// Funções usadas por todas as páginas
// ============================================================

// Faz uma requisição para o back-end e devolve a resposta em JSON.
// Se o servidor responder com erro, lança uma exceção com a mensagem.
async function api(url, metodo = 'GET', corpo = null) {
  const opcoes = { method: metodo, headers: { 'Content-Type': 'application/json' } };
  if (corpo) opcoes.body = JSON.stringify(corpo);

  const resposta = await fetch(url, opcoes);
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.erro || 'Erro na requisição');
  return dados;
}

// Converte "2000-05-20" em "20/05/2000"
function formatarData(data) {
  if (!data) return '';
  const [ano, mes, dia] = data.substring(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

// Calcula a idade a partir da data de nascimento
function calcularIdade(dataNascimento) {
  const hoje = new Date();
  const nasc = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nasc.getMonth() ||
    (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate());
  if (aindaNaoFezAniversario) idade--;
  return idade;
}

// Cria o HTML de uma etiqueta colorida (status ou classificação)
function etiqueta(texto) {
  return `<span class="etiqueta ${texto}">${texto.replace('_', ' ')}</span>`;
}

// Mostra uma mensagem de sucesso ou erro num elemento
function mostrarMensagem(elemento, texto, tipo = 'ok') {
  elemento.textContent = texto;
  elemento.className = `mensagem ${tipo}`;
}

// Lê todos os campos de um formulário e devolve um objeto { nomeDoCampo: valor }
function lerFormulario(form) {
  return Object.fromEntries(new FormData(form));
}

// Evita que textos digitados pelo usuário virem HTML na página (segurança - XSS)
function escapar(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

// Máscara de digitação: aceita só números e encaixa no formato, onde cada "0"
// é um dígito. Ex: formato "000.000.000-00" transforma "12345678900" em "123.456.789-00".
// Como o formato tem tamanho fixo, o campo também não aceita texto infinito.
// Pode receber 2 formatos (curto e longo), como no telefone fixo x celular:
// usa o curto enquanto os números couberem nele, senão usa o longo.
function aplicarMascara(input, formato, formatoLongo = formato) {
  const maxDigitos = formatoLongo.replace(/[^0]/g, '').length;
  input.maxLength = formatoLongo.length;

  input.addEventListener('input', () => {
    const digitos = input.value.replace(/\D/g, '').substring(0, maxDigitos);
    const cabeNoCurto = digitos.length <= formato.replace(/[^0]/g, '').length;
    const molde = cabeNoCurto ? formato : formatoLongo;

    let resultado = '';
    let i = 0;
    for (const caractere of molde) {
      if (i >= digitos.length) break;
      resultado += caractere === '0' ? digitos[i++] : caractere;
    }
    input.value = resultado;
  });
}
