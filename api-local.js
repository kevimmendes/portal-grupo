'use strict';

// Versão estática do portal, para o GitHub Pages.
//
// O GitHub Pages só serve ficheiros — não corre Node nem SQLite. Por isso esta
// versão guarda tudo no localStorage do navegador e responde às mesmas rotas
// "/api/..." que o server.js, para o app.js ser exatamente o mesmo.
//
// AVISO: sem servidor, a senha é verificada no browser. Serve para separar as
// pessoas do grupo entre si, não protege nada de quem saiba abrir as ferramentas
// do programador. Para proteção a sério, usa-se o server.js com SQLite.

(function () {
  const CHAVE = 'portal-grupo:v1';
  const CHAVE_SESSAO = 'portal-grupo:sessao';
  const DADOS = window.DADOS_INICIAIS;
  const PERMISSOES = DADOS.PERMISSOES;
  const DESCRICOES = DADOS.DESCRICOES_PERMISSAO;
  const PAPEIS = Object.keys(PERMISSOES);
  const ESTADOS_LIVRO = ['Lido', 'A ler', 'Quero ler'];

  function erro(status, mensagem) {
    const e = new Error(mensagem);
    e.status = status;
    return e;
  }

  const permissoesDe = (papel) => PERMISSOES[papel] || [];

  const texto = (valor, max = 400) => (typeof valor === 'string' ? valor.trim().slice(0, max) : '');

  function agora() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  // Hash simples (FNV-1a) para a senha não ficar em texto no localStorage.
  // Não é criptografia: com o browser aberto, os dados são todos visíveis.
  function hashSenha(senha) {
    let hash = 0x811c9dc5;
    const entrada = `portal-grupo:${String(senha)}`;
    for (let i = 0; i < entrada.length; i += 1) {
      hash ^= entrada.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }

  function semear() {
    const base = {
      membros: [],
      livros: [],
      informacoes: [],
      proximoId: { membros: 1, livros: 1, informacoes: 1 },
    };
    const ids = {};

    for (const membro of DADOS.MEMBROS) {
      const id = base.proximoId.membros++;
      ids[membro.nome] = id;
      base.membros.push({
        id,
        nome: membro.nome,
        utilizador: membro.utilizador,
        papel: membro.papel,
        funcao: membro.funcao || '',
        bio: membro.bio || '',
        cor: membro.cor,
        senha_hash: hashSenha(membro.senha),
        criado_em: agora(),
      });
    }

    for (const livro of DADOS.LIVROS) {
      base.livros.push({
        id: base.proximoId.livros++,
        titulo: livro.titulo,
        autor: livro.autor,
        ano: livro.ano ?? null,
        genero: livro.genero || '',
        estado: livro.estado,
        nota: livro.nota ?? null,
        resumo: livro.resumo || '',
        membro_id: ids[livro.membro] ?? null,
        criado_em: agora(),
      });
    }

    for (const info of DADOS.INFORMACOES) {
      base.informacoes.push({
        id: base.proximoId.informacoes++,
        titulo: info.titulo,
        conteudo: info.conteudo,
        ordem: info.ordem,
        atualizado_por: ids['Diogo'] ?? null,
        atualizado_em: agora(),
      });
    }

    gravar(base);
    return base;
  }

  function abrir() {
    let bruto = null;
    try {
      bruto = localStorage.getItem(CHAVE);
    } catch {
      bruto = null;
    }
    if (bruto) {
      try {
        return JSON.parse(bruto);
      } catch {
        /* dados estragados: volta aos dados iniciais */
      }
    }
    return semear();
  }

  function gravar(base) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(base));
    } catch {
      /* modo privado ou sem espaço: a sessão segue só em memória */
    }
  }

  function idDaSessao() {
    try {
      return Number(sessionStorage.getItem(CHAVE_SESSAO)) || null;
    } catch {
      return null;
    }
  }

  function fimSessao() {
    try {
      sessionStorage.removeItem(CHAVE_SESSAO);
    } catch {
      /* nada a fazer */
    }
  }

  function membroPublico(m) {
    return {
      id: m.id,
      nome: m.nome,
      utilizador: m.utilizador,
      papel: m.papel,
      funcao: m.funcao,
      bio: m.bio,
      cor: m.cor,
      criado_em: m.criado_em,
      permissoes: permissoesDe(m.papel),
    };
  }

  function carregarTudo(base) {
    const nomeDe = (id) => base.membros.find((m) => m.id === id)?.nome || null;

    return {
      membros: base.membros.map(membroPublico),
      livros: base.livros
        .slice()
        .sort((a, b) => b.id - a.id)
        .map((l) => ({ ...l, membro_nome: nomeDe(l.membro_id) })),
      informacoes: base.informacoes
        .slice()
        .sort((a, b) => a.ordem - b.ordem || a.id - b.id)
        .map((i) => ({ ...i, autor_nome: nomeDe(i.atualizado_por) })),
      catalogo: PAPEIS.map((papel) => ({ papel, permissoes: permissoesDe(papel) })),
      descricoes: DESCRICOES,
    };
  }

  function lerLivro(corpo) {
    const titulo = texto(corpo?.titulo, 160);
    const autor = texto(corpo?.autor, 120);
    if (!titulo || !autor) throw erro(400, 'Título e autor são obrigatórios.');

    const ano = Number(corpo?.ano);
    const nota = Number(corpo?.nota);

    return {
      titulo,
      autor,
      ano: Number.isInteger(ano) && ano >= 1 && ano <= new Date().getFullYear() + 1 ? ano : null,
      genero: texto(corpo?.genero, 60),
      estado: ESTADOS_LIVRO.includes(corpo?.estado) ? corpo.estado : 'Quero ler',
      nota: Number.isInteger(nota) && nota >= 1 && nota <= 5 ? nota : null,
      resumo: texto(corpo?.resumo, 1200),
    };
  }

  async function pedir(metodo, rota, corpo) {
    const base = abrir();
    const dados = corpo || {};
    const partes = rota.replace(/^\/api\//, '').split('/');
    const recurso = partes[0];
    const id = Number(partes[1]);

    // --- Rotas públicas ---------------------------------------------------
    if (metodo === 'GET' && recurso === 'membros-publicos') {
      return base.membros.map((m) => ({ id: m.id, nome: m.nome, cor: m.cor }));
    }

    if (metodo === 'POST' && recurso === 'entrar') {
      const membro = base.membros.find((m) => m.id === Number(dados.membro_id));
      if (!membro || membro.senha_hash !== hashSenha(dados.senha)) {
        throw erro(401, 'Senha errada. Tenta outra vez.');
      }
      try {
        sessionStorage.setItem(CHAVE_SESSAO, String(membro.id));
      } catch {
        /* sem sessionStorage, a sessão dura até recarregar */
      }
      return { ok: true, nome: membro.nome };
    }

    // --- A partir daqui é preciso sessão ---------------------------------
    // O membro tem de sair do mesmo objeto `base` que vai ser gravado: se vier
    // de outro abrir(), as alterações feitas a `eu` perdem-se no gravar().
    const eu = base.membros.find((m) => m.id === idDaSessao()) || null;
    if (!eu) throw erro(401, 'Precisas de entrar com a tua senha.');

    const minhas = permissoesDe(eu.papel);
    const exigir = (permissao) => {
      if (!minhas.includes(permissao)) throw erro(403, 'A tua permissão não permite esta ação.');
    };

    if (metodo === 'GET' && recurso === 'sessao') {
      return { eu: membroPublico(eu), papeis: PAPEIS, ...carregarTudo(base) };
    }

    if (metodo === 'POST' && recurso === 'sair') {
      fimSessao();
      return { ok: true };
    }

    if (metodo === 'PATCH' && recurso === 'perfil') {
      exigir('perfil.editar');
      eu.funcao = texto(dados.funcao, 80);
      eu.bio = texto(dados.bio, 600);
      gravar(base);
      return { ok: true };
    }

    if (metodo === 'POST' && recurso === 'senha') {
      exigir('senha.mudar');
      if (eu.senha_hash !== hashSenha(dados.atual)) throw erro(400, 'A senha atual não está certa.');
      if (String(dados.nova ?? '').length < 8) throw erro(400, 'A senha nova precisa de pelo menos 8 caracteres.');
      eu.senha_hash = hashSenha(dados.nova);
      gravar(base);
      return { ok: true };
    }

    if (recurso === 'membros' && partes[2] === 'papel' && metodo === 'PATCH') {
      exigir('membros.gerir');
      const alvo = base.membros.find((m) => m.id === id);
      if (!alvo) throw erro(404, 'Pessoa não encontrada.');

      const papel = texto(dados.papel, 20);
      if (!PAPEIS.includes(papel)) throw erro(400, 'Permissão desconhecida.');

      const admins = base.membros.filter((m) => m.papel === 'admin').length;
      if (alvo.papel === 'admin' && papel !== 'admin' && admins <= 1) {
        throw erro(400, 'Tem de ficar pelo menos um administrador no grupo.');
      }

      alvo.papel = papel;
      gravar(base);
      return { ok: true, papel };
    }

    if (recurso === 'membros' && partes[2] === 'senha' && metodo === 'POST') {
      exigir('membros.gerir');
      const alvo = base.membros.find((m) => m.id === id);
      if (!alvo) throw erro(404, 'Pessoa não encontrada.');
      if (String(dados.senha ?? '').length < 8) throw erro(400, 'A senha precisa de pelo menos 8 caracteres.');

      alvo.senha_hash = hashSenha(dados.senha);
      gravar(base);
      return { ok: true };
    }

    if (recurso === 'livros' && metodo === 'POST') {
      exigir('livros.criar');
      const novo = { id: base.proximoId.livros++, ...lerLivro(dados), membro_id: eu.id, criado_em: agora() };
      base.livros.push(novo);
      gravar(base);
      return { ok: true, id: novo.id };
    }

    if (recurso === 'livros' && metodo === 'PUT') {
      exigir('livros.editar');
      const livro = base.livros.find((l) => l.id === id);
      if (!livro) throw erro(404, 'Livro não encontrado.');
      Object.assign(livro, lerLivro(dados));
      gravar(base);
      return { ok: true };
    }

    if (recurso === 'livros' && metodo === 'DELETE') {
      exigir('livros.apagar');
      const posicao = base.livros.findIndex((l) => l.id === id);
      if (posicao < 0) throw erro(404, 'Livro não encontrado.');
      base.livros.splice(posicao, 1);
      gravar(base);
      return { ok: true };
    }

    if (recurso === 'informacoes' && metodo === 'POST') {
      exigir('informacoes.editar');
      const titulo = texto(dados.titulo, 120);
      const conteudo = texto(dados.conteudo, 3000);
      if (!titulo || !conteudo) throw erro(400, 'Título e texto são obrigatórios.');

      const ordem = Number(dados.ordem);
      const nova = {
        id: base.proximoId.informacoes++,
        titulo,
        conteudo,
        ordem: Number.isInteger(ordem) && ordem >= 0 && ordem <= 999 ? ordem : 99,
        atualizado_por: eu.id,
        atualizado_em: agora(),
      };
      base.informacoes.push(nova);
      gravar(base);
      return { ok: true, id: nova.id };
    }

    if (recurso === 'informacoes' && metodo === 'PUT') {
      exigir('informacoes.editar');
      const info = base.informacoes.find((i) => i.id === id);
      if (!info) throw erro(404, 'Informação não encontrada.');

      const titulo = texto(dados.titulo, 120);
      const conteudo = texto(dados.conteudo, 3000);
      if (!titulo || !conteudo) throw erro(400, 'Título e texto são obrigatórios.');

      const ordem = Number(dados.ordem);
      info.titulo = titulo;
      info.conteudo = conteudo;
      info.ordem = Number.isInteger(ordem) && ordem >= 0 && ordem <= 999 ? ordem : 99;
      info.atualizado_por = eu.id;
      info.atualizado_em = agora();
      gravar(base);
      return { ok: true };
    }

    if (recurso === 'informacoes' && metodo === 'DELETE') {
      exigir('informacoes.editar');
      const posicao = base.informacoes.findIndex((i) => i.id === id);
      if (posicao < 0) throw erro(404, 'Informação não encontrada.');
      base.informacoes.splice(posicao, 1);
      gravar(base);
      return { ok: true };
    }

    throw erro(404, 'Rota não encontrada.');
  }

  window.PortalAPI = { pedir };
})();
