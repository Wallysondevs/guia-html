# Como escrever uma página do Guia HTML

O guia é uma **escola**, estilo W3Schools, para quem **nunca fez um site**. **Uma aula = um assunto.** O dono do projeto já reclamou de outro guia que juntava vários assuntos numa página. Nunca mostre código "seco":
- explique cada parte (anatomia);
- mostre o **resultado real**: o próprio navegador do leitor desenha cada exemplo;
- mostre o que acontece quando dá errado, com o que o navegador faz e a mensagem **real** do validador W3C;
- deixe o leitor praticar no editor do guia.

Antes de tudo, leia o `RECURSOS.md`: onde trabalhar (VPS) e como.

## 1. Esqueleto do arquivo
Use como modelo a estrutura de `~/guia-c/variaveis.html` (cabeçalho, `<main>`, blocos, rodapé). Troque:
- `<title>HTML TEMA — descrição | Guia HTML</title>`;
- `<h1>HTML <span class="hl">TEMA</span></h1>`;
- a caixa `.tryc` por **`.tryhtml`**.

Menu, selo e Anterior/Próximo vêm de `assets/site.js` (`NIVEIS`). **Não mude a `NIVEIS`.** Links internos só para páginas que estão nela.

## 2. Ordem de uma aula
1. Intro.
2. "Você vai aprender".
3. A ideia antes do código, com uma comparação do dia a dia.
4. Do simples ao completo, uma novidade por vez, com `dl.anatomy` ou uma tabela "parte → o que faz".
5. **O resultado** depois de cada exemplo (`pre.file` com `data-resultado`, veja abaixo).
6. **Pelo menos dois "Experimente"** (`.tryhtml`) por aula: um no meio e uma missão no fim.
7. Formas diferentes + "qual usar".
8. **Quando dá errado** (`div.cenario`): o código errado, o que o navegador **realmente** mostra (ele quase nunca dá erro: conserta sozinho, e às vezes de um jeito estranho) e a mensagem do validador W3C.
9. Referência (`table.ref`).
10. Exercícios (3 ou mais: `.exercise`, `.mc`).
11. Resumo.

Páginas de **Projetos**: passo a passo (versão 1, 2, 3… da página, cada uma com um `.tryhtml`). Páginas de **Referência**: tabelas, com poucos `.tryhtml`. `quiz.html`: só `.mc`.

## 3. Componentes

### Código para ler, com o resultado embaixo
```html
<pre class="file" data-file="index.html" data-resultado>&lt;h1&gt;Receitas da Ana&lt;/h1&gt;
&lt;p&gt;Bolo de cenoura com cobertura de chocolate.&lt;/p&gt;
</pre>
```
- Dentro de `<pre>`, **todo** `<`, `>` e `&` do código vira `&lt;`, `&gt;` e `&amp;`. Isso é o mais importante deste guia, e o testador confere. Uma entidade que você quer **mostrar** (`&amp;nbsp;`) vira `&amp;amp;nbsp;`.
- Com `data-resultado`, o site desenha o código num quadro "Resultado" logo abaixo, com o navegador do leitor. É o resultado real, nunca uma imagem. Para CSS ou JS junto, use várias abas (`.tryhtml`).
- Sem `data-resultado`: só o código.

### Terminal (`pre.term`)
Igual aos outros guias: `$ ` = `ana@notebook:~$`, `> ` = continuação, `«` = anotação. Use-o para o validador (`vnu index.html`), o servidor local (`python3 -m http.server`), `curl -I`, `ls` e `tree`.

