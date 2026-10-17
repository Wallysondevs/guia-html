#!/usr/bin/env node
/* Testa as caixas "Experimente" (.tryhtml) e os quadros "Resultado"
   (pre.file[data-resultado]) do Guia HTML num Chromium DE VERDADE, sem janela,
   com o MESMO assets/htmlsim.js que o leitor usa (as metas são as mesmas).

   node tools/testar-missoes.js                 todas as páginas *.html
   node tools/testar-missoes.js links.html …    só estas
   opções:
     -v, --verboso   mostra o resultado de cada meta e o console de cada caixa
     --nativo        valida no validador W3C do laboratório (vnu 26.10.12) a solução
                     de cada missão e cada pre.file[data-resultado], e mostra os erros
     --sem-cache     ignora tools/.cache-missoes.json

   Para cada missão (com data-goal):
     1. o código inicial NÃO pode cumprir a meta;
     2. a solução (pre.solucao) TEM de cumprir a meta.
   Caixas livres: só desenha e avisa se o console mostrar erros.
   Confere também o contrato: "<" e "&" escapados em todo <pre>, metas
   conhecidas, regex e seletores válidos, solução presente.
   Sai com código 1 se alguma coisa falhar. */
"use strict";
const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const HS = require("../assets/htmlsim.js");

const RAIZ = path.resolve(__dirname, "..");
const CACHE = path.join(__dirname, ".cache-missoes.json");
const CHROMIUM = process.env.CHROMIUM || "/usr/bin/chromium";
const LAB = path.join(process.env.HOME, "guia-html-lab");

function puppeteer() {
  for (const p of [path.join(__dirname, "node_modules/puppeteer-core"), path.join(process.env.HOME, "rascunho/coord/cdp/node_modules/puppeteer-core")]) {
    try { return require(p); } catch (e) { /* próximo */ }
  }
  throw new Error("puppeteer-core não encontrado: rode  cd ~/guia-html/tools && npm install");
}

