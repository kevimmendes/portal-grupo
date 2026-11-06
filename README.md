# Portal do Grupo de Estudos

Portal do grupo com uma aba por pessoa, lista de livros em PDF e informacoes gerais, protegido por senha.

## O que tem

- **Abas por pessoa**: cada membro tem a sua aba com funcao, descricao, permissoes, livros e projetos.
- **Projetos**: cada pessoa lista os seus projetos na propria aba, com estado (Planeado, A decorrer, Concluido) e um link opcional. Cada um mexe nos seus; o administrador pode mexer em todos.
- **Livros com PDF**: cada livro tem o botao **Anexar PDF** (escolhe um ficheiro do computador) e **Abrir PDF** (abre numa aba nova). Tambem aceita um link em vez do ficheiro.
- **Informacoes**: regras, divisao de tarefas e avisos do grupo.
- **Permissoes**: Kevim e o unico administrador; todos os outros sao editores.

## Versao publicada (GitHub Pages)

Esta versao corre toda no browser. Os dados ficam no `localStorage` e os PDF no `IndexedDB` de cada navegador, e a senha e verificada no cliente. Serve para uso entre pessoas que confiam umas nas outras: nao ha servidor nem base de dados partilhada.

Isso quer dizer que os PDF que anexares so existem no teu navegador. Para um PDF comum ao grupo, usa um link (por exemplo um ficheiro no proprio repositorio) em vez do ficheiro local.

Ficheiros: `index.html`, `style.css`, `app.js`, `api-local.js`, `dados-iniciais.js`.

## Versao com servidor

O projeto completo, com Node, Express e SQLite, senhas com `scrypt` e sessoes no servidor, vive em [kevimmendes/estudos](https://github.com/kevimmendes/estudos) na pasta `projetos/portal-grupo/`. Essa versao ainda nao tem projetos nem PDF: a interface esconde essas partes.

## Senhas iniciais

Cada pessoa entra com o seu nome e a senha inicial. Kevim: `kevim20202`. Os editores: `<nome>2026`.

Depois de entrar, muda a senha no botao **Senha**.

## A seguir

- Uma aba para ligar o portal a conta GitHub e mostrar os repositorios do grupo.