### Editor "Experimente" (`.tryhtml`)
```html
<div class="tryhtml" data-goal="texto:h1=Receitas da Ana">
<p class="try-task"><strong>Missão:</strong> troque o título por "Receitas da Ana".</p>
<pre class="script" data-file="index.html">&lt;h1&gt;Meu site&lt;/h1&gt;
</pre>
<pre class="solucao" data-file="index.html">&lt;h1&gt;Receitas da Ana&lt;/h1&gt;
</pre>
</div>
```
- O leitor edita o código e vê o **resultado ao vivo**, desenhado pelo navegador dele, num quadro isolado.
- **Abas:** vários `<pre class="script" data-file="…">` (`index.html`, `estilo.css`, `script.js`, `sobre.html`…) viram abas, e os links entre elas funcionam dentro do quadro.
- **Console:** o que o `script.js` escreve com `console.log` (e os erros de JS) aparece embaixo.
- O agente do simulador documenta na §4 os detalhes: as imagens de exemplo disponíveis, os formulários, o que fica isolado.
- Sem `data-goal`: caixa livre. Com `data-goal`: missão, e o `pre.solucao` é **obrigatório**. Com várias abas, use um `pre.solucao data-file="…"` para cada arquivo que muda.

### Metas (`data-goal`, separadas por vírgula; `\,` = vírgula literal)
As metas olham a **página já desenhada pelo navegador** (o DOM), e não o texto do código. Por exemplo, `<h1>Oi</h2>` vira um `h1` consertado pelo navegador.

| Meta | Verdade quando… |
| --- | --- |
| `sel:SELETOR` | existe pelo menos um elemento que casa com o seletor CSS (`sel:img[alt]`, `sel:nav ul li a`) |
| `nsel:SELETOR=N` | existem exatamente N elementos (`nsel:li=3`) |
| `texto:SELETOR=TEXTO` | o texto do **primeiro** elemento que casa (espaços juntados, sem as pontas) **contém** TEXTO, diferenciando maiúsculas de minúsculas |
| `attr:SELETOR[ATRIBUTO]=VALOR` | o atributo do primeiro elemento é **igual** a VALOR; sem `=VALOR`, basta o atributo existir. **O último `[…]` é sempre o atributo** e o resto é o seletor: `attr:nav a[aria-current]=page` lê o `aria-current` do **primeiro** `nav a`. Para escolher o link que tem o atributo, filtre no seletor: `attr:nav a[aria-current][aria-current]=page` |
| `css:SELETOR{propriedade}=VALOR` | o estilo **calculado** (`getComputedStyle`) do primeiro elemento é igual a VALOR (`css:h1{color}=rgb(255, 0, 0)`) |
| `console:TEXTO` | a saída do console (log e erros) contém TEXTO |
| `src:REGEX` | o código de todas as abas casa com a regex (flags `m` e `i`) |
| `nsrc:REGEX` | o código **não** casa com a regex (para proibir algo, como `nsrc:<font`) |

**Regras exatas (decididas antes de escrever; não invente outras):**
- **Regex** (`src:`, `nsrc:`): é a regex do JavaScript. `|` é alternativa e `\|` é uma barra vertical literal.
- **`texto:`** usa o texto como o leitor vê: um `<br>` e o fim de cada bloco (`p`, `li`, `div`…) contam como espaço.
- **`src:`/`nsrc:` usam a flag `i`**, que junta maiúsculas e minúsculas também com acento: `Ã` casa com `ã`. Para letras exatas, use classes de caracteres (ex.: `nsrc:Ã[£§¡]`).
- **Seletor:** é o CSS normal do `querySelector`. Para vírgula dentro de um seletor (`h1, h2`), escreva `\,`.
- **Escapes no `data-goal`:** `\,` é vírgula literal; `\\` é uma barra invertida literal. Uma vírgula sem escape só separa metas quando vem seguida do nome de uma meta. Dentro do atributo, `&lt;` e `&gt;` são `<` e `>`.
- O **código inicial não pode cumprir a meta**, e a **solução tem de cumprir** (o testador confere).
- **A solução tem de ser HTML válido** no validador W3C (`--nativo`). A exceção é uma missão que ensina justamente um erro, e mesmo assim a solução conserta.
- Não use meta que dependa da fonte, do tamanho da tela ou do navegador (larguras em pixels, quebra de linha).

### Outros blocos
`dl.anatomy`, `div.note/.tip/.warning/.cenario`, `ol.passo`, `div.table-wrap > table.ref`, `.exercise`, `.mc`, `figure`.