/* ---------- leitura das páginas (sem navegador) ---------- */
const ATTRS = "(?:[^>\"']|\"[^\"]*\"|'[^']*')*";
function attrs(tag) {
  const r = {}, re = /([\w:-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  tag = tag.replace(/^<\w+/, "").replace(/\/?>$/, "");
  while ((m = re.exec(tag))) r[m[1].toLowerCase()] = HS.decodificarEntidades(m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5] !== undefined ? m[5] : "");
  return r;
}
function temClasse(a, c) { return (" " + (a["class"] || "") + " ").indexOf(" " + c + " ") >= 0; }
function linhaDe(html, i) { return html.slice(0, i).split("\n").length; }
function caixas(html) {
  const r = [], re = new RegExp("<div\\b" + ATTRS + ">", "gi");
  let m;
  while ((m = re.exec(html))) {
    const a = attrs(m[0]);
    if (!temClasse(a, "tryhtml")) continue;
    let prof = 1, x;
    const t = new RegExp("</?div\\b" + ATTRS + ">", "gi"); t.lastIndex = re.lastIndex;
    while ((x = t.exec(html))) { if (x[0][1] === "/") { if (--prof === 0) break; } else prof++; }
    const fim = x ? x.index : html.length;
    r.push({ linha: linhaDe(html, m.index), a, interno: html.slice(re.lastIndex, fim) });
    re.lastIndex = fim;
  }
  return r;
}
function todosPres(html) {
  const r = [], re = new RegExp("<pre\\b" + ATTRS + ">([\\s\\S]*?)</pre>", "gi");
  let m;
  while ((m = re.exec(html))) {
    const a = attrs(new RegExp("^<pre\\b" + ATTRS + ">", "i").exec(m[0])[0]);
    r.push({ a, bruto: m[1], linha: linhaDe(html, m.index), codigo: HS.decodificarEntidades(m[1]).replace(/^\n/, "").replace(/\n$/, "") });
  }
  return r;
}
const ENT_SIMPLES = /^&(lt|gt|amp|quot|apos|#34|#39|#x27|#60|#62|#38);$/;
// "<" ou "&" sem escapar dentro do <pre>; entidades que o leitor veria já convertidas
function escape(bruto, deCodigo) {
  const erros = [], avisos = [];
  const sem = deCodigo ? bruto : bruto.replace(/<\/?(span|b|i|em|strong|u|mark|a|br|kbd|code|var|samp|sub|sup)\b[^>]*>/gi, "");
  const tag = /<[A-Za-z\/!?][^>\n]*>?/.exec(sem);
  if (tag) erros.push("\"" + tag[0].slice(0, 40) + "\" sem escapar dentro do <pre> (o navegador acha que é uma tag; escreva &lt;" + tag[0].slice(1, 30).replace(/>$/, "") + "&gt;)");
  const amp = /&(?![a-zA-Z][a-zA-Z0-9]*;|#\d+;|#x[0-9a-fA-F]+;)/.exec(sem);
  if (amp) erros.push("\"&\" sem escapar dentro do <pre> (escreva &amp;): …" + sem.slice(Math.max(0, amp.index - 15), amp.index + 12).replace(/\n/g, " ") + "…");
  if (deCodigo) {
    const vistas = new Set();
    let e; const re = /&([a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);/g;
    while ((e = re.exec(sem))) {
      if (ENT_SIMPLES.test(e[0]) || vistas.has(e[0])) continue;
      vistas.add(e[0]);
      avisos.push("a entidade " + e[0] + " aparece para o leitor já convertida (" + JSON.stringify(HS.decodificarEntidades(e[0])) + "); para mostrar o código " + e[0] + ", escreva &amp;" + e[0].slice(1));
    }
  }
  return { erros, avisos };
}

/* ---------- servidor de arquivos (só nesta execução, porta livre) ---------- */
const MIME = { html: "text/html; charset=utf-8", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", json: "application/json", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", avif: "image/avif", gif: "image/gif", ico: "image/x-icon", mp3: "audio/mpeg", ogg: "audio/ogg", oga: "audio/ogg", webm: "video/webm", mp4: "video/mp4", vtt: "text/vtt; charset=utf-8", pdf: "application/pdf", txt: "text/plain; charset=utf-8", woff2: "font/woff2", xml: "application/xml" };
function servidor() {
  return new Promise((ok) => {
    const s = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (p.endsWith("/")) p += "index.html";
      const f = path.join(RAIZ, path.normalize(p).replace(/^(\.\.[\/\\])+/, ""));
      if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }); res.end("<!DOCTYPE html><title>404</title><h1>404</h1>"); return; }
      const dados = fs.readFileSync(f), ext = path.extname(f).slice(1).toLowerCase();
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
      const h = { "Content-Type": MIME[ext] || "application/octet-stream", "Accept-Ranges": "bytes", "Cache-Control": "no-store" };
      if (range) {
        const ini = range[1] ? +range[1] : 0, fim = range[2] ? +range[2] : dados.length - 1;
        res.writeHead(206, Object.assign(h, { "Content-Range": "bytes " + ini + "-" + fim + "/" + dados.length, "Content-Length": fim - ini + 1 }));
        res.end(req.method === "HEAD" ? undefined : dados.subarray(ini, fim + 1));
        return;
      }
      res.writeHead(200, Object.assign(h, { "Content-Length": dados.length }));
      res.end(req.method === "HEAD" ? undefined : dados);
    });
    s.listen(0, "127.0.0.1", () => ok(s));
  });
}

