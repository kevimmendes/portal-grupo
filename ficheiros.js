'use strict';

// Página dos ficheiros partilhados do grupo.
//
// Lê a sessão do portal (api-http.js, o mesmo token guardado neste navegador) e
// guarda os ficheiros no servidor dos ficheiros (api-ficheiros.js). A lista é
// pedida outra vez de poucos em poucos segundos, para que o que outra pessoa
// envia apareça aqui sem ninguém recarregar a página.

const $ = (seletor) => document.querySelector(seletor);
const NOMES_PAPEL = { admin: 'Administrador', editor: 'Editor', leitor: 'Leitor' };
const INTERVALO_ATUALIZACAO = 5000;

let eu = null;
let ficheiros = [];
let assinatura = '';
let caixa = null;
let temporizadorAviso = null;
let temporizadorAtualizacao = null;
let aEnviar = false;
let aPedirChave = false;

// Cria elementos sem innerHTML: o texto do utilizador nunca é interpretado como HTML.
function h(tag, props = {}, ...filhos) {
  const elemento = document.createElement(tag);
  for (const [chave, valor] of Object.entries(props || {})) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (chave === 'classe') elemento.className = valor;
    else if (chave === 'texto') elemento.textContent = valor;
    else if (chave === 'onclick') elemento.addEventListener('click', valor);
    else if (chave === 'hidden') elemento.hidden = Boolean(valor);
    else elemento.setAttribute(chave, valor);
  }
  for (const filho of filhos.flat(9)) {
    if (filho === null || filho === undefined || filho === false) continue;
    elemento.append(filho instanceof Node ? filho : document.createTextNode(String(filho)));
  }
  return elemento;
}

function aviso(mensagem, tipo = 'ok') {
  const caixaAviso = $('#aviso');
  caixaAviso.textContent = mensagem;
  caixaAviso.className = tipo === 'erro' ? 'aviso erro' : 'aviso';
  caixaAviso.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => {
    caixaAviso.classList.add('a-sair');
    temporizadorAviso = setTimeout(() => {
      caixaAviso.hidden = true;
      caixaAviso.classList.remove('a-sair');
    }, 160);
  }, 4200);
}

function formatarTamanho(bytes) {
  const valor = Number(bytes) || 0;
  if (valor < 1024) return `${valor} B`;
  if (valor < 1024 * 1024) return `${Math.round(valor / 1024)} kB`;
  return `${(valor / (1024 * 1024)).toFixed(1)} MB`;
}