No `.exercise`, `data-answer="a|b"` aceita respostas alternativas (`\|` é uma barra literal). O site corta os espaços do começo e do fim da resposta.

## 4. O editor do guia (`assets/htmlsim.js`)
> **Esta seção é mantida pelo agente do simulador.** Antes de escrever uma frase do tipo "no editor…" que não esteja aqui, confira com as ferramentas dele.

**Testador pronto (17/10, 15:55).** Mídia de exemplo pronta (lista abaixo). A aula do editor para o leitor é `simulador.html`; a página de teste é `tools/demo.html`.

### O testador (na VPS)
```bash
~/guia-html-lab/testar pagina.html            # no notebook (roda na VPS, com timeout)
~/guia-html-lab/testar -v pagina.html         # mostra cada meta, o que o código inicial ainda não cumpre e o console
~/guia-html-lab/testar --nativo pagina.html   # + validador W3C do laboratório (vnu 26.10.12)
```
- Abre a página num **Chromium de verdade** (sem janela), com o **mesmo** `assets/htmlsim.js` do leitor: as metas são avaliadas pelo mesmo código, no mesmo quadro.
- Em cada missão: põe o código inicial e confere que **alguma meta falha**; põe a solução e confere que **todas passam**. Mostra o motivo, por exemplo: `texto:h1=Receitas da Ana (hoje o texto é “Meu site”)`.
- Confere o **escape** de todo `<pre>`:
  - `<` ou `&` cru dentro de `pre.file`, `pre.script` ou `pre.solucao` é **falha**;
  - uma entidade como `&copy;` crua é **aviso**: o leitor veria `©` no código; para mostrar `&copy;`, escreva `&amp;copy;`.
- Confere o contrato: meta desconhecida, seletor ou regex inválidos, missão sem `pre.solucao`, abas com o mesmo nome, caixa sem aba `.html`.
- **Avisos** (`!`, não são falha):
  - erro no console da solução, de uma caixa livre ou de um Resultado (por exemplo, `Não foi possível carregar "bolo.jpg" (<img>)`);
  - solução desenhada em modo quirks.
- Guarda o que passou em `tools/.cache-missoes.json`. Só testa de novo a caixa que mudou (ou tudo, se o `htmlsim.js` mudar). Use `--sem-cache` para forçar.
- `--nativo`: valida no `vnu` do lab **a solução de cada missão** (abas `.html` e `.css`) e **cada `pre.file[data-resultado]`**.
  - Solução com erro do W3C = **falha**.
  - Resultado com erro = só mostra (é normal num "quando dá errado").
  - As mensagens saem no formato da linha de comando, com as linhas do **seu** código: `"index.html":3.29-3.35: error: …`.
  - Num fragmento, as linhas e colunas já descontam o esqueleto. Um erro que o validador só percebe no fim do arquivo (`End of file seen…`, por exemplo de um `<textarea>` sem fechar) aparece sem posição, com a nota "depois do fim do seu código".
  - O `vnu --also-check-css` 26.10.12 conta as linhas do HTML uma a menos. Por isso o testador valida o HTML e o CSS em rodadas separadas: as posições que ele mostra são as mesmas de `vnu arquivo.html`.
- As metas são conferidas logo depois que a página carrega, **sem cliques**. Uma missão do tipo "clique no botão" não dá para testar: use `src:` (por exemplo, `src:addEventListener\("click"`) e deixe o leitor clicar.

### O que o quadro faz
- **Resultado ao vivo:** cada caixa desenha o código num `<iframe>` próprio, meio segundo depois que o leitor para de digitar (Ctrl+Enter desenha na hora). O CSS e o JS do leitor não vazam para a página do guia.
- **Um site de verdade:** as abas viram arquivos de uma pasta.
  - Um *service worker* (`assets/htmlsim-sw.js`) serve a pasta `assets/sim/<caixa>/`, com cada aba no próprio endereço.
  - Por isso funcionam, como num site publicado: `<link href="estilo.css">`, `<script src="script.js">`, `<a href="sobre.html">`, `href="#receita"`, pastas (`data-file="css/estilo.css"`) e `../`.
  - O DOM fica **exatamente** como o navegador montou: o `<link>` continua `<link href="estilo.css">`. Por isso `attr:link[href]=estilo.css` funciona.
