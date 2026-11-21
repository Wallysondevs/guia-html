# Guia HTML

Site: https://wallysondevs.github.io/guia-html/

Curso de HTML (HTML Living Standard) em português, do zero ao avançado, feito para quem **nunca fez um site**. Funciona como uma escola: uma aula para cada assunto, organizadas em **3 níveis + projetos + referência** (129 páginas).

Cada aula explica cada tag parte por parte (anatomia), mostra o **resultado real** (o próprio navegador desenha cada exemplo), o que acontece quando dá errado, com o que o navegador faz e a mensagem verdadeira do validador, e exercícios no fim. Todo o código foi conferido com o **validador oficial do W3C** (`vnu` 26.10.12).

Para praticar, as páginas trazem dois recursos que rodam no seu navegador:

- **Quadro "Resultado"** (`pre.file[data-resultado]`): o navegador desenha o exemplo logo abaixo do código. Nunca é uma imagem.
- **Editor "Experimente"** (`.tryhtml`): HTML ao vivo, com abas, resultado desenhado na hora e **missões** que conferem se você chegou ao resultado pedido.

Os dois usam `assets/htmlsim.js`, que desenha o código num `<iframe>` só para você. Um service worker (`assets/htmlsim-sw.js`) faz as abas funcionarem como um site de verdade: links para `sobre.html`, `estilo.css` ou uma imagem de `assets/midia/` funcionam dentro da caixa.

Site 100% estático (HTML + CSS + JS, sem build e sem dependências externas): funciona no GitHub Pages. Para usar o editor no seu computador, sirva a raiz do site com um servidor local em vez de abrir o arquivo direto.

## Estrutura

```
index.html                 página inicial
<tema>.html                uma aula por tema
assets/style.css           visual
assets/site.js             níveis/menu (lista NIVEIS), Anterior/Próximo, anatomia, exercícios
assets/htmlsim.js          o editor "Experimente" e os quadros "Resultado"
assets/htmlsim-sw.js       service worker que serve os arquivos das abas do editor
assets/midia/              imagens, áudio e vídeo de exemplo usados nas aulas
tools/testar-missoes.js    testa as missões e os quadros "Resultado" num Chromium de verdade
tools/midia/               gerador da mídia de exemplo
tools/demo.html            página de teste do editor
tools/package.json         dependência do testador (puppeteer-core)
CONTRIBUINDO.md            como escrever uma aula
.nojekyll                  faz o GitHub Pages servir os arquivos como estão
```

## Testes

O testador usa um Chromium sem janela. Instale a dependência uma vez com `cd tools && npm install` (o caminho do navegador pode ser trocado pela variável `CHROMIUM`).

```bash
node tools/testar-missoes.js                 # todas as missões e quadros "Resultado"
node tools/testar-missoes.js pagina.html     # só estas páginas (-v mostra cada meta)
node tools/testar-missoes.js --nativo pagina.html   # também valida no validador W3C (precisa do laboratório)
```

Para testar o editor à mão, sirva a raiz do site e abra `/tools/demo.html`.

## Publicar no GitHub Pages

Envie a pasta para um repositório e ative **Settings → Pages → Deploy from a branch → main / (root)**.

## Adicionar uma aula

Leia `CONTRIBUINDO.md` e inclua a página na lista `NIVEIS` de `assets/site.js`.
