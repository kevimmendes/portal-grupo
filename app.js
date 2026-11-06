'use strict';

// ============================================================
// Estado da aplicação
// ============================================================

const estado = {
  eu: null,
  membros: [],
  livros: [],
  informacoes: [],
  catalogo: [],
  descricoes: {},
  aba: null,
};

const NOMES_PAPEL = { admin: 'Administrador', editor: 'Editor', leitor: 'Leitor' };
let filtroLivros = { q: '', estado: 'todos' };
let membroEscolhido = null;
let temporizadorAviso = null;

const $ = (seletor) => document.querySelector(seletor);

// ============================================================
// Ajudantes
// ============================================================

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

// Quem fala com os dados é o PortalAPI: api-http.js no servidor Node e
// api-local.js na versão estática do GitHub Pages. O resto da interface é igual.
async function pedir(metodo, rota, corpo) {
  if (!window.PortalAPI) throw new Error('A ligação aos dados não foi carregada.');

  try {
    return await window.PortalAPI.pedir(metodo, rota, corpo);
  } catch (falha) {
    if (falha.status === 401 && estado.eu && rota !== '/api/entrar') {
      estado.eu = null;
      prepararLogin();
    }
    throw falha;
  }
}

const pode = (permissao) => Boolean(estado.eu && estado.eu.permissoes.includes(permissao));

function aviso(mensagem, tipo = 'ok') {
  const caixa = $('#aviso');
  caixa.textContent = mensagem;
  caixa.className = tipo === 'erro' ? 'aviso erro' : 'aviso';
  caixa.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { caixa.hidden = true; }, 4200);
}

