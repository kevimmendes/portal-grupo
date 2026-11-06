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
      'projetos.gerir',
      'perfil.editar',
      'senha.mudar',
    ],
    editor: [
      'membros.ver',
      'livros.criar',
      'livros.editar',
      'informacoes.editar',
      'projetos.gerir',
      'perfil.editar',
      'senha.mudar',
    ],
    leitor: ['membros.ver', 'perfil.editar', 'senha.mudar'],
  };

  const DESCRICOES_PERMISSAO = {
    'membros.ver': 'Ver as abas de todas as pessoas do grupo',
    'membros.gerir': 'Mudar permissões e repor senhas',
    'livros.criar': 'Adicionar livros à lista',
    'livros.editar': 'Editar livros e anexar os PDF',
    'livros.apagar': 'Apagar livros da lista',
    'informacoes.editar': 'Editar as informações do grupo',
    'projetos.gerir': 'Criar e editar os projetos da própria aba',
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

  // A lista começa vazia: cada pessoa do grupo acrescenta os livros que vamos
  // lendo, com o PDF anexado. Assim o portal publicado não traz livros de exemplo.
  const LIVROS = [];

  // Projetos de cada pessoa, mostrados na aba dela.
  const PROJETOS = [
    {
      titulo: 'Portal do grupo',
      membro: 'Kévim',
      estado: 'A decorrer',
      descricao: 'Este portal: abas por pessoa, livros em PDF e informações do grupo.',
      link: '',
    },
    {
      titulo: 'Ligação ao GitHub',
      membro: 'Kévim',
      estado: 'Planeado',
      descricao: 'Uma aba para ligar o portal à conta GitHub e mostrar os repositórios do grupo.',
      link: '',
    },
    {
      titulo: 'Calendário de entregas',
      membro: 'Diogo',
      estado: 'A decorrer',
      descricao: 'Datas das reuniões e das entregas do trabalho, para ninguém se esquecer.',
      link: '',
    },
    {
      titulo: 'Lista de bibliografia',
      membro: 'Bernardo',
      estado: 'Concluído',
      descricao: 'Levantamento dos livros e artigos que o grupo vai usar.',
      link: '',
    },
    {
      titulo: 'Resumos do primeiro capítulo',
      membro: 'Rodrigo',
      estado: 'A decorrer',
      descricao: 'Resumos por capítulo, com as citações que interessam à apresentação.',
      link: '',
    },
    {
      titulo: 'Formatação do documento final',
      membro: 'Tiago',
      estado: 'Planeado',
      descricao: 'Capa, índices, tipos de letra e revisão antes da entrega.',
      link: '',
    },
    {
      titulo: 'Citações e referências',
      membro: 'Simão',
      estado: 'A decorrer',
      descricao: 'Normas de citação e contactos com os professores.',
      link: '',
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
        'Administrador (só o Kévim): vê tudo, gere pessoas e permissões e apaga livros.\nEditor (todos os outros): adiciona e edita livros e informações, anexa PDF e cria os seus projetos.\nLeitor: consulta o portal e edita apenas a sua própria descrição, caso um dia seja preciso dar acesso só de leitura.\n\nSó o administrador pode mudar o papel de alguém.',
    },
    {
      titulo: 'Livros e PDF',
      ordem: 5,
      conteudo:
        'Cada livro pode ter o PDF anexado. Na lista dos livros, o botão «Anexar PDF» escolhe um ficheiro do computador e o botão «Abrir PDF» abre-o numa aba nova.\n\nO PDF fica guardado no navegador de quem o anexou, não num servidor: quem entrar noutro computador só vê o PDF depois de o anexar outra vez. Os livros e as informações que acrescentares ficam sempre guardados neste navegador, mesmo que o site seja atualizado.',
    },
  ];

  return { PERMISSOES, DESCRICOES_PERMISSAO, MEMBROS, LIVROS, PROJETOS, INFORMACOES };
});
