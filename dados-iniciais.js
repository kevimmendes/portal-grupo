// Dados iniciais do portal do grupo.
//
// Este ficheiro é partilhado: o server.js usa-o para semear o SQLite e a versão
// estática (pagina-estatica/) usa-o no browser. Assim as pessoas, os livros e as
// informações só estão escritos num sítio.

(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.DADOS_INICIAIS = fabrica();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Cada papel é um conjunto fixo de permissões. Quem manda é o servidor (ou a
  // versão estática, no caso do GitHub Pages): esconder um botão não é segurança.
  const PERMISSOES = {
    admin: [
      'membros.ver',
      'membros.gerir',
      'livros.criar',
      'livros.editar',
      'livros.apagar',
      'informacoes.editar',
      'perfil.editar',
      'senha.mudar',
    ],
    editor: [
      'membros.ver',
      'livros.criar',
      'livros.editar',
      'informacoes.editar',
      'perfil.editar',
      'senha.mudar',
    ],
    leitor: ['membros.ver', 'perfil.editar', 'senha.mudar'],
  };

  const DESCRICOES_PERMISSAO = {
    'membros.ver': 'Ver as abas de todas as pessoas do grupo',
    'membros.gerir': 'Mudar permissões e repor senhas',
    'livros.criar': 'Adicionar livros à lista',
    'livros.editar': 'Editar livros da lista',
    'livros.apagar': 'Apagar livros da lista',
    'informacoes.editar': 'Editar as informações do grupo',
    'perfil.editar': 'Editar a própria descrição',
    'senha.mudar': 'Mudar a própria senha',
  };

  const MEMBROS = [
    {
      nome: 'Kévim',
      utilizador: 'kevim',
      papel: 'admin',
      funcao: 'Administrador do portal',
      cor: '#22d3ee',
      senha: 'kevim20202',
      bio: 'Criei e mantenho o portal. Sou a única pessoa com permissão para gerir acessos e apagar conteúdo.',
    },
    {
      nome: 'Diogo',
      utilizador: 'diogo',
      papel: 'editor',
      funcao: 'Coordenação do grupo',
      cor: '#8b5cf6',
      senha: 'diogo2026',
      bio: 'Organizo as reuniões, o calendário dos trabalhos e a apresentação final.',
    },
    {
      nome: 'Bernardo',
      utilizador: 'bernardo',
      papel: 'editor',
      funcao: 'Pesquisa e livros',
      cor: '#38bdf8',
      senha: 'bernardo2026',
      bio: 'Ando à procura de bibliografia e mantenho a lista de livros do grupo.',
    },
    {
      nome: 'Rodrigo',
      utilizador: 'rodrigo',
      papel: 'editor',
      funcao: 'Resumos e apontamentos',
      cor: '#34d399',
      senha: 'rodrigo2026',
      bio: 'Faço os resumos dos capítulos e os apontamentos que servem de base ao trabalho.',
    },
    {
      nome: 'Tiago',
      utilizador: 'tiago',
      papel: 'editor',
      funcao: 'Revisão e formatação',
      cor: '#fbbf24',
      senha: 'tiago2026',
      bio: 'Reviso os textos antes de entregar e trato da formatação do documento.',
    },
    {
      nome: 'Simão',
      utilizador: 'simao',
      papel: 'editor',
      funcao: 'Bibliografia e contactos',
      cor: '#f472b6',
      senha: 'simao2026',
      bio: 'Trato das citações, das referências e dos contactos com os professores.',
    },
  ];

  const LIVROS = [
    {
      titulo: 'Ensaio sobre a Cegueira',
      autor: 'José Saramago',
      ano: 1995,
      genero: 'Romance',
      estado: 'Lido',
      nota: 5,
      resumo: 'Uma cidade inteira fica cega de repente. Serve para discutir organização social e solidariedade.',
      membro: 'Bernardo',
    },
    {
      titulo: 'Os Maias',
      autor: 'Eça de Queirós',
      ano: 1888,
      genero: 'Romance',
      estado: 'A ler',
      nota: 4,
      resumo: 'Leitura obrigatória para a parte de Realismo. Vale a pena ler os capítulos sobre a educação de Carlos.',
      membro: 'Rodrigo',
    },
    {
      titulo: 'Mensagem',
      autor: 'Fernando Pessoa',
      ano: 1934,
      genero: 'Poesia',
      estado: 'Lido',
      nota: 5,
      resumo: 'Poesia sebastianista. Útil para a apresentação sobre o imaginário nacional.',
      membro: 'Diogo',
    },
    {
      titulo: 'O Primo Basílio',
      autor: 'Eça de Queirós',
      ano: 1878,
      genero: 'Romance',
      estado: 'Quero ler',
      nota: null,
      resumo: 'Segunda opção para a análise do Realismo, se faltar tempo para Os Maias.',
      membro: 'Tiago',
    },
    {
      titulo: 'A Cidade e as Serras',
      autor: 'Eça de Queirós',
      ano: 1901,
      genero: 'Romance',
      estado: 'Quero ler',
      nota: null,
      resumo: 'Contraste entre a cidade e o campo. Bom para a parte final do trabalho.',
      membro: 'Simão',
    },
    {
      titulo: 'Livro do Desassossego',
      autor: 'Fernando Pessoa',
      ano: 1982,
      genero: 'Prosa',
      estado: 'A ler',
      nota: 4,
      resumo: 'Fragmentos. Cada pessoa leu uma parte e trouxe uma citação para a reunião.',
      membro: 'Bernardo',
    },
    {
      titulo: 'Memorial do Convento',
      autor: 'José Saramago',
      ano: 1982,
      genero: 'Romance histórico',
      estado: 'Lido',
      nota: 4,
      resumo: 'Ligação entre o poder e as pessoas comuns. Bom exemplo de narrador interventivo.',
      membro: 'Rodrigo',
    },
    {
      titulo: 'Peregrinação',
      autor: 'Fernão Mendes Pinto',
      ano: 1614,
      genero: 'Literatura de viagens',
      estado: 'Quero ler',
      nota: null,
      resumo: 'Para a parte dos Descobrimentos, se o professor pedir fontes da época.',
      membro: 'Simão',
    },
  ];

  const INFORMACOES = [
    {
      titulo: 'Sobre o grupo',
      ordem: 1,
      conteudo:
        'Somos seis no grupo: Kévim, Diogo, Bernardo, Rodrigo, Tiago e Simão. O grupo junta-se à terça e à quinta, depois das aulas, na biblioteca.\n\nEste portal serve para guardar o que cada pessoa está a fazer, a lista de livros que vamos lendo e as informações que todos precisam de saber. O Kévim é o administrador: só ele mexe nos acessos e apaga conteúdo.',
    },
    {
      titulo: 'Regras do grupo',
      ordem: 2,
      conteudo:
        '1. Cada pessoa atualiza a sua própria aba quando muda de tarefa.\n2. Os livros que entram na lista ficam com o estado certo: Lido, A ler ou Quero ler.\n3. Quem falta a uma reunião lê as informações aqui antes da seguinte.\n4. Ninguém partilha a senha com outra pessoa — se for preciso, o administrador repõe.',
    },
    {
      titulo: 'Tarefas e divisão',
      ordem: 3,
      conteudo:
        'Diogo: coordenação, calendário e apresentação.\nBernardo: pesquisa de bibliografia e lista de livros.\nRodrigo: resumos dos capítulos e apontamentos.\nTiago: revisão e formatação do documento.\nSimão: citações, referências e contactos.',
    },
    {
      titulo: 'Permissões do portal',
      ordem: 4,
      conteudo:
        'Administrador (só o Kévim): vê tudo, gere pessoas e permissões e apaga livros.\nEditor (todos os outros): adiciona e edita livros e informações.\nLeitor: consulta o portal e edita apenas a sua própria descrição, caso um dia seja preciso dar acesso só de leitura.\n\nSó o administrador pode mudar o papel de alguém.',
    },
  ];

  return { PERMISSOES, DESCRICOES_PERMISSAO, MEMBROS, LIVROS, INFORMACOES };
});