- **Mídia:** `assets/midia/…` funciona dentro do quadro e no Resultado, como se a pasta da caixa fosse a raiz do guia. Escreva `src="assets/midia/bolo-800.jpg"`, sem `/` no começo e sem `../`.
- **Abas e navegação:**
  - editar uma aba `.html` mostra essa página no quadro;
  - editar `.css`/`.js` redesenha a página que está aberta;
  - o botão ↻ volta à primeira aba `.html`;
  - a barra do quadro mostra o endereço (`obrigado.html?nome=Ana`);
  - ↗ abre o resultado numa aba nova.
- **Console** embaixo do quadro, com `console.log/info/warn/error` (objetos e elementos formatados de forma simples, como o F12) e os erros de JS com o arquivo e a linha. Exemplo: `Uncaught ReferenceError: x is not defined   (script.js, linha 3)`. O texto do erro é o do navegador do leitor e muda de navegador para navegador.
  - Imagem, vídeo, CSS ou script que não carregou também aparece: `Não foi possível carregar "fotoo.jpg" (<img>). Confira o nome e o caminho do arquivo.`
  - O console aparece sempre quando a caixa tem JS (aba `.js`, `<script>`, `onclick=`…) ou uma meta `console:`; nas outras caixas, só quando aparece alguma mensagem.
- **Links especiais:**
  - `mailto:`, `tel:` e `sms:` não abrem nada: o console mostra `[editor] Este link abriria o programa de e-mail, para escrever para ana@exemplo.com`;
  - um link para outro site abre numa **aba nova** do navegador (com aviso no console);
  - `target="_top"`/`"_parent"` abre no próprio quadro (com aviso);
  - um link para uma página que não é aba mostra uma página **404** do editor, com a lista das abas;
  - `download` baixa de verdade.
- **Formulários (decisão):** o editor não tem servidor. No envio (depois da validação do navegador: `required`, `pattern`… funcionam de verdade):
  - o console mostra `[editor] Formulário enviado: GET obrigado.html?nome=Ana`, ou `POST … corpo: nome=Ana&sabor=Cenoura`;
  - os dados são codificados como no navegador de verdade (`application/x-www-form-urlencoded`): espaço vira `+`, e a quebra de linha de um `<textarea>` vira `%0D%0A` (CRLF, conferido no Chromium);
  - um **GET** para uma aba (`action="obrigado.html"`) abre essa aba **com os dados no endereço**, e o JS dela consegue ler o `location.search`;
  - qualquer outro envio (um POST, ou um `action` que não é aba, como `enviar.php` ou `https://…`) mostra a página **"📨 Formulário enviado"**:
    - o método e o `action`;
    - o endereço que abriria (GET) ou o corpo da mensagem (POST);
    - a tabela `name → value`;
    - um aviso de que um campo sem `name` não é enviado;
    - o botão "Voltar ao formulário".
  - Um `submit` com `preventDefault()` no JS do leitor não é tocado.
  - `method="dialog"` fecha o `<dialog>`, como no navegador.
- **`alert`, `confirm` e `prompt`** funcionam (são do navegador).
- **Validar no W3C (decisão: tem, opcional):** o botão manda o código da aba `.html` aberta para `validator.w3.org/nu`, só **depois de o leitor confirmar** (o código vai para a internet). As mensagens aparecem em inglês, com a linha e a coluna. As metas **não** dependem disso.
- **Restaurar** volta ao código original. **Ver solução** pede confirmação e troca as abas que a solução muda.
- **Missão:** "Missão em andamento… Ainda falta: h1 com o texto “Receitas da Ana” (hoje o texto é “Meu site”)" → "✔ Missão cumprida!".
  - As metas olham a **primeira aba `.html`**. São conferidas quando ela carrega, a cada mensagem no console e a cada mudança no DOM (o leitor clicou, digitou num campo).
  - Se o leitor estiver em outra página do quadro, a missão pede para voltar (↻).

