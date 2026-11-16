'use strict';

// Ligação do site aos ficheiros partilhados do grupo.
//
// Os ficheiros ficam num servidor à parte (não no GitHub Pages, que só serve
// páginas), por isso o que cada pessoa envia fica guardado e aparece a todos,
// em qualquer aparelho. O acesso é fechado pelo código do grupo, que se escreve
// uma vez em cada navegador e fica guardado neste mesmo navegador.

(function () {
  const SERVIDOR = 'https://site-8d6ff13768e549fd82d08e8218ab2a66.freebuff.page';
  const CHAVE_LOCAL = 'portal-grupo:chave-ficheiros:v1';
  const TAMANHO_MAX = 25 * 1024 * 1024;

  function lerChave() {
    try {
      return localStorage.getItem(CHAVE_LOCAL) || '';
    } catch {
      return '';
    }
  }

  function definirChave(valor) {
    try {
      if (valor) localStorage.setItem(CHAVE_LOCAL, valor);
      else localStorage.removeItem(CHAVE_LOCAL);
    } catch {
      /* modo privado: o código dura até recarregar */
    }
  }

  function cabecalhos(extra) {
    return { ...(extra || {}), 'x-chave': lerChave() };
  }

  async function lerResposta(resposta) {
    let dados = null;
    try {
      dados = await resposta.json();
    } catch {
      dados = null;
    }

    if (!resposta.ok) {
      const erro = new Error(
        (dados && dados.erro) || 'Não foi possível falar com o servidor dos ficheiros.'
      );
      erro.status = resposta.status;
      throw erro;
    }
    return dados;
  }

  async function listar() {
    return lerResposta(await fetch(`${SERVIDOR}/api/ficheiros`, { headers: cabecalhos() }));
  }

  async function enviar(ficheiro, autor, papel) {
    if (!ficheiro) throw new Error('Escolhe um ficheiro primeiro.');
    if (ficheiro.size > TAMANHO_MAX) throw new Error('O ficheiro tem de ter menos de 25 MB.');
    if (!ficheiro.size) throw new Error('O ficheiro está vazio.');

    const tipo = ficheiro.type || 'application/octet-stream';
    const resposta = await fetch(`${SERVIDOR}/api/ficheiros`, {
      method: 'POST',
      headers: cabecalhos({
        'Content-Type': tipo,
        'x-nome': encodeURIComponent(ficheiro.name || 'ficheiro'),
        'x-tipo': tipo,
        'x-autor': encodeURIComponent(autor || ''),
        'x-papel': papel || 'editor',
      }),
      body: ficheiro,
    });
    return lerResposta(resposta);
  }

  async function apagar(id, autor, papel) {
    const resposta = await fetch(`${SERVIDOR}/api/ficheiros/${Number(id)}`, {
      method: 'DELETE',
      headers: cabecalhos({ 'x-autor': encodeURIComponent(autor || ''), 'x-papel': papel || 'editor' }),
    });
    return lerResposta(resposta);
  }

  async function obterUrl(id) {
    const resposta = await fetch(`${SERVIDOR}/api/ficheiros/${Number(id)}`, { headers: cabecalhos() });
    if (!resposta.ok) await lerResposta(resposta);
    return URL.createObjectURL(await resposta.blob());
  }

  window.PortalAPI = window.PortalAPI || {};
  window.PortalAPI.ficheiros = {
    servidor: SERVIDOR,
    tamanhoMaximo: TAMANHO_MAX,
    listar,
    enviar,
    apagar,
    obterUrl,
    lerChave,
    definirChave,
  };
})();
