'use strict';

// Ligação do browser ao servidor do portal.
//
// O site é estático (GitHub Pages), mas os dados não: os livros, as informações,
// os projetos e os PDF ficam no servidor do portal. Por isso o que publicas
// aparece em qualquer aparelho onde entres com a tua senha.
//
// A sessão vai num token guardado neste navegador (Authorization: Bearer), e não
// num cookie, porque o site e o servidor são domínios diferentes.

(function () {
  const SERVIDOR = 'https://site-9f9c094977bc4670993c9aa59ad3ee28.freebuff.page';
  const CHAVE_TOKEN = 'portal-grupo:token:v1';
  const TAMANHO_MAX_PDF = 25 * 1024 * 1024;

  function lerToken() {
    try {
      return localStorage.getItem(CHAVE_TOKEN) || null;
    } catch {
      return null;
    }
  }

  function gravarToken(token) {
    try {
      if (token) localStorage.setItem(CHAVE_TOKEN, token);
      else localStorage.removeItem(CHAVE_TOKEN);
    } catch {
      /* modo privado: a sessão dura até recarregar */
    }
  }

  function cabecalhos(extra) {
    const lista = { ...(extra || {}) };
    const token = lerToken();
    if (token) lista.Authorization = `Bearer ${token}`;
    return lista;
  }

  async function lerResposta(resposta) {
    let dados = null;
    try {
      dados = await resposta.json();
    } catch {
      dados = null;
    }

    if (!resposta.ok) {
      if (resposta.status === 401) gravarToken(null);
      const erro = new Error((dados && dados.erro) || 'Não foi possível concluir o pedido.');
      erro.status = resposta.status;
      throw erro;
    }
    return dados;
  }

  async function pedir(metodo, rota, corpo) {
    const opcoes = { method: metodo, headers: cabecalhos() };
    if (corpo !== undefined) {
      opcoes.headers['Content-Type'] = 'application/json';
      opcoes.body = JSON.stringify(corpo);
    }

    const dados = await lerResposta(await fetch(SERVIDOR + rota, opcoes));

    if (rota === '/api/entrar' && dados && dados.token) gravarToken(dados.token);
    if (rota === '/api/sair') gravarToken(null);
    return dados;
  }

  async function guardarPdf(livroId, ficheiro) {
    if (!ficheiro || ficheiro.type !== 'application/pdf') throw new Error('Escolhe um ficheiro PDF.');
    if (ficheiro.size > TAMANHO_MAX_PDF) throw new Error('O PDF tem de ter menos de 25 MB.');

    const resposta = await fetch(`${SERVIDOR}/api/livros/${Number(livroId)}/pdf`, {
      method: 'POST',
      headers: cabecalhos({
        'Content-Type': 'application/pdf',
        'X-Nome-Ficheiro': encodeURIComponent(ficheiro.name || 'livro.pdf'),
      }),
      body: ficheiro,
    });
    return lerResposta(resposta);
  }

  async function obterPdf(livroId) {
    const resposta = await fetch(`${SERVIDOR}/api/livros/${Number(livroId)}/pdf`, { headers: cabecalhos() });
    if (!resposta.ok) await lerResposta(resposta);
    return URL.createObjectURL(await resposta.blob());
  }

  async function apagarPdf(livroId) {
    const resposta = await fetch(`${SERVIDOR}/api/livros/${Number(livroId)}/pdf`, {
      method: 'DELETE',
      headers: cabecalhos(),
    });
    return lerResposta(resposta);
  }

  window.PortalAPI = {
    pedir,
    recursos: { projetos: true, pdfs: true },
    guardarPdf,
    obterPdf,
    apagarPdf,
  };
})();