### Fragmento × documento completo (decisão)
- **Fragmento** = código sem `<!DOCTYPE>`, `<html>`, `<head>` e `<body>` (por exemplo, `<h1>Oi</h1><p>…</p>`). O quadro o desenha como **parte de uma página completa em modo padrão** (põe `<!DOCTYPE html>` na frente). O que só cabe no `<head>` (`<title>`, `<meta>`…) vai para o head, como o navegador faria.
- **Documento** (tem `<html>`, `<head>`, `<body>` ou `<!DOCTYPE>`): é desenhado **como está**. Sem o `<!DOCTYPE html>`, ele fica em **modo quirks** (`document.compatMode` é `"BackCompat"`), igual ao navegador de verdade. Use isso na aula do DOCTYPE.
- **Validador** (`--nativo` e o botão "Validar no W3C"): o fragmento entra num **esqueleto mínimo válido**. A primeira linha é `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Exemplo</title>` (sem o `meta`/`title` se o fragmento já tiver os seus), depois vem o fragmento e, no fim, `</body></html>`. As linhas das mensagens já são as do seu código.

### `pre.file[data-resultado]`
- Desenha o código num quadro **"Resultado"** logo abaixo, isolado, com a **altura do conteúdo** (até 640 px; depois rola). Só é desenhado quando chega perto da tela.
- O `data-file` é só o **rótulo**: `"trecho"` e `"receita.html · erro de propósito"` funcionam, e o código é sempre desenhado como HTML. Um rótulo `.css`/`.js` não é desenhado (o testador acusa): para CSS ou JS junto, use um `.tryhtml` com abas.
- Tem console próprio, que aparece só quando há mensagem (um `console.log` do exemplo, uma imagem que não carregou).

### O que o quadro NÃO faz
- Não tem servidor: nada de PHP, de `POST` de verdade ou de cookies vindos de um servidor.
- Não tem caminho absoluto `/…` (num site do GitHub Pages ele aponta para outro lugar): use caminhos relativos.
- Não abre sites de fora **dentro** do quadro, a não ser num `<iframe>` do próprio código do leitor. Um link para outro site vai para uma aba nova.
- **Não é uma barreira de segurança.**
  - O quadro é um `<iframe>` da mesma origem do guia (precisa ser, para o service worker e as metas), **sem** o atributo `sandbox`.
    - Com `sandbox="allow-scripts allow-same-origin"`, o Chrome mostraria no F12 da página do guia um aviso por quadro: `An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing.`
    - O editor mesmo impede que um link (`target="_top"`) ou um formulário troque a página do guia.
  - O CSS e o JS do leitor ficam no documento do quadro. Mesmo assim, um script **pode** alcançar a página do guia (`parent`, `top.location`) e o `localStorage` dela (o tema escolhido). Não ensine `localStorage.clear()` nem `top.location` no editor.
- **Quando o editor usa cada modo (`HtmlSim.modo()` diz qual):**
  - **service worker** (o modo completo, descrito acima): quando o navegador tem `navigator.serviceWorker` e `caches`, a página está num contexto seguro (`https://`, ou `http://localhost`/`127.0.0.1`) e o `assets/htmlsim-sw.js` fica ativo em até 6 segundos. É o caso do guia publicado no GitHub Pages e do testador.
  - **`srcdoc`** (modo simples): em qualquer outro caso (arquivo aberto do disco com `file://`, `http://` sem ser localhost, janela anônima do Firefox, service worker bloqueado) ou com `?htmlsim=simples` no endereço (para conferir). O console do F12 mostra `htmlsim: sem service worker (…); usando o modo simples` quando a tentativa falha.