function formatarData(valor) {
  if (!valor) return '';
  const normalizado = valor.includes('T') ? valor : `${valor.replace(' ', 'T')}Z`;
  const data = new Date(normalizado);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function api() {
  return window.PortalAPI && window.PortalAPI.ficheiros;
}

function assinaturaDaLista(lista) {
  return lista.map((f) => `${f.id}:${f.nome}:${f.tamanho}`).join('|');
}

// --- Desenho ---------------------------------------------------------------

function render() {
  const alvo = $('#conteudo');
  alvo.replaceChildren();

  alvo.append(
    h(
      'div',
      { classe: 'seccao-topo' },
      h(
        'div',
        {},
        h('h1', { texto: 'Ficheiros' }),
        h('p', { texto: 'O que o grupo põe aqui fica guardado no portal e aparece a todos. A lista atualiza-se sozinha.' })
      ),
      api()
        ? h('button', { classe: 'botao primario', type: 'button', texto: 'Enviar ficheiros', onclick: escolherFicheiros })
        : null
    )
  );

  caixa = h('div', { classe: 'grelha', style: 'gap:0' });
  alvo.append(h('section', { classe: 'cartao' }, caixa));

  if (!api()) {
    caixa.append(h('p', { classe: 'vazio', texto: 'A ligação aos ficheiros não foi carregada.' }));
    return;
  }

  carregar();
}

function desenharPedidoDeChave(mensagem) {
  aPedirChave = true;
  const campo = h('input', { type: 'password', placeholder: 'Código do grupo', autocomplete: 'off' });
  const erro = h('p', { classe: 'erro', texto: mensagem || '' });
  erro.hidden = !mensagem;

  const form = h(
    'form',
    { classe: 'grelha', style: 'gap:12px' },
    h('p', { classe: 'titulo-seccao', texto: 'Código do grupo' }),
    h('p', {
      texto: 'Para veres e enviares ficheiros, escreve uma vez o código do grupo. Fica guardado só neste navegador.',
    }),
    h('label', { classe: 'campo' }, h('span', { texto: 'Código' }), campo),
    erro,
    h('div', { classe: 'modal-acoes' }, h('button', { classe: 'botao primario', type: 'submit', texto: 'Entrar nos ficheiros' }))
  );

  form.onsubmit = async (evento) => {
    evento.preventDefault();
    const codigo = campo.value.trim();
    if (!codigo) {
      erro.textContent = 'Escreve o código do grupo.';
      erro.hidden = false;
      return;
    }
    api().definirChave(codigo);
    erro.hidden = true;
    assinatura = '';
    await carregar(true);
  };

  caixa.replaceChildren(form);
  campo.focus();
}

function desenharLista() {
  aPedirChave = false;
  caixa.replaceChildren();

  if (!ficheiros.length) {
    caixa.append(h('p', { classe: 'vazio', texto: 'Ainda não há ficheiros. Usa «Enviar ficheiros» para pores o primeiro.' }));
    return;
  }

  for (const ficheiro of ficheiros) {
    const souEu = String(ficheiro.autor || '').toLowerCase() === String(eu.nome || '').toLowerCase();
    const acoes = h(
      'div',
      { classe: 'acoes-livro' },
      h('button', { classe: 'botao pequeno', type: 'button', texto: 'Abrir', onclick: () => abrirFicheiro(ficheiro) }),
      h('button', { classe: 'botao pequeno fantasma', type: 'button', texto: 'Descarregar', onclick: () => descarregarFicheiro(ficheiro) })
    );

    if (souEu || eu.papel === 'admin') {
      acoes.append(h('button', { classe: 'botao pequeno perigo', type: 'button', texto: 'Apagar', onclick: () => apagarFicheiro(ficheiro) }));
    }

    caixa.append(
      h(
        'div',
        { classe: 'linha-livro' },
        h(
          'div',
          {},
          h('div', { classe: 'titulo-livro', texto: ficheiro.nome }),
          h('div', {
            classe: 'autor-livro',
            texto: `${formatarTamanho(ficheiro.tamanho)} · ${ficheiro.autor || 'alguém'} · ${formatarData(ficheiro.criado_em)}`,
          })
        ),
        acoes
      )
    );
  }
}

// --- Dados -----------------------------------------------------------------

async function carregar(forcar = false) {
  if (!api() || !caixa) return;

  if (!api().lerChave()) {
    // A atualização automática não pode apagar o código que se está a escrever.
    if (!aPedirChave) desenharPedidoDeChave('');
    return;
  }

  try {
    const lista = await api().listar();
    ficheiros = Array.isArray(lista) ? lista : [];
    if (!caixa.isConnected) return;

    const nova = assinaturaDaLista(ficheiros);
    if (forcar || nova !== assinatura) {
      assinatura = nova;
      desenharLista();
    }
  } catch (falha) {
    if (falha.status === 401) {
      api().definirChave('');
      desenharPedidoDeChave('O código do grupo não está certo.');
      return;
    }
    if (forcar) aviso(falha.message, 'erro');
  }
}

function pararAtualizacao() {
  clearTimeout(temporizadorAtualizacao);
  temporizadorAtualizacao = null;
}

function iniciarAtualizacao() {
  pararAtualizacao();
  temporizadorAtualizacao = setTimeout(async () => {
    if (!caixa || !caixa.isConnected) {
      pararAtualizacao();
      return;
    }
    if (!aEnviar) await carregar();
    iniciarAtualizacao();
  }, INTERVALO_ATUALIZACAO);
}

// --- Ações -----------------------------------------------------------------

function escolherFicheiros() {
  const seletor = h('input', { type: 'file', multiple: true });
  seletor.onchange = async () => {
    const escolhidos = [...(seletor.files || [])];
    if (!escolhidos.length) return;

    aEnviar = true;
    try {
      let enviados = 0;
      for (const ficheiro of escolhidos) {
        try {
          await api().enviar(ficheiro, eu.nome, eu.papel);
          enviados += 1;
        } catch (falha) {
          aviso(`${ficheiro.name}: ${falha.message}`, 'erro');
        }
      }

      if (enviados) aviso(`${enviados} ficheiro${enviados === 1 ? '' : 's'} guardado${enviados === 1 ? '' : 's'} no portal.`);
      await carregar(true);
    } finally {
      aEnviar = false;
    }
  };
  seletor.click();
}

async function abrirFicheiro(ficheiro) {
  try {
    const url = await api().obterUrl(ficheiro.id);
    window.open(url, '_blank', 'noopener');
  } catch (falha) {
    aviso(falha.message, 'erro');
  }
}

async function descarregarFicheiro(ficheiro) {
  try {
    const url = await api().obterUrl(ficheiro.id);
    const ligacao = h('a', { href: url, download: ficheiro.nome });
    document.body.append(ligacao);
    ligacao.click();
    ligacao.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (falha) {
    aviso(falha.message, 'erro');
  }
}

async function apagarFicheiro(ficheiro) {
  if (!window.confirm(`Apagar "${ficheiro.nome}" do portal?`)) return;
  try {
    await api().apagar(ficheiro.id, eu.nome, eu.papel);
    aviso('Ficheiro apagado.');
    await carregar(true);
  } catch (falha) {
    aviso(falha.message, 'erro');
  }
}

// --- Arranque --------------------------------------------------------------

async function arrancar() {
  try {
    const sessao = await window.PortalAPI.pedir('GET', '/api/sessao');
    eu = sessao.eu;
  } catch {
    // Sem sessão válida não há ficheiros: volta ao portal, que pede a senha.
    location.replace('index.html');
    return;
  }

  $('#utilizador-nome').textContent = eu.nome;
  const etiqueta = $('#utilizador-papel');
  etiqueta.textContent = NOMES_PAPEL[eu.papel] || eu.papel;
  etiqueta.className = `etiqueta ${eu.papel}`;
  $('#ecra-app').hidden = false;

  render();
  iniciarAtualizacao();
}

arrancar();