/* ---------- validador do laboratório (--nativo) ---------- */
function validarNoLab(docs) {
  // docs: [{id, nome, texto, deslocamento}] → { id: [mensagens] }
  if (!docs.length) return {};
  const home = path.join(LAB, "homes", "htmlsim-nativo");
  if (!fs.existsSync(home)) {
    const r0 = spawnSync(path.join(LAB, "lab"), ["-n", "htmlsim-nativo", "--", "true"], { encoding: "utf8", timeout: 60000 });
    if (r0.status !== 0) throw new Error("o lab não abriu: " + (r0.stderr || r0.stdout));
  }
  const sub = "vnu-" + process.pid + "-" + Date.now().toString(36);
  const dir = path.join(home, sub);
  fs.mkdirSync(dir, { recursive: true });
  const porArq = {};
  docs.forEach((d, i) => {
    const ext = /\.css$/i.test(d.nome) ? ".css" : ".html";
    const f = "d" + i + ext;
    fs.writeFileSync(path.join(dir, f), d.texto);
    porArq[f] = d;
  });
  // HTML e CSS em duas rodadas: com --also-check-css, o vnu 26.10.12 conta as linhas do HTML uma a menos
  const htmls = Object.keys(porArq).filter((f) => f.endsWith(".html")), csss = Object.keys(porArq).filter((f) => f.endsWith(".css"));
  const cmd = "cd " + sub + (htmls.length ? " && vnu --format json --exit-zero-always " + htmls.join(" ") + " 2>&1; echo @@@" : "") + (csss.length ? "; vnu --format json --css --exit-zero-always " + csss.join(" ") + " 2>&1" : "");
  const r = spawnSync(path.join(LAB, "lab"), ["-n", "htmlsim-nativo", "--", "bash", "-c", cmd], { encoding: "utf8", timeout: 300000, maxBuffer: 64 << 20 });
  fs.rmSync(dir, { recursive: true, force: true });
  const mensagens = [];
  for (const parte of String(r.stdout || "").split("@@@")) {
    if (!parte.trim()) continue;
    try { mensagens.push(...(JSON.parse(parte.slice(parte.indexOf("{"))).messages || [])); } catch (e) { throw new Error("o vnu não respondeu JSON: " + (parte || r.stderr || r.error).toString().slice(0, 400)); }
  }
  const out = {};
  docs.forEach((d) => { out[d.id] = []; });
  mensagens.forEach((m) => {
    const f = (m.url || "").replace(/^.*\//, ""), d = porArq[f];
    if (!d) return;
    out[d.id].push(m);
  });
  return out;
}
// mensagem do vnu no formato da linha de comando (com as linhas do código do autor)
function linhaVnu(nome, m, v) {
  const ini = HS.posicaoNoCodigo(v, m.firstLine || m.lastLine, m.firstColumn), fim = HS.posicaoNoCodigo(v, m.lastLine, m.lastColumn);
  const pos = ini && fim ? ini.linha + "." + ini.coluna + "-" + fim.linha + "." + fim.coluna : "";
  const tipo = m.type === "info" ? (m.subType === "warning" ? "warning" : "info") : m.type;
  return "\"" + nome + "\":" + pos + ": " + tipo + ": " + m.message + (m.lastLine && !fim ? "  (no esqueleto que o testador pôs em volta do fragmento)" : "");
}

function trecho(s, n) { s = String(s || "").replace(/\n$/, ""); if (!s) return "        │ (vazio)"; const l = s.split("\n"); return (l.length > n ? l.slice(0, n).concat(["… (" + (l.length - n) + " linhas a mais)"]) : l).map((x) => "        │ " + x).join("\n"); }
function comTempo(p, ms, msg) { return Promise.race([p, new Promise((_, f) => setTimeout(() => f(new Error(msg)), ms))]); }

async function main() {
  const argv = process.argv.slice(2);
  const verboso = argv.includes("-v") || argv.includes("--verboso");
  const nativo = argv.includes("--nativo");
  const semCache = argv.includes("--sem-cache") || verboso;
  let paginas = argv.filter((x) => !x.startsWith("-"));
  if (!paginas.length) paginas = fs.readdirSync(RAIZ).filter((f) => f.endsWith(".html")).sort();

  const versaoMotor = crypto.createHash("sha1").update(["../assets/htmlsim.js", "../assets/htmlsim-sw.js", "testar-missoes.js"].map((f) => fs.readFileSync(path.join(__dirname, f), "utf8")).join("\0")).digest("hex");
  let cache = {};
  try { const c = JSON.parse(fs.readFileSync(CACHE, "utf8")); if (c.versao === versaoMotor) cache = c.itens || {}; } catch (e) { /* sem cache */ }
  const novoCache = Object.assign({}, cache);

  let nav = null, srv = null, base = "";
  async function navegador() {
    if (nav) return nav;
    srv = await servidor();
    base = "http://127.0.0.1:" + srv.address().port + "/";
    nav = await puppeteer().launch({ executablePath: CHROMIUM, headless: true, args: ["--no-sandbox", "--disable-gpu", "--mute-audio", "--autoplay-policy=no-user-gesture-required"] });
    return nav;
  }

  let nMissoes = 0, nLivres = 0, nRes = 0, nFalhas = 0, nAvisos = 0, nCache = 0, nVnu = 0;
  for (const pag of paginas) {
    const arq = path.isAbsolute(pag) ? pag : fs.existsSync(pag) ? path.resolve(pag) : path.join(RAIZ, pag);
    if (!fs.existsSync(arq)) { console.log("✗ " + pag + ": arquivo não encontrado"); nFalhas++; continue; }
    const rel = path.relative(RAIZ, arq);
    if (rel.startsWith("..")) { console.log("✗ " + pag + ": a página precisa estar em ~/guia-html (use ~/guia-html-lab/enviar)"); nFalhas++; continue; }
    const html = fs.readFileSync(arq, "utf8");
    const saida = [];
    let falhasPag = 0;
    const falha = (txt) => { nFalhas++; falhasPag++; saida.push("  ✗ " + txt); };
    const aviso = (txt) => { nAvisos++; saida.push("  ! " + txt); };

    // 1. escape em todo <pre>
    const pres = todosPres(html);
    for (const p of pres) {
      const deCodigo = temClasse(p.a, "file") || temClasse(p.a, "script") || temClasse(p.a, "solucao");
      const e = escape(p.bruto, deCodigo);
      const rot = "linha " + p.linha + " <pre" + (p.a["class"] ? " class=\"" + p.a["class"] + "\"" : "") + ">";
      if (e.erros.length) falha(rot + "\n" + e.erros.map((x) => "      " + x).join("\n"));
      if (e.avisos.length) aviso(rot + "\n" + e.avisos.map((x) => "      " + x).join("\n"));
    }
    if (/class\s*=\s*["'][^"']*\btryc\b/.test(html)) falha("a página usa class=\"tryc\" (do Guia C); no Guia HTML a caixa é class=\"tryhtml\"");

    // 2. caixas e quadros: contrato + chaves do cache
    const lista = caixas(html).map((c, i) => {
      const a = c.a, meta = a["data-goal"] || "";
      const ps = todosPres(c.interno);
      const scripts = ps.filter((p) => temClasse(p.a, "script")), sols = ps.filter((p) => temClasse(p.a, "solucao"));
      const abas = scripts.map((p, k) => ({ nome: p.a["data-file"] || (k === 0 ? "index.html" : "arquivo" + k + ".html"), codigo: p.codigo }));
      const solucao = abas.map((x) => ({ nome: x.nome, codigo: x.codigo }));
      sols.forEach((s, k) => {
        const nome = s.a["data-file"] || (abas[k] ? abas[k].nome : "index.html");
        const alvo = solucao.find((x) => x.nome === nome);
        if (alvo) alvo.codigo = s.codigo; else solucao.push({ nome, codigo: s.codigo });
      });
      const problemas = [];
      if (!scripts.length) problemas.push("caixa sem <pre class=\"script\">");
      if (meta && !sols.length) problemas.push("missão sem <pre class=\"solucao\">");
      if (abas.length && !abas.some((x) => HS.ehHtml(x.nome))) problemas.push("nenhuma aba .html: o quadro não tem o que desenhar");
      const nomes = abas.map((x) => x.nome);
      if (new Set(nomes).size !== nomes.length) problemas.push("duas abas com o mesmo data-file");
      HS.dividirMetas(meta).forEach((g) => { const r = HS.analisarMeta(g); if (r.erro) problemas.push(r.erro); });
      const chave = crypto.createHash("sha1").update(versaoMotor + JSON.stringify(["caixa", meta, abas, solucao])).digest("hex");
      return { i, linha: c.linha, meta, abas, solucao, problemas, chave, rot: "linha " + c.linha + (meta ? " missão [" + meta + "]" : " (livre)") };
    });
    const resultados = pres.filter((p) => temClasse(p.a, "file") && p.a["data-resultado"] !== undefined).map((p, i) => {
      const nome = p.a["data-file"] || "index.html";
      const problemas = HS.naoDesenha(nome) ? ["data-resultado desenha HTML; \"" + nome + "\" não é HTML (para CSS/JS junto, use um .tryhtml com abas)"] : [];
      return { i, linha: p.linha, nome, codigo: p.codigo, problemas, chave: crypto.createHash("sha1").update(versaoMotor + JSON.stringify(["res", nome, p.codigo])).digest("hex"), rot: "linha " + p.linha + " Resultado de " + nome };
    });
    lista.forEach((c) => { if (c.problemas.length) falha(c.rot + "\n" + c.problemas.map((p) => "      " + p).join("\n")); });
    resultados.forEach((r) => { if (r.problemas.length) falha(r.rot + "\n" + r.problemas.map((p) => "      " + p).join("\n")); });

    // 3. no navegador: só o que não está no cache
    const faltam = lista.filter((c) => !c.problemas.length && (semCache || !cache[c.chave]));
    const faltamR = resultados.filter((r) => !r.problemas.length && (semCache || !cache[r.chave]));
    lista.concat(resultados).forEach((c) => {
      if (c.problemas.length || faltam.includes(c) || faltamR.includes(c)) return;
      nCache++;
      if (c.meta !== undefined) { if (c.meta) nMissoes++; else nLivres++; } else nRes++;
      (cache[c.chave].avisos || []).forEach((x) => aviso(c.rot + "\n      " + x));
    });
    if (faltam.length || faltamR.length) {
      await navegador();
      const pg = await nav.newPage();
      const errosPag = [];
      pg.on("pageerror", (e) => errosPag.push(e.message));
      pg.on("dialog", (d) => d.dismiss().catch(() => {}));
      try {
        await pg.setViewport({ width: 1100, height: 900 });
        await pg.goto(base + rel.split(path.sep).map(encodeURIComponent).join("/") + "?htmlsim-teste", { waitUntil: "load", timeout: 30000 });
        await pg.waitForFunction(() => window.HtmlSim && window.HtmlSim.montado, { timeout: 15000 });
        const md = await pg.evaluate(() => window.HtmlSim.modo());
        if (md !== "sw") aviso("o editor caiu no modo simples (sem service worker) neste teste");
        const nDom = await pg.evaluate(() => [window.HtmlSim.caixas.length, window.HtmlSim.resultados.length]);
        if (nDom[0] !== lista.length || nDom[1] !== resultados.length) falha("o navegador montou " + nDom[0] + " caixas e " + nDom[1] + " quadros Resultado, mas o arquivo tem " + lista.length + " e " + resultados.length + " (HTML da página quebrado perto de uma caixa?)");
        else {
          for (const c of faltam) {
            const avisos = [];
            let ini = null, sol = null;
            try {
              if (c.meta) {
                nMissoes++;
                ini = await comTempo(pg.evaluate((i) => window.HtmlSim.caixas[i].testar("inicial"), c.i), 20000, "o quadro não terminou de carregar (código inicial)");
                sol = await comTempo(pg.evaluate((i) => window.HtmlSim.caixas[i].testar("solucao"), c.i), 20000, "o quadro não terminou de carregar (solução)");
                const erros = [];
                const fIni = ini.metas.filter((m) => !m.ok), fSol = sol.metas.filter((m) => !m.ok);
                const inval = sol.metas.filter((m) => m.invalida);
                if (inval.length) erros.push("meta inválida: " + inval.map((m) => m.meta + " → " + m.motivo).join(" | "));
                if (!fIni.length) erros.push("o código inicial JÁ cumpre a meta (a missão começa resolvida)");
                if (fSol.length && !inval.length) erros.push("a solução NÃO cumpre: " + fSol.map((m) => m.meta + (m.motivo ? " (" + m.motivo + ")" : "")).join(" | "));
                if (/✖|Uncaught|Error/.test(sol.console)) avisos.push("a solução mostra erro no console:\n" + trecho(sol.console, 6));
                if (sol.compat === "BackCompat") avisos.push("a solução é desenhada em modo quirks (o documento não começa com <!DOCTYPE html>)");
                if (erros.length) {
                  falha(c.rot + "\n" + erros.map((e) => "      " + e).join("\n") + (sol.console ? "\n      console da solução:\n" + trecho(sol.console, 8) : ""));
                } else {
                  novoCache[c.chave] = { ok: true, avisos };
                  if (verboso) saida.push("  ✓ " + c.rot + "\n" + sol.metas.map((m) => "      ✓ " + m.meta).join("\n") + "\n      inicial falha em: " + fIni.map((m) => m.meta + (m.motivo ? " (" + m.motivo + ")" : "")).join(" | ") + (sol.console ? "\n      console:\n" + trecho(sol.console, 10) : ""));
                }
              } else {
                nLivres++;
                ini = await comTempo(pg.evaluate((i) => window.HtmlSim.caixas[i].testar("inicial"), c.i), 20000, "o quadro não terminou de carregar");
                if (/Uncaught|Error|Não foi possível carregar/.test(ini.console)) avisos.push("o console mostra erro:\n" + trecho(ini.console, 6));
                novoCache[c.chave] = { ok: true, avisos };
                if (verboso) saida.push("  ✓ " + c.rot + (ini.console ? "\n      console:\n" + trecho(ini.console, 10) : ""));
              }
              avisos.forEach((x) => aviso(c.rot + "\n      " + x));
            } catch (e) { falha(c.rot + "\n      " + e.message); }
          }
          for (const r of faltamR) {
            nRes++;
            try {
              const x = await comTempo(pg.evaluate((i) => window.HtmlSim.resultados[i].desenhar(), r.i), 20000, "o quadro Resultado não terminou de carregar");
              const avisos = [];
              if (/Uncaught|Error|Não foi possível carregar/.test(x.console)) avisos.push("o console do Resultado mostra erro (normal se o exemplo é de erro):\n" + trecho(x.console, 6));
              avisos.forEach((a) => aviso(r.rot + "\n      " + a));
              novoCache[r.chave] = { ok: true, avisos };
            } catch (e) { falha(r.rot + "\n      " + e.message); }
          }
        }
        errosPag.forEach((e) => aviso("erro de JavaScript (na página ou num quadro): " + e));
      } catch (e) { falha("não consegui testar a página no navegador: " + e.message); }
      await pg.close();
    }

    // 4. --nativo: o validador W3C do laboratório
    if (nativo) {
      const docs = [];
      lista.filter((c) => c.meta && !c.problemas.length).forEach((c) => c.solucao.forEach((s, k) => {
        if (!HS.ehHtml(s.nome) && !/\.css$/i.test(s.nome)) return;
        const v = HS.ehHtml(s.nome) ? HS.paraValidar(s.codigo) : { texto: s.codigo, deslocamento: 0 };
        docs.push({ id: "c" + c.i + "-" + k, nome: s.nome, texto: v.texto, v, alvo: c, tipo: "solução", fragmento: v.deslocamento > 0 });
      }));
      resultados.filter((r) => !r.problemas.length).forEach((r) => {
        const v = HS.paraValidar(r.codigo);
        docs.push({ id: "r" + r.i, nome: r.nome, texto: v.texto, v, alvo: r, tipo: "resultado", fragmento: v.deslocamento > 0 });
      });
      try {
        const msgs = validarNoLab(docs);
        docs.forEach((d) => {
          const ms = msgs[d.id] || [];
          const erros = ms.filter((m) => m.type === "error" || m.type === "non-document-error");
          // num fragmento, "nenhum h1" é culpa do esqueleto, e não do exemplo
          const mostrar = ms.filter((m) => (m.type !== "info" || m.subType === "warning") && !(d.fragmento && /computed heading level of 1/.test(m.message)));
          const cab = d.alvo.rot + " — W3C (" + d.nome + (d.fragmento ? ", fragmento dentro do esqueleto mínimo" : "") + ")";
          const corpo = mostrar.map((m) => "      " + linhaVnu(d.nome, m, d.v)).join("\n");
          if (d.tipo === "solução" && erros.length) { nVnu++; falha(cab + ": a solução não é HTML válido\n" + corpo); }
          else if (mostrar.length) saida.push("  · " + cab + (erros.length ? " (exemplo com erro? normal no \"quando dá errado\")" : "") + "\n" + corpo);
          else if (verboso) saida.push("  ✓ " + cab + ": válido");
        });
        if (!docs.length && verboso) saida.push("  · nada para validar");
      } catch (e) { falha("--nativo: " + e.message); }
    }

    if (!lista.length && !resultados.length && !saida.length) continue;
    console.log((falhasPag ? "✗ " : "✓ ") + rel + "  (" + lista.length + " caixa" + (lista.length === 1 ? "" : "s") + ", " + resultados.length + " Resultado" + (resultados.length === 1 ? "" : "s") + ")");
    saida.forEach((l) => console.log(l));
  }
  if (nav) await nav.close();
  if (srv) srv.close();
  try { fs.writeFileSync(CACHE, JSON.stringify({ versao: versaoMotor, itens: novoCache })); } catch (e) { /* sem cache */ }
  console.log("\n" + nMissoes + " missões, " + nLivres + " caixas livres, " + nRes + " quadros Resultado" + (nCache ? " (" + nCache + " do cache)" : "") + " — " + (nFalhas ? nFalhas + " falha" + (nFalhas === 1 ? "" : "s") : "nenhuma falha") + (nAvisos ? ", " + nAvisos + " aviso" + (nAvisos === 1 ? "" : "s") : "") + (nativo ? " · W3C: " + (nVnu ? nVnu + " solução(ões) inválida(s)" : "soluções válidas") : ""));
  process.exit(nFalhas ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
