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
| `texto:SELETOR=TEXTO` | o texto do **primeiro** elemento que casa (espaços juntados, sem as pontas) **contém** TEXTO |
| `attr:SELETOR[ATRIBUTO]=VALOR` | o atributo do primeiro elemento é **igual** a VALOR; sem `=VALOR`, basta o atributo existir |
| `css:SELETOR{propriedade}=VALOR` | o estilo **calculado** (`getComputedStyle`) do primeiro elemento é igual a VALOR (`css:h1{color}=rgb(255, 0, 0)`) |
| `console:TEXTO` | a saída do console (log e erros) contém TEXTO |
| `src:REGEX` | o código de todas as abas casa com a regex (flags `m` e `i`) |
| `nsrc:REGEX` | o código **não** casa com a regex (para proibir algo, como `nsrc:<font`) |

**Regras exatas (decididas antes de escrever; não invente outras):**
- **Regex** (`src:`, `nsrc:`): é a regex do JavaScript. `|` é alternativa e `\|` é uma barra vertical literal.
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

*(Em construção.)*

### Ferramentas (na VPS)
- `node tools/testar-missoes.js páginas.html` (atalho no notebook: `~/guia-html-lab/testar`):
  - roda cada caixa num **Chromium de verdade** (sem janela);
  - confere que o código inicial **não** cumpre a meta e que a solução **cumpre**;
  - confere o escape (`&lt;`) de todo `<pre>`.
- `--nativo`: valida também a solução de cada missão e cada `pre.file` com `data-resultado` no **validador W3C** do laboratório.

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
  - Formato: `"arquivo":linha.coluna-linha.coluna: error: …`. `warning` não muda o código de saída; `error` dá código de saída 1.
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