function iniciais(nome) {
  return String(nome || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('');
}

function formatarData(valor) {
  if (!valor) return '';
  const normalizado = valor.includes('T') ? valor : `${valor.replace(' ', 'T')}Z`;
  const data = new Date(normalizado);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function etapaDoEstado(estadoLivro) {
  return { Lido: 'lido', 'A ler': 'a-ler', 'Quero ler': 'quero-ler' }[estadoLivro] || '';
}

function chipEstado(estadoLivro) {
  return h('span', { classe: `chip ${etapaDoEstado(estadoLivro)}`, texto: estadoLivro });
}

function estrelas(nota) {
  return '★'.repeat(nota) + '☆'.repeat(5 - nota);
}

function etiquetaPapel(papel) {
  return h('span', { classe: `etiqueta ${papel}`, texto: NOMES_PAPEL[papel] || papel });
}

function todasAsPermissoes() {
  const lista = [];
  for (const { permissoes } of estado.catalogo) {
    for (const permissao of permissoes) {
      if (!lista.includes(permissao)) lista.push(permissao);
    }
  }
  return lista;
}

// ============================================================
// Modal genérico
// ============================================================

function fecharModal() {
  $('#fundo-modal').hidden = true;
  $('#form-modal').replaceChildren();
  $('#modal-titulo').textContent = '';
}

function abrirModal({ titulo, campos, textoBotao = 'Guardar', aoSubmeter }) {
  $('#modal-titulo').textContent = titulo;
  const form = $('#form-modal');
  form.replaceChildren();

  for (const campo of campos) {
    const id = `campo-${campo.nome}`;
    let entrada;

    if (campo.tipo === 'textarea') {
      entrada = h('textarea', { id, name: campo.nome, rows: campo.linhas || 4 });
      entrada.value = campo.valor ?? '';
    } else if (campo.tipo === 'select') {
      entrada = h('select', { id, name: campo.nome });
      for (const opcao of campo.opcoes) {
        const elemento = h('option', { value: opcao.valor, texto: opcao.texto });
        if (String(opcao.valor) === String(campo.valor ?? '')) elemento.selected = true;
        entrada.append(elemento);
      }
    } else {
      entrada = h('input', { id, name: campo.nome, type: campo.tipo || 'text' });
      entrada.value = campo.valor ?? '';
      if (campo.passo !== undefined) entrada.step = campo.passo;
      if (campo.min !== undefined) entrada.min = campo.min;
      if (campo.max !== undefined) entrada.max = campo.max;
      if (campo.placeholder) entrada.placeholder = campo.placeholder;
    }

    entrada.required = Boolean(campo.obrigatorio);

    const rotulo = h('label', { classe: 'campo' }, h('span', { texto: campo.etiqueta }), entrada);
    if (campo.dica) rotulo.append(h('small', { texto: campo.dica }));
    form.append(rotulo);
  }

  const erro = h('p', { classe: 'erro', hidden: true });
  const guardar = h('button', { classe: 'botao primario', type: 'submit', texto: textoBotao });
  const cancelar = h('button', { classe: 'botao fantasma', type: 'button', texto: 'Cancelar', onclick: fecharModal });

  form.append(erro, h('div', { classe: 'modal-acoes' }, cancelar, guardar));

  form.onsubmit = async (evento) => {
    evento.preventDefault();
    const dados = {};
    for (const campo of campos) dados[campo.nome] = form.elements[campo.nome]?.value ?? '';
    erro.hidden = true;
    guardar.disabled = true;
    try {
      await aoSubmeter(dados);
      fecharModal();
    } catch (falha) {
      erro.textContent = falha.message;
      erro.hidden = false;
      guardar.disabled = false;
    }
  };

  $('#fundo-modal').hidden = false;
  const primeiro = form.querySelector('input, textarea, select');
  if (primeiro) primeiro.focus();
}

// ============================================================
// Entrada / saída
// ============================================================

async function prepararLogin() {
  $('#ecra-app').hidden = true;
  $('#ecra-login').hidden = false;
  $('#marca-sub').textContent = 'portal do grupo';

  try {
    const membros = await pedir('GET', '/api/membros-publicos');
    const caixa = $('#escolher-membro');
    caixa.replaceChildren();
    membroEscolhido = membros[0]?.id ?? null;

    for (const membro of membros) {
      const botao = h(
        'button',
        { type: 'button', classe: 'pessoa-opcao', role: 'radio' },
        h('span', { classe: 'ponto', style: `background:${membro.cor}` }),
        membro.nome
      );
      botao.setAttribute('aria-checked', String(membro.id === membroEscolhido));
      botao.onclick = () => {
        membroEscolhido = membro.id;
        for (const outro of caixa.children) outro.setAttribute('aria-checked', 'false');
        botao.setAttribute('aria-checked', 'true');
        $('#senha-login').focus();
      };
      caixa.append(botao);
    }
  } catch (falha) {
    console.error(falha);
  }
}

async function entrar(evento) {
  evento.preventDefault();
  const erro = $('#erro-login');
  const botao = $('#btn-entrar');
  const senha = $('#senha-login').value;

  erro.hidden = true;
  if (!membroEscolhido) {
    erro.textContent = 'Escolhe o teu nome primeiro.';
    erro.hidden = false;
    return;
  }

  botao.disabled = true;
  try {
    await pedir('POST', '/api/entrar', { membro_id: membroEscolhido, senha });
    $('#senha-login').value = '';
    await recarregar();
    abrirApp();
  } catch (falha) {
    erro.textContent = falha.message;
    erro.hidden = false;
  } finally {
    botao.disabled = false;
  }
}

async function sair() {
  try {
    await pedir('POST', '/api/sair');
  } catch {
    /* a sessão pode já ter expirado */
  }
  estado.eu = null;
  membroEscolhido = null;
  history.replaceState(null, '', location.pathname);
  await prepararLogin();
}

async function recarregar() {
  const dados = await pedir('GET', '/api/sessao');
  Object.assign(estado, dados);
}

function abrirApp() {
  $('#ecra-login').hidden = true;
  $('#ecra-app').hidden = false;

  $('#utilizador-nome').textContent = estado.eu.nome;
  const etiqueta = $('#utilizador-papel');
  etiqueta.textContent = NOMES_PAPEL[estado.eu.papel] || estado.eu.papel;
  etiqueta.className = `etiqueta ${estado.eu.papel}`;
  $('#marca-sub').textContent = `sessão de ${estado.eu.nome}`;

  const doHash = location.hash.replace('#', '');
  const valida =
    doHash === 'livros' ||
    doHash === 'informacoes' ||
    estado.membros.some((m) => `membro-${m.id}` === doHash);

  estado.aba = valida ? doHash : `membro-${estado.eu.id}`;
  renderAbas();
  renderConteudo();
}

// ============================================================
// Abas e conteúdo
// ============================================================

function mudarAba(chave) {
  estado.aba = chave;
  history.replaceState(null, '', `#${chave}`);
  renderAbas();
  renderConteudo();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderAbas() {
  const nav = $('#abas');
  nav.replaceChildren();

  for (const membro of estado.membros) {
    const chave = `membro-${membro.id}`;
    const botao = h(
      'button',
      { type: 'button', classe: 'aba', role: 'tab' },
      h('span', { classe: 'ponto', style: `background:${membro.cor}` }),
      membro.nome
    );
    if (membro.id === estado.eu.id) botao.append(h('span', { classe: 'aba-eu', texto: 'eu' }));
    botao.setAttribute('aria-selected', String(estado.aba === chave));
    botao.onclick = () => mudarAba(chave);
    nav.append(botao);
  }

  for (const [chave, titulo] of [['livros', 'Livros'], ['informacoes', 'Informações']]) {
    const botao = h('button', { type: 'button', classe: 'aba', role: 'tab', texto: titulo });
    botao.setAttribute('aria-selected', String(estado.aba === chave));
    botao.onclick = () => mudarAba(chave);
    nav.append(botao);
  }
}

function renderConteudo() {
  const alvo = $('#conteudo');
  alvo.replaceChildren();

  if (estado.aba === 'livros') return alvo.append(renderLivros());
  if (estado.aba === 'informacoes') return alvo.append(renderInformacoes());

  const id = Number(String(estado.aba).split('-')[1]);
  const membro = estado.membros.find((m) => m.id === id) || estado.eu;
  alvo.append(renderMembro(membro));
}

// --- Aba de uma pessoa ---------------------------------------------------

function cartaoPerfil(membro) {
  const eEu = membro.id === estado.eu.id;
  const souAdmin = estado.eu.papel === 'admin';
  const acoes = h('div', { classe: 'perfil-acoes' });

  if (eEu && pode('perfil.editar')) {
    acoes.append(h('button', { classe: 'botao pequeno', type: 'button', texto: 'Editar descrição', onclick: modalPerfil }));
  }
  if (souAdmin && !eEu) {
    acoes.append(
      h('button', { classe: 'botao pequeno', type: 'button', texto: 'Mudar permissão', onclick: () => modalPermissao(membro) }),
      h('button', { classe: 'botao pequeno perigo', type: 'button', texto: 'Repor senha', onclick: () => modalReporSenha(membro) })
    );
  }

  return h(
    'section',
    { classe: 'cartao' },
    h(
      'div',
      { classe: 'perfil' },
      h('div', {
        classe: 'avatar',
        style: `background: linear-gradient(135deg, ${membro.cor}, #a5f3fc)`,
        texto: iniciais(membro.nome),
      }),
      h(
        'div',
        { classe: 'perfil-info' },
        h('h1', { texto: membro.nome }),
        h('div', { classe: 'linha-chips' }, etiquetaPapel(membro.papel), h('span', { classe: 'chip', texto: `@${membro.utilizador}` })),
        h('p', { classe: 'funcao', texto: membro.funcao || 'Sem função definida' })
      ),
      acoes
    ),
    h('p', { classe: 'bio', texto: membro.bio || 'Esta pessoa ainda não escreveu o que faz no grupo.' })
  );
}

function cartaoLivrosDaPessoa(membro) {
  const livros = estado.livros.filter((l) => l.membro_id === membro.id);
  const corpo = h('div', { classe: 'grelha', style: 'gap:0' });

  if (!livros.length) {
    corpo.append(h('p', { classe: 'vazio', texto: 'Ainda não há livros associados a esta pessoa.' }));
  } else {
    for (const livro of livros) {
      corpo.append(
        h(
          'div',
          { classe: 'linha-livro' },
          h(
            'div',
            {},
            h('div', { classe: 'titulo-livro', texto: livro.titulo }),
            h('div', { classe: 'autor-livro', texto: `${livro.autor}${livro.ano ? ` · ${livro.ano}` : ''}` })
          ),
          h('div', { classe: 'linha-chips' }, livro.nota ? h('span', { classe: 'estrelas', texto: estrelas(livro.nota) }) : null, chipEstado(livro.estado))
        )
      );
    }
  }

  return h('section', { classe: 'cartao' }, h('p', { classe: 'titulo-seccao', texto: `Livros de ${membro.nome}` }), corpo);
}

function cartaoPermissoes(papel) {
  const permissoes = estado.catalogo.find((p) => p.papel === papel)?.permissoes || [];
  const lista = h('div', { classe: 'lista-permissoes' });

  for (const permissao of todasAsPermissoes()) {
    const tem = permissoes.includes(permissao);
    lista.append(
      h(
        'div',
        { classe: `permissao${tem ? ' tem' : ''}` },
        h('span', { classe: tem ? 'marca-sim' : 'marca-nao', texto: tem ? '✓' : '—' }),
        h(
          'div',
          {},
          estado.descricoes[permissao] || permissao,
          h('small', { texto: permissao })
        )
      )
    );
  }

  return h(
    'section',
    { classe: 'cartao' },
    h(
      'p',
      { classe: 'titulo-seccao' },
      h('span', { texto: 'O que pode fazer' }),
      etiquetaPapel(papel)
    ),
    lista,
    h('p', { classe: 'dica', texto: 'Só o administrador pode mudar estas permissões.' })
  );
}

function renderMembro(membro) {
  const frag = document.createDocumentFragment();
  const eEu = membro.id === estado.eu.id;

  frag.append(
    h(
      'div',
      { classe: 'seccao-topo' },
      h(
        'div',
        {},
        h('h1', { texto: `Aba de ${membro.nome}` }),
        h('p', {
          texto: eEu
            ? 'Esta é a tua aba. Mantém a descrição e a função em dia.'
            : 'Perfil, permissões e livros desta pessoa dentro do grupo.',
        })
      )
    )
  );

  frag.append(
    h(
      'div',
      { classe: 'grelha grelha-2' },
      h('div', { classe: 'grelha' }, cartaoPerfil(membro), cartaoLivrosDaPessoa(membro)),
      cartaoPermissoes(membro.papel)
    )
  );

  return frag;
}

// --- Livros --------------------------------------------------------------

function renderLivros() {
  const frag = document.createDocumentFragment();

  frag.append(
    h(
      'div',
      { classe: 'seccao-topo' },
      h(
        'div',
        {},
        h('h1', { texto: 'Livros' }),
        h('p', { texto: `${estado.livros.length} livros na lista do grupo.` })
      ),
      pode('livros.criar')
        ? h('button', { classe: 'botao primario', type: 'button', texto: 'Adicionar livro', onclick: () => modalLivro(null) })
        : null
    )
  );

  const grelha = h('div', { classe: 'grelha-livros' });

  const procura = h('input', { type: 'search', placeholder: 'Procurar por título, autor ou género', value: filtroLivros.q });
  procura.oninput = () => {
    filtroLivros.q = procura.value;
    desenharGrelhaLivros(grelha);
  };

  const seletor = h('select', {});
  for (const valor of ['todos', 'Lido', 'A ler', 'Quero ler']) {
    const opcao = h('option', { value: valor, texto: valor === 'todos' ? 'Todos os estados' : valor });
    if (filtroLivros.estado === valor) opcao.selected = true;
    seletor.append(opcao);
  }
  seletor.onchange = () => {
    filtroLivros.estado = seletor.value;
    desenharGrelhaLivros(grelha);
  };

  frag.append(h('div', { classe: 'barra-livros' }, procura, seletor), grelha);
  desenharGrelhaLivros(grelha);
  return frag;
}

function desenharGrelhaLivros(container) {
  container.replaceChildren();
  const q = filtroLivros.q.trim().toLowerCase();

  const lista = estado.livros.filter((livro) => {
    const conteudo = [livro.titulo, livro.autor, livro.genero, livro.resumo].join(' ').toLowerCase();
    const combinaTexto = !q || conteudo.includes(q);
    const combinaEstado = filtroLivros.estado === 'todos' || livro.estado === filtroLivros.estado;
    return combinaTexto && combinaEstado;
  });

  if (!lista.length) {
    container.append(h('p', { classe: 'vazio', texto: 'Nenhum livro encontrado. Limpa a procura ou muda o filtro.' }));
    return;
  }

  for (const livro of lista) container.append(cartaoLivro(livro));
}

function cartaoLivro(livro) {
  const acoes = h('div', { classe: 'acoes-livro' });

  if (pode('livros.editar')) {
    acoes.append(h('button', { classe: 'botao pequeno', type: 'button', texto: 'Editar', onclick: () => modalLivro(livro) }));
  }
  if (pode('livros.apagar')) {
    acoes.append(h('button', { classe: 'botao pequeno perigo', type: 'button', texto: 'Apagar', onclick: () => apagarLivro(livro) }));
  }

  return h(
    'article',
    { classe: 'cartao livro' },
    h('div', {}, h('h3', { texto: livro.titulo }), h('p', { classe: 'autor', texto: `${livro.autor}${livro.ano ? ` · ${livro.ano}` : ''}` })),
    h(
      'div',
      { classe: 'linha-chips' },
      chipEstado(livro.estado),
      livro.genero ? h('span', { classe: 'chip', texto: livro.genero }) : null,
      livro.nota ? h('span', { classe: 'estrelas', title: `${livro.nota} de 5`, texto: estrelas(livro.nota) }) : null
    ),
    livro.resumo ? h('p', { classe: 'resumo', texto: livro.resumo }) : null,
    h(
      'div',
      { classe: 'rodape-cartao' },
      h('span', { texto: `Adicionado por ${livro.membro_nome || '—'}` }),
      acoes.childElementCount ? acoes : null
    )
  );
}

function modalLivro(livroExistente) {
  const livro = livroExistente || {};

  abrirModal({
    titulo: livroExistente ? 'Editar livro' : 'Adicionar livro',
    textoBotao: livroExistente ? 'Guardar' : 'Adicionar',
    campos: [
      { nome: 'titulo', etiqueta: 'Título', valor: livro.titulo || '', obrigatorio: true, placeholder: 'Nome do livro' },
      { nome: 'autor', etiqueta: 'Autor', valor: livro.autor || '', obrigatorio: true, placeholder: 'Quem escreveu' },
      { nome: 'ano', etiqueta: 'Ano', tipo: 'number', valor: livro.ano ?? '', min: 1, max: new Date().getFullYear() + 1 },
      { nome: 'genero', etiqueta: 'Género', valor: livro.genero || '', placeholder: 'Romance, poesia, ensaio…' },
      {
        nome: 'estado',
        etiqueta: 'Estado',
        tipo: 'select',
        valor: livro.estado || 'Quero ler',
        opcoes: ['Quero ler', 'A ler', 'Lido'].map((v) => ({ valor: v, texto: v })),
      },
      {
        nome: 'nota',
        etiqueta: 'Nota (1 a 5)',
        tipo: 'select',
        valor: livro.nota ?? '',
        opcoes: [{ valor: '', texto: 'Sem nota' }, ...[1, 2, 3, 4, 5].map((n) => ({ valor: n, texto: `${n} ${'★'.repeat(n)}` }))],
      },
      {
        nome: 'resumo',
        etiqueta: 'Resumo / porque interessa ao grupo',
        tipo: 'textarea',
        valor: livro.resumo || '',
        linhas: 4,
      },
    ],
    aoSubmeter: async (dados) => {
      const corpo = {
        titulo: dados.titulo,
        autor: dados.autor,
        ano: dados.ano === '' ? null : Number(dados.ano),
        genero: dados.genero,
        estado: dados.estado,
        nota: dados.nota === '' ? null : Number(dados.nota),
        resumo: dados.resumo,
      };

      if (livroExistente) await pedir('PUT', `/api/livros/${livroExistente.id}`, corpo);
      else await pedir('POST', '/api/livros', corpo);

      await recarregar();
      renderConteudo();
      aviso(livroExistente ? 'Livro atualizado.' : 'Livro adicionado à lista.');
    },
  });
}

async function apagarLivro(livro) {
  if (!window.confirm(`Apagar "${livro.titulo}" da lista do grupo?`)) return;
  try {
    await pedir('DELETE', `/api/livros/${livro.id}`);
    await recarregar();
    renderConteudo();
    aviso('Livro apagado.');
  } catch (falha) {
    aviso(falha.message, 'erro');
  }
}

// --- Informações ---------------------------------------------------------

function renderInformacoes() {
  const frag = document.createDocumentFragment();

  frag.append(
    h(
      'div',
      { classe: 'seccao-topo' },
      h(
        'div',
        {},
        h('h1', { texto: 'Informações' }),
        h('p', { texto: 'O que todos do grupo precisam de saber: regras, divisão de tarefas e avisos.' })
      ),
      pode('informacoes.editar')
        ? h('button', { classe: 'botao primario', type: 'button', texto: 'Nova informação', onclick: () => modalInformacao(null) })
        : null
    )
  );

  const grelha = h('div', { classe: 'grelha-info' });

  if (!estado.informacoes.length) {
    grelha.append(h('p', { classe: 'vazio', texto: 'Ainda não há informações publicadas.' }));
  }

  for (const info of estado.informacoes) {
    const acoes = h('div', { classe: 'acoes-livro' });
    if (pode('informacoes.editar')) {
      acoes.append(
        h('button', { classe: 'botao pequeno', type: 'button', texto: 'Editar', onclick: () => modalInformacao(info) }),
        h('button', { classe: 'botao pequeno perigo', type: 'button', texto: 'Apagar', onclick: () => apagarInformacao(info) })
      );
    }

    grelha.append(
      h(
        'article',
        { classe: 'cartao' },
        h('h3', { texto: info.titulo }),
        h('p', { classe: 'info-texto', texto: info.conteudo }),
        h(
          'div',
          { classe: 'rodape-cartao' },
          h('span', {
            texto: `Atualizado por ${info.autor_nome || '—'}${
              info.atualizado_em ? ` em ${formatarData(info.atualizado_em)}` : ''
            }`,
          }),
          acoes.childElementCount ? acoes : null
        )
      )
    );
  }

  frag.append(grelha);
  return frag;
}

function modalInformacao(infoExistente) {
  const info = infoExistente || {};

  abrirModal({
    titulo: infoExistente ? 'Editar informação' : 'Nova informação',
    textoBotao: infoExistente ? 'Guardar' : 'Publicar',
    campos: [
      { nome: 'titulo', etiqueta: 'Título', valor: info.titulo || '', obrigatorio: true },
      { nome: 'conteudo', etiqueta: 'Texto', tipo: 'textarea', valor: info.conteudo || '', linhas: 8, obrigatorio: true },
      { nome: 'ordem', etiqueta: 'Ordem na página', tipo: 'number', valor: info.ordem ?? 99, min: 0, max: 999 },
    ],
    aoSubmeter: async (dados) => {
      const corpo = { titulo: dados.titulo, conteudo: dados.conteudo, ordem: dados.ordem === '' ? 99 : Number(dados.ordem) };

      if (infoExistente) await pedir('PUT', `/api/informacoes/${infoExistente.id}`, corpo);
      else await pedir('POST', '/api/informacoes', corpo);

      await recarregar();
      renderConteudo();
      aviso(infoExistente ? 'Informação atualizada.' : 'Informação publicada.');
    },
  });
}

async function apagarInformacao(info) {
  if (!window.confirm(`Apagar a informação "${info.titulo}"?`)) return;
  try {
    await pedir('DELETE', `/api/informacoes/${info.id}`);
    await recarregar();
    renderConteudo();
    aviso('Informação apagada.');
  } catch (falha) {
    aviso(falha.message, 'erro');
  }
}

// --- Ações sobre a própria conta / sobre outras pessoas ------------------

function modalPerfil() {
  abrirModal({
    titulo: 'Editar a minha descrição',
    campos: [
      { nome: 'funcao', etiqueta: 'Função no grupo', valor: estado.eu.funcao || '', placeholder: 'Ex.: Resumos e apontamentos' },
      { nome: 'bio', etiqueta: 'O que faço no grupo', tipo: 'textarea', valor: estado.eu.bio || '', linhas: 5 },
    ],
    aoSubmeter: async (dados) => {
      await pedir('PATCH', '/api/perfil', { funcao: dados.funcao, bio: dados.bio });
      await recarregar();
      renderConteudo();
      aviso('Descrição atualizada.');
    },
  });
}

function modalSenha() {
  abrirModal({
    titulo: 'Mudar a minha senha',
    textoBotao: 'Guardar',
    campos: [
      { nome: 'atual', etiqueta: 'Senha atual', tipo: 'password', obrigatorio: true },
      { nome: 'nova', etiqueta: 'Senha nova', tipo: 'password', obrigatorio: true, dica: 'Pelo menos 8 caracteres.' },
      { nome: 'repetir', etiqueta: 'Repetir a senha nova', tipo: 'password', obrigatorio: true },
    ],
    aoSubmeter: async (dados) => {
      if (dados.nova !== dados.repetir) throw new Error('As duas senhas novas não são iguais.');
      if (dados.nova.length < 8) throw new Error('A senha nova precisa de pelo menos 8 caracteres.');
      await pedir('POST', '/api/senha', { atual: dados.atual, nova: dados.nova });
      aviso('Senha alterada. As outras sessões foram fechadas.');
    },
  });
}

function modalPermissao(membro) {
  abrirModal({
    titulo: `Permissão de ${membro.nome}`,
    campos: [
      {
        nome: 'papel',
        etiqueta: 'Tipo de acesso',
        tipo: 'select',
        valor: membro.papel,
        opcoes: estado.catalogo.map((p) => ({ valor: p.papel, texto: `${NOMES_PAPEL[p.papel]} — ${p.permissoes.length} permissões` })),
        dica: 'Administrador gere tudo; editor cria e edita livros e informações; leitor consulta.',
      },
    ],
    aoSubmeter: async (dados) => {
      await pedir('PATCH', `/api/membros/${membro.id}/papel`, { papel: dados.papel });
      await recarregar();
      renderConteudo();
      aviso(`Permissão de ${membro.nome} alterada para ${NOMES_PAPEL[dados.papel]}.`);
    },
  });
}

function modalReporSenha(membro) {
  abrirModal({
    titulo: `Repor a senha de ${membro.nome}`,
    textoBotao: 'Repor',
    campos: [
      {
        nome: 'senha',
        etiqueta: 'Senha nova',
        tipo: 'password',
        obrigatorio: true,
        dica: 'Mínimo 8 caracteres. Diz a senha à pessoa por um canal privado.',
      },
    ],
    aoSubmeter: async (dados) => {
      await pedir('POST', `/api/membros/${membro.id}/senha`, { senha: dados.senha });
      aviso(`Senha de ${membro.nome} reposta e sessões antigas fechadas.`);
    },
  });
}

// ============================================================
// Arranque
// ============================================================

async function arrancar() {
  $('#form-login').addEventListener('submit', entrar);
  $('#btn-sair').addEventListener('click', sair);
  $('#btn-senha').addEventListener('click', modalSenha);
  $('#btn-fechar-modal').addEventListener('click', fecharModal);
  $('#fundo-modal').addEventListener('click', (evento) => {
    if (evento.target.id === 'fundo-modal') fecharModal();
  });
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') fecharModal();
  });

  try {
    await recarregar();
    abrirApp();
  } catch {
    await prepararLogin();
  }
}

arrancar();
