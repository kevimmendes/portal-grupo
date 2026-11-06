# Portal do Grupo de Estudos

Portal do grupo com uma aba por pessoa, lista de livros e informacoes gerais, protegido por senha.

## O que e

- **Abas por pessoa**: cada membro tem a sua aba com funcao, descricao, permissoes e livros.
- **Livros**: lista comum com estado de leitura, nota e resumo.
- **Informacoes**: regras, divisao de tarefas e notas do grupo.
- **Permissoes**: Kevim e o unico administrador; todos os outros sao editores.

## Versao publicada (GitHub Pages)

Esta versao corre toda no browser. Os dados ficam guardados no `localStorage` de cada navegador e a senha e verificada no cliente, por isso serve para uso entre pessoas que confiam umas nas outras. Nao guarda nada num servidor.

Ficheiros: `index.html`, `style.css`, `app.js`, `api-local.js`, `dados-iniciais.js`.

## Versao com servidor

O projeto completo, com Node, Express e SQLite, senhas com `scrypt` e sessoes no servidor, vive em [kevimmendes/estudos](https://github.com/kevimmendes/estudos) na pasta `projetos/portal-grupo/`.

## Senhas iniciais

Cada pessoa entra com o seu nome e a senha inicial. Kevim: `kevim20202`. Os editores: `<nome>2026`.

Depois de entrar, muda a senha no botao **Senha**.
