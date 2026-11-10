'use strict';

// Ligação do browser ao servidor do portal.
//
// O site é estático (GitHub Pages), mas os dados não: os livros, as informações,
// os projetos e os PDF ficam no servidor do portal. Por isso o que publicas
// aparece em qualquer aparelho onde entres com a tua senha.
//
// A sessão vai num token guardado neste navegador (Authorization: Bearer), e não
// num cookie, porque o site e o servidor são domínios diferentes.
//
// A versão anterior do portal (sem servidor) guardava os livros no localStorage
// e os PDF no IndexedDB deste mesmo domínio. Ao entrar, essa lista é enviada uma
// única vez para o servidor, para ninguém perder o que já tinha publicado.

(function () {
  const SERVIDOR = 'https://site-9f9c094977bc4670993c9aa59ad3ee28.freebuff.page';
  const CHAVE_TOKEN = 'portal-grupo:token:v1';
  const CHAVE_ANTIGA = 'portal-grupo:v1';
  const CHAVE_RECUPERADO = 'portal-grupo:recuperado:v1';
  const BD_PDFS = 'portal-grupo-pdfs';
  const LOJA_PDFS = 'ficheiros';
  const TAMANHO_MAX_PDF = 25 * 1024 * 1024;

  // Livros de exemplo das primeiras versões: não voltam para a lista.
  const EXEMPLOS_ANTIGOS = [
    'ensaio sobre a cegueira',
    'os maias',
    'mensagem',
    'o primo basílio',
    'a cidade e as serras',
    'livro do desassossego',
    'memorial do convento',
    'peregrinação',
  ];

  const ESTADOS_LIVRO = ['Lido', 'A ler', 'Quero ler'];

  let ultimaImportacao = { importados: 0 };
  let importacaoEmCurso = null;
  let importouAgora = false;
  let temporizadorAviso = null;

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

  async function pedirCru(metodo, rota, corpo) {
    const opcoes = { method: metodo, headers: cabecalhos() };
    if (corpo !== undefined) {
      opcoes.headers['Content-Type'] = 'application/json';
      opcoes.body = JSON.stringify(corpo);
    }
    return lerResposta(await fetch(SERVIDOR + rota, opcoes));
  }

  async function pedir(metodo, rota, corpo) {
    let dados = await pedirCru(metodo, rota, corpo);

    if (rota === '/api/entrar' && dados && dados.token) gravarToken(dados.token);
    if (rota === '/api/sair') gravarToken(null);

    // Ao entrar (ou ao abrir o site já com sessão), os livros que estejam só
    // neste navegador sobem para o servidor antes de a lista ser mostrada.
    if (rota === '/api/entrar' || rota === '/api/sessao') {
      await recuperarDoNavegador();
      if (rota === '/api/sessao' && importouAgora) {
        importouAgora = false;
        dados = await pedirCru('GET', '/api/sessao');
      }
    }

    return dados;
  }

  function avisar(mensagem) {
    setTimeout(() => {
      const caixa = document.getElementById('aviso');
      if (!caixa) return;
      caixa.textContent = mensagem;
      caixa.className = 'aviso';
      caixa.hidden = false;
      clearTimeout(temporizadorAviso);
      temporizadorAviso = setTimeout(() => {
        caixa.hidden = true;
      }, 6000);
    }, 900);
  }

  function parecePdf(ficheiro) {
    return ficheiro.type === 'application/pdf' || /\.pdf$/i.test(String(ficheiro.name || ''));
  }

  async function enviarPdf(livroId, ficheiro) {
    if (!ficheiro || !parecePdf(ficheiro)) throw new Error('Escolhe um ficheiro PDF.');
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

  async function guardarPdf(livroId, ficheiro) {
    if (!ficheiro || !parecePdf(ficheiro)) throw new Error('Escolhe um ficheiro PDF.');
    return enviarPdf(livroId, ficheiro);
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

  // --- Recuperação dos livros da versão antiga -----------------------------

  function lerLivrosAntigos() {
    let base = null;
    try {
      base = JSON.parse(localStorage.getItem(CHAVE_ANTIGA) || 'null');
    } catch {
      base = null;
    }
    if (!base || !Array.isArray(base.livros)) return [];
    return base.livros;
  }

  function lerPdfAntigo(chave) {
    return new Promise((resolver) => {
      if (typeof indexedDB === 'undefined') {
        resolver(null);
        return;
      }
      let pedido;
      try {
        pedido = indexedDB.open(BD_PDFS, 1);
      } catch {
        resolver(null);
        return;
      }
      pedido.onupgradeneeded = () => {
        const bd = pedido.result;
        if (!bd.objectStoreNames.contains(LOJA_PDFS)) bd.createObjectStore(LOJA_PDFS);
      };
      pedido.onerror = () => resolver(null);
      pedido.onsuccess = () => {
        const bd = pedido.result;
        try {
          const transacao = bd.transaction(LOJA_PDFS, 'readonly');
          const busca = transacao.objectStore(LOJA_PDFS).get(String(chave));
          busca.onsuccess = () => {
            bd.close();
            resolver(busca.result || null);
          };
          busca.onerror = () => {
            bd.close();
            resolver(null);
          };
        } catch {
          bd.close();
          resolver(null);
        }
      };
    });
  }

  async function enviarLivrosAntigos() {
    const livrosAntigos = lerLivrosAntigos();
    if (!livrosAntigos.length) return { importados: 0 };

    const sessao = await pedirCru('GET', '/api/sessao');
    const chaveDe = (titulo, autor) =>
      `${String(titulo).trim().toLowerCase()}|${String(autor).trim().toLowerCase()}`;
    const jaExiste = new Set((sessao.livros || []).map((l) => chaveDe(l.titulo, l.autor)));

    let importados = 0;

    for (const antigo of livrosAntigos) {
      const titulo = String(antigo.titulo || '').trim();
      const autor = String(antigo.autor || '').trim();
      if (!titulo || !autor) continue;
      if (EXEMPLOS_ANTIGOS.includes(titulo.toLowerCase())) continue;

      const chave = chaveDe(titulo, autor);
      if (jaExiste.has(chave)) continue;

      const ano = Number(antigo.ano);
      const nota = Number(antigo.nota);

      try {
        const criado = await pedirCru('POST', '/api/livros', {
          titulo,
          autor,
          ano: Number.isInteger(ano) && ano >= 1 ? ano : null,
          genero: String(antigo.genero || ''),
          estado: ESTADOS_LIVRO.includes(antigo.estado) ? antigo.estado : 'Quero ler',
          nota: Number.isInteger(nota) && nota >= 1 && nota <= 5 ? nota : null,
          resumo: String(antigo.resumo || ''),
        });

        if (antigo.pdf && criado && criado.id) {
          const ficheiro = await lerPdfAntigo(antigo.id);
          if (ficheiro) {
            try {
              await enviarPdf(criado.id, ficheiro);
            } catch {
              /* o livro fica; o PDF volta a anexar-se à mão */
            }
          }
        }

        jaExiste.add(chave);
        importados += 1;
      } catch {
        /* um livro que falhe não trava os outros */
      }
    }

    return { importados };
  }

  // Corre no máximo uma vez por navegador. Se a rede falhar, não fica marcado,
  // para tentar outra vez na próxima visita.
  function recuperarDoNavegador() {
    if (importacaoEmCurso) return importacaoEmCurso;

    importacaoEmCurso = (async () => {
      try {
        if (localStorage.getItem(CHAVE_RECUPERADO)) return ultimaImportacao;
      } catch {
        return ultimaImportacao;
      }

      if (!lerToken()) return ultimaImportacao;

      try {
        ultimaImportacao = await enviarLivrosAntigos();
      } catch {
        importacaoEmCurso = null;
        return ultimaImportacao;
      }

      try {
        localStorage.setItem(CHAVE_RECUPERADO, new Date().toISOString());
      } catch {
        /* nada a fazer */
      }

      if (ultimaImportacao.importados > 0) {
        importouAgora = true;
        const total = ultimaImportacao.importados;
        avisar(`Guardei no portal ${total} livro${total === 1 ? '' : 's'} que estavam só neste navegador.`);
      }

      return ultimaImportacao;
    })();

    return importacaoEmCurso;
  }

  window.PortalAPI = {
    pedir,
    recursos: { projetos: true, pdfs: true },
    guardarPdf,
    obterPdf,
    apagarPdf,
    recuperarDoNavegador,
    get ultimaImportacao() {
      return ultimaImportacao;
    },
  };
})();