- **Modo simples**, conferido no Chromium:
  - o CSS e o JS das abas entram embutidos: o `href` do `<link>` muda, e as metas `attr:` em `link`/`script` podem falhar;
  - os links entre as abas e os formulários continuam funcionando;
  - um `href="#x"` navega de verdade para o fragmento do próprio quadro, como no modo completo: rola, liga o `:target` e move o ponto de partida do foco (o próximo <kbd>Tab</kbd> parte dali);
  - um link para uma página que não existe só dá um aviso no console;
  - um GET para outra aba não leva os dados no `location.search`;
  - o documento **nunca** fica em modo quirks (é a regra do `srcdoc`);
  - `assets/midia/…` só funciona em páginas da raiz do site.

### Mídia de exemplo (`assets/midia/`)
Tudo foi desenhado ou sintetizado para o guia (sem fotos de terceiros). O gerador é `tools/midia/gerar.sh`. São 664 KB no total. Use `alt` de verdade, como "Bolo de cenoura com cobertura de chocolate".

| Arquivo | Pixels | Peso | O que é |
| --- | --- | --- | --- |
| `bolo-400.jpg` · `.webp` · `.avif` | 400×300 | 10 KB · 5 KB · 3,4 KB | bolo de cenoura com cobertura de chocolate (ilustração) |
| `bolo-800.jpg` · `.webp` · `.avif` · `.png` | 800×600 | 25 KB · 11 KB · 6,3 KB · 66 KB | o mesmo bolo (o PNG mostra que foto em PNG pesa mais) |
| `bolo-1200.jpg` · `.webp` · `.avif` | 1200×900 | 42 KB · 18 KB · 9,2 KB | o mesmo bolo, para `srcset` |
| `bolo-quadrado-400.jpg` · `.webp` | 400×400 | 16 KB · 8 KB | recorte quadrado do bolo (`<picture>` com direção de arte) |
| `bolo-quadrado-800.jpg` · `.webp` | 800×800 | 38 KB · 17 KB | o recorte quadrado maior |
| `bolo.svg` · `bolo-quadrado.svg` | 800×600 · 460×460 | 15 KB · 15 KB | as versões vetoriais |
| `logo-lojinha.svg` | 400×160 | 1,7 KB | logo da "Lojinha da Ana" (texto em Lato/sans-serif, fundo transparente) |
| `logo-lojinha-200.png` · `.webp` | 200×80 | 4,6 KB · 2,7 KB | logo, 1x (fundo transparente) |
| `logo-lojinha-400.png` · `.webp` | 400×160 | 9 KB · 5,6 KB | logo, 2x (`srcset="… 2x"`) |
| `avatar-ana.svg` | 256×256 | 1,6 KB | avatar redondo da Ana |
| `avatar-ana-96.png` · `.jpg` · `.webp` | 96×96 | 5,4 KB · 2,9 KB · 2,2 KB | avatar pequeno |
| `avatar-ana-192.png` · `.jpg` · `.webp` | 192×192 | 11,7 KB · 6,2 KB · 4,3 KB | avatar 2x |
| `mapa.svg` | 800×500 | 7,7 KB | mapa do bairro (fictício): Lojinha da Ana na Rua das Flores, Av. Central, Praça da Árvore, Rio Azul |
| `mapa-400.png` · `.webp` | 400×250 | 5,4 KB · 5,9 KB | mapa pequeno |
| `mapa-800.png` · `.webp` | 800×500 | 13 KB · 13 KB | mapa |
| `favicon.ico` | 16, 32 e 48 | 15 KB | ícone da aba (bolo com vela, fundo laranja) |
| `favicon.svg` · `favicon-32.png` | 64×64 · 32×32 | 0,5 KB · 0,5 KB | o mesmo ícone |
| `apple-touch-icon.png` | 180×180 | 4,3 KB | ícone para a tela inicial do celular |
| `campainha.ogg` · `.mp3` | 2,2 s, mono | 10 KB · 18 KB | "dim-dom" de campainha (sintetizado) |
| `video-bolo.webm` · `.mp4` | 640×360, 6 s, **sem som** | 26 KB · 35 KB | animação: misturar (0–2 s), assar (2–4 s), cobrir com chocolate (4–6 s) |
| `video-bolo-poster.jpg` | 640×360 | 16 KB | capa do vídeo (`poster`), o último quadro |
| `video-bolo.vtt` | 3 legendas | 0,3 KB | legendas em pt-BR (WebVTT), uma por cena |
| `receita-bolo.pdf` | 1 página A5 | 38 KB | receita do bolo (para `<a download>`) |

Exemplo de `srcset`: `srcset="assets/midia/bolo-400.jpg 400w, assets/midia/bolo-800.jpg 800w, assets/midia/bolo-1200.jpg 1200w"`. O vídeo não tem som, então `autoplay muted` é natural.

## 5. Fidelidade: o laboratório (`~/guia-html-lab/lab`, na VPS)
É a máquina da Ana do Guia Bash (usuária `ana`, computador `notebook`, `/home/ana`, pt_BR, Ubuntu 26.04) com:
- o **validador W3C** (`vnu`, versão 26.10.12, o mesmo do validator.w3.org);
- Java 25, `python3 -m http.server`, `curl`, `tidy` e `tree`.

```bash
printf '%s\n' 'mkdir -p site && cd site' "printf '<!DOCTYPE html>\n<html lang=\"pt-BR\">\n<head><meta charset=\"utf-8\"></head>\n<body><h1>Oi</h2></body>\n</html>\n' > index.html" 'vnu index.html' |
  ~/guia-c-lab/vps 'timeout 120 ~/guia-html-lab/lab -n SEUNOME -i'
```
Saída real:
```
"file:/home/ana/site/index.html":3.29-3.35: error: Element “head” is missing a required instance of child element “title”.
"file:/home/ana/site/index.html":4.13-4.17: error: End tag “h2” seen, but there were open elements.
```
- **As mensagens do validador são em inglês**, com aspas tipográficas “ ”: copie como saíram e explique em português.
  - Formato: `"arquivo":linha.coluna-linha.coluna: error: …`. Os avisos saem como `info warning:` (o vnu 26 escreve assim) e não mudam o código de saída; `error` dá código de saída 1. Pular nível de título (`h1` → `h3`) agora é **error**.
  - Use `vnu --verbose` (mostra o nome do arquivo quando está tudo certo) e `vnu --errors-only`.
- Ensine também o validador **on-line** (validator.w3.org/nu). As mensagens são as mesmas.
- **Servidor local:** `python3 -m http.server` dá "Serving HTTP on 0.0.0.0 port 8000…".
  - Rode-o com `-N` (rede própria) e `timeout`.
  - Para ver a resposta, use `curl` dentro da mesma sessão, com o servidor em segundo plano (`&`), e depois `kill %1`. Nunca use `pkill`.
- **O que você não consegue tirar do lab:** a tela do navegador e o F12. O resultado visual aparece sozinho nas páginas (`data-resultado`, `.tryhtml`). Para o F12, descreva com cuidado o que o leitor vai ver, sem inventar textos exatos de menus que você não conferiu.
- **Privacidade:** nada da máquina real nem da VPS; só `/home/ana/…`.

### Versão
O guia ensina o **HTML Living Standard** (WHATWG), o "HTML5" de hoje. Use `<!DOCTYPE html>`, `<html lang="pt-BR">` e `<meta charset="utf-8">` em toda página completa. Elementos obsoletos (`<font>`, `<center>`, `<marquee>`) aparecem só no "quando dá errado", com o erro real do validador.

## 6. Escrita
- Português do Brasil, frases curtas, "você". O leitor nunca fez um site.
- Nomes em inglês ganham tradução: `href` = "hypertext reference", o endereço do link.
- Exemplos com a vida da Ana: o site de receitas, a lojinha, o currículo, o blog.
- Acessibilidade e boas práticas desde o começo, sempre com o porquê:
  - `alt` em toda imagem;
  - `label` em todo campo;
  - títulos em ordem;
  - `lang="pt-BR"`.
- **Pouco CSS e pouco JS:** o guia é de HTML. O CSS aparece só o necessário para mostrar `class`, `id`, `link` e `style` (com links "quer aprender mais? (futuro Guia CSS)" em texto, sem link quebrado). O JS, só para `script`, eventos de formulário e `canvas`.
