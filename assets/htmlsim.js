/* =====================================================================
   htmlsim.js — o editor "Experimente" do Guia HTML.
   O navegador do LEITOR desenha o código, num <iframe> só para ele.

   Monta:
     <div class="tryhtml" data-goal="…">  editor com abas (pre.script[data-file]),
                                          resultado ao vivo, console, metas
     <pre class="file" data-resultado>   o quadro "Resultado" logo abaixo do código
   (contrato: CONTRIBUINDO.md, seções 3 e 4).

   Como os arquivos das abas viram um site de verdade:
     um service worker (assets/htmlsim-sw.js) serve a pasta virtual
     assets/sim/<caixa>/ com o conteúdo das abas (guardado no Cache Storage).
     Assim "sobre.html", "estilo.css", "script.js" e "assets/midia/…" funcionam
     como num site publicado, e o DOM fica exatamente como o navegador o montou.
     Sem service worker (arquivo aberto do disco, janela anônima do Firefox),
     o quadro usa srcdoc, com o CSS e o JS das abas embutidos (modo simples).

   As metas (data-goal) são avaliadas pelo mesmo código aqui e no testador
   (tools/testar-missoes.js abre a página num Chromium e usa HtmlSim.caixas).
   ===================================================================== */
(function () {
  "use strict";
  var HS = { versao: "1" };

  /* =====================================================================
     1. Metas (funções puras; o DOM vem de fora)
     ===================================================================== */
  var NOMES = ["sel", "nsel", "texto", "attr", "css", "console", "src", "nsrc"];
  var RE_NOME = /^(sel|nsel|texto|attr|css|console|src|nsrc):/;
  HS.NOMES_METAS = NOMES;

  /* Divide data-goal em metas. "\," = vírgula literal; "\\" = uma barra
     invertida literal (qualquer outro "\x" fica como está, para as regex).
     Uma vírgula sem escape só separa metas quando vem seguida do nome de uma meta. */
  function dividirMetas(meta) {
    var r = [], cur = "";
    meta = String(meta || "");
    for (var i = 0; i < meta.length; i++) {
      var c = meta[i];
      if (c === "\\" && (meta[i + 1] === "," || meta[i + 1] === "\\")) { cur += meta[i + 1]; i++; continue; }
      if (c === "," && RE_NOME.test(meta.slice(i + 1).replace(/^\s+/, ""))) { r.push(cur); cur = ""; continue; }
      cur += c;
    }
    r.push(cur);
    return r.map(function (x) { return x.replace(/^\s+/, ""); }).filter(function (x) { return x.trim() !== ""; });
  }
  HS.dividirMetas = dividirMetas;

  // posição do primeiro (ou do último) caractere `alvo` fora de [], (), {} e aspas
  function achar(s, alvo, ultimo) {
    var prof = 0, q = "", pos = -1;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (q) { if (c === "\\") i++; else if (c === q) q = ""; continue; }
      if (c === "\\") { i++; continue; }
      if (c === '"' || c === "'") { q = c; continue; }
      if (c === alvo && prof === 0) { if (!ultimo) return i; pos = i; }
      if (c === "[" || c === "(" || (c === "{" && alvo !== "{")) prof++;
      else if (c === "]" || c === ")" || (c === "}" && alvo !== "{")) prof = Math.max(0, prof - 1);
    }
    return pos;
  }

  /* "texto:h1=Oi" → { tipo, sel, valor, … } ou { erro } */
  function analisarMeta(m) {
    var i = m.indexOf(":"), tipo = i < 0 ? m.trim() : m.slice(0, i), v = i < 0 ? "" : m.slice(i + 1);
    var r = { meta: m, tipo: tipo };
    if (NOMES.indexOf(tipo) < 0 || i < 0) { r.erro = "meta desconhecida: \"" + m + "\" (use " + NOMES.join(", ") + ")"; return r; }
    var k;
    switch (tipo) {
      case "sel": r.sel = v; if (!v.trim()) r.erro = "sel: sem seletor"; break;
      case "nsel":
        k = achar(v, "=", true);
        if (k < 0 || !/^\s*\d+\s*$/.test(v.slice(k + 1))) { r.erro = "nsel: use nsel:SELETOR=N (N é um número)"; break; }
        r.sel = v.slice(0, k); r.n = parseInt(v.slice(k + 1), 10); break;
      case "texto":
        k = achar(v, "=");
        if (k < 0) { r.erro = "texto: use texto:SELETOR=TEXTO"; break; }
        r.sel = v.slice(0, k); r.valor = v.slice(k + 1); break;
      case "attr":
        k = achar(v, "=");
        var esq = k < 0 ? v : v.slice(0, k);
        r.valor = k < 0 ? null : v.slice(k + 1);
        esq = esq.replace(/\s+$/, "");
        if (!/\]$/.test(esq)) { r.erro = "attr: use attr:SELETOR[ATRIBUTO]=VALOR"; break; }
        var a = esq.lastIndexOf("[");
        r.attr = esq.slice(a + 1, -1).trim(); r.sel = esq.slice(0, a) || "*";
        if (!/^[^\s"'>\/=]+$/.test(r.attr)) r.erro = "attr: nome de atributo inválido: \"" + r.attr + "\"";
        break;
      case "css":
        var ab = v.indexOf("{"), fe = v.indexOf("}", ab + 1);
        if (ab < 0 || fe < 0 || v.charAt(fe + 1) !== "=") { r.erro = "css: use css:SELETOR{propriedade}=VALOR"; break; }
        r.sel = v.slice(0, ab); r.prop = v.slice(ab + 1, fe).trim(); r.valor = v.slice(fe + 2); break;
      case "console": r.valor = v; break;
      case "src": case "nsrc":
        try { r.re = new RegExp(v, "mi"); } catch (e) { r.erro = tipo + ": regex inválida: " + e.message; }
        break;
    }
    return r;
  }
  HS.analisarMeta = analisarMeta;

  // texto do elemento: espaços juntados, sem as pontas; <br> e fim de bloco contam como espaço
  var BLOCOS = /^(BR|P|DIV|LI|DT|DD|TD|TH|TR|H[1-6]|OPTION|BLOCKQUOTE|SECTION|ARTICLE|HEADER|FOOTER|NAV|ASIDE|MAIN|FIGCAPTION|CAPTION|LEGEND|SUMMARY|ADDRESS|PRE|HR)$/;
  function textoDe(el) {
    var t = "";
    (function andar(n) {
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) t += c.data;
        else if (c.nodeType === 1) {
          var tag = c.tagName.toUpperCase();
          if (tag === "BR") { t += " "; continue; }
          if (tag === "TEMPLATE") continue;
          andar(c);
          if (BLOCOS.test(tag)) t += " ";
        }
      }
    })(el);
    return t.replace(/\s+/g, " ").trim();
  }
  HS.textoDe = textoDe;

  function curto(s, n) { s = String(s); n = n || 60; return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  /* ctx: { doc: Document desenhado, console: texto do console, src: código de todas as abas }
     → [{ meta, tipo, ok, motivo, desc }] */
  function avaliarMetas(meta, ctx) {
    return dividirMetas(meta).map(function (m) {
      var a = analisarMeta(m), r = { meta: m, tipo: a.tipo, ok: false, motivo: "", desc: descrever(a) };
      if (a.erro) { r.motivo = a.erro; r.invalida = true; return r; }
      try {
        var doc = ctx.doc, el, lista;
        if (a.sel !== undefined && /^(sel|nsel|texto|attr|css)$/.test(a.tipo)) {
          if (!doc) { r.motivo = "a página ainda não foi desenhada"; return r; }
          try { lista = doc.querySelectorAll(a.sel); } catch (e) { r.motivo = "seletor inválido: \"" + a.sel + "\""; r.invalida = true; return r; }
          el = lista[0] || null;
        }
        switch (a.tipo) {
          case "sel": r.ok = !!el; if (!el) r.motivo = "nenhum elemento casa com " + a.sel; break;
          case "nsel": r.ok = lista.length === a.n; if (!r.ok) r.motivo = "hoje há " + lista.length; break;
          case "texto":
            if (!el) { r.motivo = "não há nenhum " + a.sel; break; }
            var t = textoDe(el); r.ok = t.indexOf(a.valor) >= 0;
            if (!r.ok) r.motivo = "hoje o texto é “" + curto(t) + "”"; break;
          case "attr":
            if (!el) { r.motivo = "não há nenhum " + a.sel; break; }
            if (!el.hasAttribute(a.attr)) { r.motivo = "o " + el.tagName.toLowerCase() + " ainda não tem o atributo " + a.attr; break; }
            r.ok = a.valor === null || el.getAttribute(a.attr) === a.valor;
            if (!r.ok) r.motivo = "hoje " + a.attr + "=\"" + curto(el.getAttribute(a.attr)) + "\""; break;
          case "css":
            if (!el) { r.motivo = "não há nenhum " + a.sel; break; }
            var cs = (el.ownerDocument.defaultView || window).getComputedStyle(el).getPropertyValue(a.prop).trim();
            r.ok = cs === a.valor.trim();
            if (!r.ok) r.motivo = "hoje " + a.prop + " é " + (cs || "(vazio)"); break;
          case "console":
            r.ok = String(ctx.console || "").indexOf(a.valor) >= 0;
            if (!r.ok) r.motivo = ctx.console ? "o console ainda não mostrou isso" : "o console está vazio"; break;
          case "src": r.ok = a.re.test(ctx.src || ""); break;
          case "nsrc": r.ok = !a.re.test(ctx.src || ""); break;
        }
      } catch (e) { r.ok = false; r.motivo = "erro ao conferir: " + e.message; }
      return r;
    });
  }
  HS.avaliarMetas = avaliarMetas;
  HS.falhas = function (meta, ctx) { return avaliarMetas(meta, ctx).filter(function (x) { return !x.ok; }); };

  // descrição para o leitor ("Ainda falta: …")
  function descrever(a) {
    if (a.erro) return a.meta;
    switch (a.tipo) {
      case "sel": return "um elemento " + a.sel.trim();
      case "nsel": return a.n + (a.n === 1 ? " elemento " : " elementos ") + a.sel.trim();
      case "texto": return a.sel.trim() + " com o texto “" + a.valor + "”";
      case "attr": return a.sel.trim() + " com o atributo " + a.attr + (a.valor === null ? "" : "=\"" + a.valor + "\"");
      case "css": return a.sel.trim() + " com " + a.prop + ": " + a.valor.trim();
      case "console": return "o console mostrar “" + a.valor + "”";
      case "src": return "o código com " + a.re.source;
      case "nsrc": return "o código sem " + a.re.source;
    }
    return a.meta;
  }

  /* =====================================================================
     2. Montar o documento (funções puras)
     ===================================================================== */
  var ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", copy: "©", reg: "®", trade: "™", hellip: "…", mdash: "—", ndash: "–", laquo: "«", raquo: "»", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", bull: "•", middot: "·", deg: "°", times: "×", divide: "÷", euro: "€", larr: "←", rarr: "→", uarr: "↑", darr: "↓", hearts: "♥", star: "☆", check: "✓", aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", atilde: "ã", otilde: "õ", ccedil: "ç", acirc: "â", ecirc: "ê", ocirc: "ô", agrave: "à", shy: "­" };
  function decodificarEntidades(s) {
    return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, function (t, n) {
      if (n.charAt(0) === "#") {
        var c = n.charAt(1).toLowerCase() === "x" ? parseInt(n.slice(2), 16) : parseInt(n.slice(1), 10);
        try { return String.fromCodePoint(c); } catch (e) { return t; }
      }
      return Object.prototype.hasOwnProperty.call(ENTIDADES, n) ? ENTIDADES[n] : t;
    });
  }
  HS.decodificarEntidades = decodificarEntidades;
  function escHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  HS.escHtml = escHtml;

  function semComentarios(s) { return String(s).replace(/<!--[\s\S]*?(-->|$)/g, ""); }
  /* Fragmento = código sem <!DOCTYPE>, <html>, <head> e <body>.
     O editor desenha o fragmento como parte de uma página completa: põe
     <!DOCTYPE html> na frente (modo padrão). Um documento sem DOCTYPE fica
     como está e é desenhado em modo quirks, como no navegador de verdade. */
  function ehFragmento(codigo) { return !/<!doctype|<html[\s>\/]|<head[\s>\/]|<body[\s>\/]/i.test(semComentarios(codigo)); }
  HS.ehFragmento = ehFragmento;

  // A ponte: um <script> de uma linha logo depois do DOCTYPE, que se remove
  // sozinho (o DOM fica igual ao do código do leitor e os números de linha não mudam).
  var PONTE = "<script>(function(){var s=document.currentScript;if(s)s.remove();try{var p=window.frameElement&&window.frameElement.__htmlsim;if(p)p.iniciar(window)}catch(e){}})()</" + "script>";
  HS.PONTE = PONTE;
  function comPonte(codigo) {
    var c = String(codigo);
    if (ehFragmento(c)) return "<!DOCTYPE html>" + PONTE + c;
    var m = /^(﻿?(?:\s|<!--[\s\S]*?-->)*<!doctype[^>]*>)/i.exec(c);
    return m ? m[1] + PONTE + c.slice(m[1].length) : PONTE + c;
  }
  HS.comPonte = comPonte;

  /* Esqueleto mínimo válido para o validador (o mesmo do --nativo):
     linha 1: <!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Exemplo</title>
     depois o fragmento, a partir da linha 2 (a linha N do fragmento é a N+1);
     o que vem no começo e só cabe no <head> (title, meta, link, style, base,
     script, noscript, template) fica no head; o resto vai para o <body>. */
  var RE_CABECA = /^(?:\s+|<!--[\s\S]*?-->|<(title|style|script|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>|<(meta|link|base)\b[^>]*>)/i;
  function esqueleto(fragmento) {
    var f = String(fragmento), pos = 0, m;
    while ((m = RE_CABECA.exec(f.slice(pos))) && m[0].length) pos += m[0].length;
    // espaços e comentários do fim da cabeça ficam no body
    var cabeca = f.slice(0, pos), resto = f.slice(pos);
    var sobra = /(?:\s|<!--[\s\S]*?-->)*$/.exec(cabeca)[0];
    if (sobra) { cabeca = cabeca.slice(0, cabeca.length - sobra.length); resto = sobra + resto; }
    var temTitulo = /<title\b/i.test(cabeca), temCharset = /<meta\b[^>]*charset/i.test(cabeca);
    return {
      texto: "<!DOCTYPE html><html lang=\"pt-BR\"><head>" + (temCharset ? "" : "<meta charset=\"utf-8\">") + (temTitulo ? "" : "<title>Exemplo</title>") + "\n" +
        cabeca + "</head><body>" + resto + (/\n$/.test(resto) ? "" : "\n") + "</body></html>\n",
      deslocamento: 1
    };
  }
  HS.esqueleto = esqueleto;
  // o documento que vai para o validador
  HS.paraValidar = function (codigo) { return ehFragmento(codigo) ? esqueleto(codigo) : { texto: String(codigo), deslocamento: 0 }; };

  var TIPOS = { html: "text/html", htm: "text/html", css: "text/css", js: "text/javascript", mjs: "text/javascript", json: "application/json", svg: "image/svg+xml", txt: "text/plain", vtt: "text/vtt", xml: "application/xml", md: "text/markdown", csv: "text/csv" };
  function tipoDe(nome) { var m = /\.([a-z0-9]+)$/i.exec(nome); return (m && TIPOS[m[1].toLowerCase()]) || "text/plain"; }
  HS.tipoDe = tipoDe;
  function ehHtml(nome) { return /\.html?$/i.test(nome); }
  HS.ehHtml = ehHtml;
  // rótulo de pre.file[data-resultado] que não é HTML (estilo.css, script.js…)
  function naoDesenha(rotulo) { return /\.(css|m?js|json|txt|vtt|csv|md)\s*$/i.test(String(rotulo || "").trim()); }
  HS.naoDesenha = naoDesenha;

  if (typeof module === "object" && module.exports) { module.exports = HS; }
  if (typeof document === "undefined") return;
  window.HtmlSim = HS;

  /* =====================================================================
     3. O motor: service worker + quadros
     ===================================================================== */
  var base = (function () {
    var s = document.querySelectorAll("script[src]");
    for (var i = 0; i < s.length; i++) { var src = s[i].getAttribute("src"); if (/htmlsim\.js(\?|$)/.test(src)) return src.replace(/htmlsim\.js.*$/, ""); }
    return "assets/";
  })();
  var BASE_ABS = new URL(base, location.href).href;           // …/assets/
  var ESCOPO = BASE_ABS + "sim/";                              // pasta virtual das caixas
  var TOKEN = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  var CACHE_NOME = "htmlsim-" + Date.now() + "-" + TOKEN;
  var modo = null; // Promise<"sw"|"srcdoc">
  var forcarSimples = /[?&]htmlsim=simples\b/.test(location.search);

  function esperarAtivo(reg) {
    return new Promise(function (ok, falha) {
      var w = reg.active || reg.waiting || reg.installing;
      if (reg.active && reg.active.state === "activated") return ok();
      if (!w) return falha(new Error("sem worker"));
      var t = setTimeout(function () { falha(new Error("tempo esgotado")); }, 6000);
      [reg.installing, reg.waiting, reg.active].forEach(function (x) {
        if (x) x.addEventListener("statechange", function () { if (x.state === "activated") { clearTimeout(t); ok(); } else if (x.state === "redundant" && !reg.active) { clearTimeout(t); falha(new Error("worker descartado")); } });
      });
      if (reg.active && reg.active.state === "activated") { clearTimeout(t); ok(); }
    });
  }
  function limparCachesVelhos() {
    if (!window.caches) return;
    caches.keys().then(function (ks) {
      var agora = Date.now();
      ks.forEach(function (k) {
        var m = /^htmlsim-(\d+)-/.exec(k);
        if (m && k !== CACHE_NOME && agora - +m[1] > 6 * 3600 * 1000) caches.delete(k);
      });
    }).catch(function () {});
  }
  function prepararModo() {
    if (modo) return modo;
    modo = new Promise(function (ok) {
      if (forcarSimples || !("serviceWorker" in navigator) || !window.caches || !window.isSecureContext) return ok("srcdoc");
      navigator.serviceWorker.register(base + "htmlsim-sw.js", { scope: base + "sim/" })
        .then(esperarAtivo)
        .then(function () { limparCachesVelhos(); ok("sw"); })
        .catch(function (e) { console.warn("htmlsim: sem service worker (" + (e && e.message) + "); usando o modo simples"); ok("srcdoc"); });
    });
    return modo;
  }
  HS.modo = function () { return prepararModo(); };
  addEventListener("pagehide", function (e) { if (!e.persisted && window.caches) try { caches.delete(CACHE_NOME); } catch (x) {} });

  /* ---------- formatar valores do console (como o F12, simplificado) ---------- */
  function fmt(v, prof, topo) {
    prof = prof || 0;
    var t = typeof v;
    if (v === null) return "null";
    if (t === "undefined") return "undefined";
    if (t === "string") return topo ? v : "'" + v + "'";
    if (t === "number" || t === "boolean" || t === "bigint") return String(v) + (t === "bigint" ? "n" : "");
    if (t === "symbol") return v.toString();
    if (t === "function") return "ƒ " + (v.name || "") + "()";
    try {
      if (v.nodeType === 1) {
        var s = "<" + v.tagName.toLowerCase();
        for (var i = 0; i < v.attributes.length && i < 4; i++) s += " " + v.attributes[i].name + (v.attributes[i].value !== "" ? "=\"" + curto(v.attributes[i].value, 30) + "\"" : "");
        return s + ">";
      }
      if (v.nodeType === 9) return "#document";
      if (v.nodeType === 3) return "#text \"" + curto(v.data, 40) + "\"";
      if (typeof v.message === "string" && typeof v.name === "string" && "stack" in v) return v.name + ": " + v.message;
      if (prof > 2) return Array.isArray(v) ? "[…]" : "{…}";
      if (Array.isArray(v)) return "[" + v.slice(0, 30).map(function (x) { return fmt(x, prof + 1); }).join(", ") + (v.length > 30 ? ", …" : "") + "]";
      var nome = v.constructor && v.constructor.name;
      if (typeof v.length === "number" && typeof v.item === "function") {
        var itens = []; for (var j = 0; j < v.length && j < 20; j++) itens.push(fmt(v[j], prof + 1));
        return (nome || "Lista") + "(" + v.length + ") [" + itens.join(", ") + "]";
      }
      if (nome === "FormData") { var p = []; v.forEach(function (val, k) { p.push(k + ": " + fmt(typeof val === "string" ? val : (val.name || "arquivo"), prof + 1)); }); return "FormData {" + p.join(", ") + "}"; }
      var ks = Object.keys(v).slice(0, 20);
      return (nome && nome !== "Object" ? nome + " " : "") + "{" + ks.map(function (k) { return k + ": " + fmt(v[k], prof + 1); }).join(", ") + (Object.keys(v).length > 20 ? ", …" : "") + "}";
    } catch (e) { return String(v); }
  }
  function formatarArgs(args) {
    args = Array.prototype.slice.call(args);
    if (typeof args[0] === "string" && /%[sdifoOc]/.test(args[0])) {
      var resto = args.slice(1);
      var s = args[0].replace(/%([sdifoOc%])/g, function (t, c) {
        if (c === "%") return "%";
        if (!resto.length) return t;
        var v = resto.shift();
        if (c === "c") return "";
        if (c === "d" || c === "i") return String(parseInt(v, 10));
        if (c === "f") return String(parseFloat(v));
        if (c === "s") return typeof v === "string" ? v : fmt(v, 0, true);
        return fmt(v, 0);
      });
      args = [s].concat(resto);
    }
    return args.map(function (a) { return fmt(a, 0, true); }).join(" ");
  }
  HS.formatarArgs = formatarArgs;

  /* ---------- página "Formulário enviado" ---------- */
  function paginaEnvio(info) {
    var linhas = info.campos.map(function (c) { return "<tr><td>" + escHtml(c[0]) + "</td><td>" + (c[2] ? "<em>" + escHtml(c[1]) + "</em>" : escHtml(c[1]) || "<em>(vazio)</em>") + "</td></tr>"; }).join("");
    return "<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\"><title>Formulário enviado</title><style>" +
      "body{font:15px/1.5 system-ui,sans-serif;margin:16px;color:#1d1d1b;background:#fff}h1{font-size:1.25rem;margin:0 0 8px}p{margin:6px 0}" +
      "code{background:#f1efeb;padding:1px 5px;border-radius:4px;word-break:break-all}table{border-collapse:collapse;margin:10px 0;min-width:60%}" +
      "td,th{border:1px solid #dddcd8;padding:4px 10px;text-align:left;vertical-align:top}th{background:#f3f2f0}.nota{color:#5f5f5a;font-size:13.5px}" +
      "button{font:inherit;padding:4px 12px;cursor:pointer}</style></head><body>" +
      "<h1>📨 Formulário enviado</h1>" +
      "<p class=\"nota\">Num site publicado, o navegador mandaria estes dados para o servidor. O editor do guia não tem servidor, então mostra aqui o que seria enviado.</p>" +
      "<p><strong>Método:</strong> <code>" + escHtml(info.metodo) + "</code> · <strong>Para (action):</strong> <code>" + escHtml(info.acao) + "</code></p>" +
      (info.metodo === "GET" ? "<p><strong>Endereço que abriria:</strong> <code>" + escHtml(info.endereco) + "</code></p><p class=\"nota\">No GET, os dados vão no próprio endereço, depois do <code>?</code>.</p>"
        : "<p><strong>Corpo da mensagem</strong> (<code>" + escHtml(info.enctype) + "</code>):</p><p><code>" + escHtml(info.corpo) + "</code></p><p class=\"nota\">No POST, os dados vão no corpo da mensagem, e não no endereço.</p>") +
      (info.campos.length ? "<table><tr><th>name</th><th>value</th></tr>" + linhas + "</table>" : "<p><em>Nenhum campo com <code>name</code> foi enviado.</em> Um campo sem o atributo <code>name</code> não é enviado.</p>") +
      "<p><button type=\"button\" id=\"htmlsim-voltar\">← Voltar ao formulário</button></p></body></html>";
  }

  /* ---------- Quadro: um iframe que mostra as abas ----------
     opts: { arquivos(): [{nome, codigo}], aoConsole(tipo, texto), aoCarregar(info), altura: {min, max} } */
  var nQuadros = 0;
  function Quadro(host, opts) {
    this.host = host; this.opts = opts; this.id = TOKEN + "-" + (++nQuadros);
    this.pasta = ESCOPO + this.id + "/";
    this.frame = null; this.atual = null; this.endereco = ""; this.geracao = 0;
  }
  HS.Quadro = Quadro;
  Quadro.prototype.nomeDe = function (url) {
    // URL dentro da pasta virtual → "sobre.html?x=1#y"; senão null
    try { var u = new URL(url, this.pasta); } catch (e) { return null; }
    var p = this.pasta;
    if (u.href.indexOf(p) !== 0) return null;
    var r = decodeURIComponent(u.pathname.slice(new URL(p).pathname.length));
    return { nome: r || this.entrada(), busca: u.search, hash: u.hash };
  };
  Quadro.prototype.entrada = function () {
    var a = this.opts.arquivos(); for (var i = 0; i < a.length; i++) if (ehHtml(a[i].nome)) return a[i].nome;
    return a.length ? a[0].nome : "index.html";
  };
  Quadro.prototype.arquivo = function (nome) {
    var a = this.opts.arquivos(); for (var i = 0; i < a.length; i++) if (a[i].nome === nome) return a[i];
    return null;
  };
  /* mostra a aba `nome` (padrão: a página atual ou a de entrada). extra: {busca, hash, html (página pronta), endereco} */
  Quadro.prototype.mostrar = function (nome, extra) {
    var self = this;
    extra = extra || {};
    nome = nome || this.entrada();
    var ger = ++this.geracao;
    return prepararModo().then(function (md) {
      if (ger !== self.geracao) return;
      self.modoAtual = md;
      return (md === "sw" ? self.gravar(extra) : Promise.resolve()).then(function () {
        if (ger !== self.geracao) return;
        self.criarFrame(nome, extra, md, ger);
      });
    });
  };
  Quadro.prototype.gravar = function (extra) {
    var self = this;
    return caches.open(CACHE_NOME).then(function (c) {
      var ps = self.opts.arquivos().map(function (a) {
        var corpo = ehHtml(a.nome) ? comPonte(a.codigo) : a.codigo;
        return c.put(self.pasta + a.nome.split("/").map(encodeURIComponent).join("/"), new Response(corpo, { headers: { "Content-Type": tipoDe(a.nome) + "; charset=utf-8", "Cache-Control": "no-store" } }));
      });
      if (extra.html) ps.push(c.put(self.pasta + "__htmlsim__.html", new Response(comPonte(extra.html), { headers: { "Content-Type": "text/html; charset=utf-8" } })));
      return Promise.all(ps);
    });
  };
  Quadro.prototype.criarFrame = function (nome, extra, md, ger) {
    var self = this, f = document.createElement("iframe");
    f.className = "hs-frame";
    f.setAttribute("title", "Resultado do código");
    // sem o atributo sandbox: com "allow-scripts allow-same-origin" (necessários para o service
    // worker e as metas) o Chrome encheria o console do F12 com um aviso por quadro. A navegação
    // da página do guia é barrada em clique() e envio() (target=_top, formulários).
    f.setAttribute("allow", "fullscreen; autoplay; clipboard-write");
    f.setAttribute("loading", "eager");
    var antigo = this.frame;
    f.__htmlsim = this.ponte(f, ger);
    this.consoleTexto = "";
    this.atual = extra.html ? null : nome;
    this.endereco = extra.endereco || (nome + (extra.busca || "") + (extra.hash || ""));
    if (antigo) { f.style.height = antigo.style.height; f.classList.add("hs-novo"); }
    else if (this.opts.altura) f.style.height = this.opts.altura.min + "px";
    f.addEventListener("load", function () { if (ger === self.geracao) self.carregou(f, ger); });
    if (md === "sw") {
      f.src = extra.html ? this.pasta + "__htmlsim__.html" : this.pasta + nome.split("/").map(encodeURIComponent).join("/") + (extra.busca || "") + (extra.hash || "");
    } else {
      var arq = this.arquivo(nome);
      var codigo = extra.html || (arq ? arq.codigo : "<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\"><title>404</title></head><body><h1>404: arquivo não encontrado</h1><p>Não há uma aba chamada <code>" + escHtml(nome) + "</code> nesta caixa.</p></body></html>");
      f.srcdoc = comPonte(this.embutir(codigo));
    }
    this.host.appendChild(f);
    this.frame = f;
    if (antigo) {
      var tirar = function () { if (antigo.parentNode) antigo.parentNode.removeChild(antigo); f.classList.remove("hs-novo"); };
      f.addEventListener("load", tirar);
      setTimeout(tirar, 1500);
    }
  };
  // modo simples (srcdoc): embute as abas .css e .js no lugar dos <link>/<script src>
  Quadro.prototype.embutir = function (codigo) {
    var self = this;
    return String(codigo).replace(/<(link|script)\b([^>]*?)\b(href|src)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))([^>]*)>/gi, function (t, tag, a1, at, v, v1, v2, v3, a2) {
      var nome = v1 !== undefined ? v1 : v2 !== undefined ? v2 : v3, arq = self.arquivo(nome.replace(/^\.\//, ""));
      if (!arq || ehHtml(arq.nome)) return t;
      var url = "data:" + tipoDe(arq.nome) + ";charset=utf-8," + encodeURIComponent(arq.codigo);
      return "<" + tag + a1 + at + "=\"" + url + "\"" + a2 + ">";
    });
  };
  // o objeto que a ponte (dentro do quadro) chama
  Quadro.prototype.ponte = function (frame, ger) {
    var self = this;
    return {
      iniciar: function (win) {
        if (win.__htmlsimOk) return; win.__htmlsimOk = true;
        var vivo = function () { return ger === self.geracao; };
        var log = function (tipo, txt) { if (vivo()) self.registrar(tipo, txt); };
        var c = win.console;
        ["log", "info", "warn", "error", "debug", "dir", "table"].forEach(function (t) {
          var orig = c[t];
          if (typeof orig !== "function") return;
          c[t] = function () {
            try { log(t === "dir" || t === "table" || t === "debug" ? "log" : t, formatarArgs(arguments)); } catch (e) {}
            return orig.apply(c, arguments);
          };
        });
        win.addEventListener("error", function (e) {
          var alvo = e.target;
          if (alvo && alvo !== win && alvo.nodeType === 1) {
            var tag = alvo.tagName.toLowerCase(), u = alvo.getAttribute("src") || alvo.getAttribute("href") || alvo.getAttribute("data") || "";
            if (tag === "video" || tag === "audio" ? !u : false) return;
            log("error", "Não foi possível carregar \"" + u + "\" (<" + tag + ">). Confira o nome e o caminho do arquivo.");
            return;
          }
          var onde = self.localDe(e.filename, e.lineno);
          log("error", (e.message || "Erro") + (onde ? "   (" + onde + ")" : ""));
        }, true);
        win.addEventListener("unhandledrejection", function (e) {
          var r = e.reason; log("error", "Uncaught (in promise) " + (r && r.message ? (r.name || "Error") + ": " + r.message : fmt(r, 0, true)));
        });
        win.addEventListener("click", function (e) { self.clique(e, win); }, false);
        win.addEventListener("submit", function (e) { self.envio(e, win); }, false);
        win.addEventListener("hashchange", function () { if (vivo()) self.atualizarEndereco(win); });
      },
      voltar: function () { self.mostrar(self.antes || self.entrada()); }
    };
  };
  Quadro.prototype.localDe = function (url, linha) {
    if (!url) return "";
    var n = null;
    if (/^data:/.test(url)) {
      var cod = decodeURIComponent(url.replace(/^data:[^,]*,/, ""));
      this.opts.arquivos().forEach(function (a) { if (a.codigo === cod) n = a.nome; });
      n = n || "script";
    } else if (/^about:srcdoc/.test(url)) n = this.atual || "index.html";
    else { var r = this.nomeDe(url); n = r ? r.nome : url.replace(/^.*\//, ""); }
    return n + (linha ? ", linha " + linha : "");
  };
  Quadro.prototype.registrar = function (tipo, txt) {
    this.consoleTexto += (this.consoleTexto ? "\n" : "") + txt;
    if (this.opts.aoConsole) this.opts.aoConsole(tipo, txt);
  };
  Quadro.prototype.atualizarEndereco = function (win) {
    if (this.modoAtual === "sw") {
      try {
        var r = this.nomeDe(win.location.href);
        if (r && r.nome !== "__htmlsim__.html") { this.endereco = r.nome + r.busca + r.hash; this.atual = r.nome; }
      } catch (e) {}
    }
    if (this.opts.aoEndereco) this.opts.aoEndereco(this.endereco);
  };
  Quadro.prototype.clique = function (e, win) {
    if (e.defaultPrevented || e.button !== 0) return;
    var a = e.target && e.target.closest ? e.target.closest("a[href], area[href]") : null;
    if (!a) return;
    var href = a.getAttribute("href"), url;
    try { url = new URL(a.href); } catch (x) { return; }
    var self = this, alvo = (a.getAttribute("target") || "").toLowerCase();
    if (/^(mailto|tel|sms):$/.test(url.protocol)) {
      e.preventDefault();
      var o = { "mailto:": "o programa de e-mail, para escrever para ", "tel:": "o discador do celular, para ligar para ", "sms:": "o aplicativo de mensagens, para " }[url.protocol];
      this.registrar("info", "[editor] Este link abriria " + o + decodeURIComponent(url.href.slice(url.protocol.length).split("?")[0]) + "  (" + href + ")");
      return;
    }
    if (url.protocol === "javascript:") return;
    if (a.hasAttribute("download")) {
      if (this.modoAtual === "sw" || url.origin === location.origin) return; // o navegador baixa
    }
    var r = this.nomeDe(url.href);
    if (this.modoAtual !== "sw") {
      // srcdoc: os endereços relativos apontam para a página do guia; refaz com as abas
      var rel = new URL(location.href);
      if (url.href.split("#")[0] === rel.href.split("#")[0] && url.hash) { e.preventDefault(); var d = win.document, t = d.getElementById(decodeURIComponent(url.hash.slice(1))) || d.getElementsByName(decodeURIComponent(url.hash.slice(1)))[0]; if (t) t.scrollIntoView(); this.endereco = (this.atual || "") + url.hash; if (this.opts.aoEndereco) this.opts.aoEndereco(this.endereco); return; }
      var nomeRel = url.origin === location.origin ? decodeURIComponent(url.pathname.slice(new URL("./", location.href).pathname.length)) : null;
      if (nomeRel && this.arquivo(nomeRel) && ehHtml(nomeRel)) { e.preventDefault(); this.antes = this.atual; this.mostrar(nomeRel, { busca: url.search, hash: url.hash }); return; }
      if (url.origin === location.origin && !/\.html?$|\/$/i.test(url.pathname)) return; // arquivo do site (assets/midia/…)
    } else if (r) {
      if (alvo === "_top" || alvo === "_parent") { e.preventDefault(); this.registrar("info", "[editor] target=\"" + alvo + "\" abriria o link na janela inteira; no editor ele abre aqui no quadro."); this.mostrar(r.nome, { busca: r.busca, hash: r.hash }); }
      return; // dentro da pasta virtual: o navegador navega sozinho
    }
    if (url.origin !== location.origin) {
      e.preventDefault();
      this.registrar("info", "[editor] Link para outro site: " + url.href + " (o editor abre numa aba nova do navegador).");
      try { window.open(url.href, "_blank", "noopener"); } catch (x) {}
      return;
    }
    e.preventDefault();
    this.registrar("warn", "[editor] O link \"" + href + "\" leva para fora dos arquivos desta caixa" + (this.modoAtual === "sw" ? "" : " (ou para uma aba que não existe)") + ".");
  };
  Quadro.prototype.envio = function (e, win) {
    if (e.defaultPrevented) return;
    var form = e.target, sub = e.submitter || null;
    var metodo = ((sub && sub.getAttribute("formmethod")) || form.getAttribute("method") || "get").toLowerCase();
    if (metodo === "dialog") return;
    e.preventDefault();
    metodo = metodo === "post" ? "POST" : "GET";
    var acaoAttr = (sub && sub.hasAttribute("formaction")) ? sub.getAttribute("formaction") : form.getAttribute("action");
    var enctype = ((sub && sub.getAttribute("formenctype")) || form.getAttribute("enctype") || "application/x-www-form-urlencoded").toLowerCase();
    var fd;
    try { fd = new win.FormData(form, sub || undefined); } catch (x) { fd = new win.FormData(form); }
    var campos = [], partes = [];
    fd.forEach(function (v, k) {
      if (typeof v === "string") { campos.push([k, v]); partes.push(encodeURIComponent(k).replace(/%20/g, "+") + "=" + encodeURIComponent(v).replace(/%20/g, "+")); }
      else { campos.push([k, v.name ? v.name + " (" + v.size + " bytes)" : "(nenhum arquivo)", true]); partes.push(encodeURIComponent(k) + "=" + encodeURIComponent(v.name || "")); }
    });
    var q = partes.join("&");
    var acaoTxt = acaoAttr === null || acaoAttr === "" ? (this.atual || this.entrada()) : acaoAttr;
    var destino = null;
    try { destino = this.modoAtual === "sw" ? this.nomeDe(new URL(acaoAttr || "", win.location.href).href) : (this.arquivo(acaoTxt.split(/[?#]/)[0]) ? { nome: acaoTxt.split(/[?#]/)[0] } : null); } catch (x) {}
    var endereco = acaoTxt.split("#")[0].split("?")[0] + (metodo === "GET" ? "?" + q : "");
    this.registrar("info", "[editor] Formulário enviado: " + metodo + " " + (metodo === "GET" ? endereco : acaoTxt + "   corpo: " + (enctype === "multipart/form-data" ? "(multipart) " : "") + q));
    this.antes = this.atual;
    if (metodo === "GET" && destino && this.arquivo(destino.nome) && ehHtml(destino.nome)) {
      // GET para uma aba do editor: abre a aba, com os dados no endereço (como um servidor de arquivos)
      this.mostrar(destino.nome, { busca: "?" + q });
      return;
    }
    this.mostrar(null, { html: paginaEnvio({ metodo: metodo, acao: acaoTxt, endereco: endereco, enctype: enctype, corpo: enctype === "multipart/form-data" ? "(dividido em partes, uma por campo)" : q, campos: campos }), endereco: metodo === "GET" ? endereco : acaoTxt + "  (POST)" });
  };
  Quadro.prototype.carregou = function (f, ger) {
    var win, doc, self = this;
    try { win = f.contentWindow; doc = f.contentDocument; } catch (e) {}
    if (!doc) return;
    try { if (!win.__htmlsimOk) f.__htmlsim.iniciar(win); } catch (e) {}
    this.atualizarEndereco(win);
    var volta = doc.getElementById("htmlsim-voltar");
    if (volta && this.atual === null) volta.addEventListener("click", function () { self.mostrar(self.antes || self.entrada()); });
    if (this.opts.altura) this.ajustarAltura(f, win, doc);
    if (this.opts.aoCarregar) this.opts.aoCarregar({ doc: doc, win: win, nome: this.atual, ger: ger });
  };
  Quadro.prototype.ajustarAltura = function (f, win, doc) {
    var self = this, alt = this.opts.altura;
    function medir() {
      if (f !== self.frame) return;
      var de = doc.documentElement; if (!de) return;
      var h = Math.ceil(de.getBoundingClientRect().height);
      if (de.scrollHeight > f.clientHeight + 1) h = Math.max(h, de.scrollHeight);
      if (doc.body && doc.compatMode === "BackCompat") h = Math.max(h, doc.body.scrollHeight);
      h = Math.max(alt.min, Math.min(alt.max, h + 2));
      if (Math.abs(f.offsetHeight - h) > 2) f.style.height = h + "px";
    }
    medir();
    // o ResizeObserver é o da página do guia e mede no quadro seguinte (sem "ResizeObserver loop" no console do leitor)
    var pedido = 0;
    try { var ro = new ResizeObserver(function () { if (!pedido) pedido = requestAnimationFrame(function () { pedido = 0; medir(); }); }); ro.observe(doc.documentElement); if (doc.body) ro.observe(doc.body); } catch (e) {}
    setTimeout(medir, 300);
  };
  // espera a página carregar e "assentar" (rAF + um pouco), para o testador e para as metas
  Quadro.prototype.assentar = function () {
    return new Promise(function (ok) { setTimeout(function () { requestAnimationFrame(function () { requestAnimationFrame(function () { ok(); }); }); }, 120); });
  };

  /* =====================================================================
     4. Interface
     ===================================================================== */
  var CSS = [
    ".hs-frame-host{position:relative;background:#fff;border:1px solid var(--border);border-top:0;border-radius:0 0 8px 8px;overflow:hidden}",
    ".hs-frame{display:block;width:100%;border:0;background:#fff;color-scheme:light;min-height:60px}",
    ".hs-frame.hs-novo{position:absolute;inset:0;visibility:hidden}",
    ".hs-janela{margin-top:10px}",
    ".hs-barra{display:flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid var(--border);border-radius:8px 8px 0 0;background:var(--sidebar-bg);font:13px system-ui,sans-serif;color:var(--muted);min-width:0}",
    ".hs-barra .sim-dots i{background:#c9c8c4}.hs-barra .sim-dots i:first-child{background:#d70a53}",
    ".hs-rot{font-weight:700;color:var(--text)}",
    ".hs-end{flex:1;min-width:0;padding:2px 10px;border:1px solid var(--border);border-radius:12px;background:var(--bg);color:var(--text);font:13px 'Ubuntu Mono',ui-monospace,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".hs-barra button{padding:1px 8px;border:1px solid var(--border);border-radius:5px;background:transparent;color:var(--text);font:13px system-ui,sans-serif;cursor:pointer}",
    ".hs-barra button:hover{color:var(--accent);border-color:var(--accent)}",
    ".hs .ts-editor{border-radius:0 0 8px 8px}",
    ".hs .ts-code{tab-size:2}",
    ".hs-console{margin-top:10px;border-radius:8px;overflow:hidden;background:#1e1e22}",
    ".hs-console .sim-bar{padding:4px 10px}",
    ".hs-console .sim-bar button{margin-left:auto}",
    ".hs-clog{max-height:220px;overflow:auto;padding:6px 12px 8px;font:13.5px/1.5 'Ubuntu Mono',ui-monospace,Menlo,Consolas,monospace;color:#e2e2e6;overscroll-behavior:contain}",
    ".hs-clog>div{white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;border-bottom:1px solid rgba(255,255,255,.06);padding:1px 0}",
    ".hs-clog .hs-vazio{color:#a9a9b2;font-style:italic;border:0}",
    ".hs-clog .hs-error{color:#ff8a80}.hs-clog .hs-warn{color:#fce94f}.hs-clog .hs-info{color:#9ecbff}",
    ".hs-clog .hs-error::before{content:'✖ '}.hs-clog .hs-warn::before{content:'⚠ '}",
    ".hs-w3c{margin-top:10px;padding:10px 14px;border:1px solid var(--border);border-radius:8px;background:var(--example-bg);font-size:14.5px}",
    ".hs-w3c ol{margin:6px 0 0;padding-left:1.4em}.hs-w3c li{margin:4px 0}",
    ".hs-w3c .hs-e{color:var(--bad);font-weight:700}.hs-w3c .hs-a{color:#a36a00;font-weight:700}",
    ".hs-w3c code{white-space:pre-wrap;word-break:break-word}",
    ".hs-nota{margin:8px 0 0;font-size:13.5px;color:var(--muted);line-height:1.5}",
    ".hs-falta{display:block;font-weight:400;font-size:14px;margin-top:2px}",
    ".hs-res{margin:-6px 0 18px}",
    ".hs-res .hs-barra{border-radius:8px 8px 0 0}",
    ".hs-res .hs-console{margin-top:6px}",
    "@media (max-width:600px){.hs-barra{flex-wrap:wrap}.hs-end{flex-basis:100%;order:3}.hs .ts-bar{gap:6px}}"
  ].join("\n");
  function estilo() {
    if (document.getElementById("htmlsim-css")) return;
    var s = document.createElement("style"); s.id = "htmlsim-css"; s.textContent = CSS; document.head.appendChild(s);
  }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html !== undefined && html !== null) e.innerHTML = html;
    return e;
  }
  // o texto do <pre> sem o botão "copiar" que o site.js põe dentro dele
  function lerPre(pre) {
    var t = "";
    for (var c = pre.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) t += c.data;
      else if (c.nodeType === 1 && !c.classList.contains("copy-btn")) t += c.textContent;
    }
    return t.replace(/^\n/, "").replace(/\n$/, "");
  }
  HS.lerPre = lerPre;

  /* ---------- console (o painel) ---------- */
  function Painel(dentro, sempre) {
    this.box = el("div", { "class": "hs-console", role: "log", "aria-label": "Console" },
      '<div class="sim-bar"><span class="sim-dots"><i></i><i></i><i></i></span><span class="sim-title" style="text-align:left">Console</span><button type="button" class="sim-btn hs-limpar">Limpar</button></div><div class="hs-clog"></div>');
    this.log = this.box.querySelector(".hs-clog");
    this.sempre = sempre;
    this.box.hidden = !sempre;
    var self = this;
    this.box.querySelector(".hs-limpar").addEventListener("click", function () { self.limpar(); });
    dentro.appendChild(this.box);
    this.limpar();
  }
  Painel.prototype.limpar = function () { this.log.innerHTML = '<div class="hs-vazio">(o console está vazio)</div>'; this.n = 0; if (!this.sempre) this.box.hidden = true; };
  Painel.prototype.add = function (tipo, txt) {
    if (!this.n) this.log.innerHTML = "";
    if (++this.n > 500) { if (this.n === 501) this.log.appendChild(el("div", { "class": "hs-vazio" }, "(… o editor mostra só as 500 primeiras linhas)")); return; }
    var d = el("div", { "class": "hs-" + tipo }); d.textContent = txt; this.log.appendChild(d);
    this.box.hidden = false;
    this.log.scrollTop = this.log.scrollHeight;
  };

  /* ---------- validar no W3C ---------- */
  function validarW3C(codigo) {
    var doc = HS.paraValidar(codigo);
    return fetch("https://validator.w3.org/nu/?out=json", { method: "POST", headers: { "Content-Type": "text/html; charset=utf-8" }, body: doc.texto })
      .then(function (r) { if (!r.ok) throw new Error("o validador respondeu " + r.status); return r.json(); })
      .then(function (j) { return { msgs: (j.messages || []), deslocamento: doc.deslocamento, fragmento: doc.deslocamento > 0 }; });
  }
  HS.validarW3C = validarW3C;
  function mostrarW3C(caixa, res, nomeAba) {
    var erros = res.msgs.filter(function (m) { return m.type === "error" || m.type === "non-document-error"; });
    var avisos = res.msgs.filter(function (m) { return m.type === "info" && m.subType === "warning"; });
    var h = "<strong>Validador do W3C</strong> (" + escHtml(nomeAba) + "): ";
    h += erros.length ? '<span class="hs-e">' + erros.length + (erros.length === 1 ? " erro" : " erros") + "</span>" : '<span style="color:var(--ok);font-weight:700">✔ nenhum erro</span>';
    if (avisos.length) h += ", " + '<span class="hs-a">' + avisos.length + (avisos.length === 1 ? " aviso" : " avisos") + "</span>";
    var lista = erros.concat(avisos);
    if (lista.length) {
      h += "<ol>" + lista.map(function (m) {
        var l = m.lastLine || m.firstLine, ln = l ? l - res.deslocamento : null;
        var onde = ln && ln > 0 ? "linha " + ln + (m.firstColumn ? ", coluna " + m.firstColumn : "") : (ln !== null ? "no esqueleto que o editor pôs em volta" : "");
        return "<li><span class=\"" + (m.type === "error" ? "hs-e\">Error" : "hs-a\">Warning") + "</span>" + (onde ? " (" + onde + ")" : "") + ": " + escHtml(m.message) + (m.extract ? "<br><code>" + escHtml(m.extract.replace(/\n/g, "↵")) + "</code>" : "") + "</li>";
      }).join("") + "</ol>";
    }
    h += '<p class="hs-nota">As mensagens do validador são em inglês.' + (res.fragmento ? " O código é um pedaço de página, então o editor o pôs dentro de um esqueleto mínimo (<code>&lt;!DOCTYPE html&gt;</code>, <code>&lt;html lang&gt;</code>, <code>&lt;head&gt;</code> com <code>&lt;title&gt;</code>) antes de mandar; as linhas já estão contadas como no seu código." : "") + "</p>";
    caixa.innerHTML = h; caixa.hidden = false;
  }

  /* ---------- a caixa .tryhtml ---------- */
  var caixas = [];
  HS.caixas = caixas;
  function montar(box) {
    if (box.getAttribute("data-montado")) return;
    box.setAttribute("data-montado", "1");
    var meta = box.getAttribute("data-goal") || "";
    var scripts = Array.prototype.slice.call(box.querySelectorAll("pre.script"));
    var sols = Array.prototype.slice.call(box.querySelectorAll("pre.solucao"));
    var abas = scripts.map(function (p, i) { return { nome: p.getAttribute("data-file") || (i === 0 ? "index.html" : "arquivo" + i + ".html"), original: lerPre(p), atual: lerPre(p) }; });
    if (!abas.length) abas.push({ nome: "index.html", original: "", atual: "" });
    var solucao = sols.length ? sols.map(function (p, i) { return { nome: p.getAttribute("data-file") || (abas[i] ? abas[i].nome : "index.html"), codigo: lerPre(p) }; }) : null;
    scripts.concat(sols).forEach(function (p) { p.style.display = "none"; });
    var ativa = 0;

    var w = el("div", { "class": "ts tc hs" });
    w.innerHTML =
      '<div class="ts-bar"><span class="tc-tabs" role="tablist" aria-label="Arquivos"></span><span class="ts-sp"></span>' +
      '<button type="button" class="sim-btn hs-validar" title="Manda o código desta aba para o validador do W3C, na internet">Validar no W3C</button>' +
      (solucao ? '<button type="button" class="sim-btn ts-sol">Ver solução</button>' : "") +
      '<button type="button" class="sim-btn ts-rest" title="Volta ao código original">Restaurar</button></div>' +
      '<div class="ts-confirma hs-conf-sol" hidden><span>Trocar o seu código pela solução?</span> <button type="button" class="sim-btn2 ts-sim">Sim, mostrar</button> <button type="button" class="sim-btn2 secundario ts-nao">Cancelar</button></div>' +
      '<div class="ts-confirma hs-conf-w3c" hidden><span>O código da aba <strong class="hs-aba-w3c"></strong> vai ser enviado ao validador do W3C (validator.w3.org), na internet. Enviar?</span> <button type="button" class="sim-btn2 hs-w3c-sim">Sim, validar</button> <button type="button" class="sim-btn2 secundario hs-w3c-nao">Cancelar</button></div>' +
      '<div class="ts-editor"><pre class="ts-nums" aria-hidden="true"></pre><textarea class="ts-code" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off" aria-label="Código"></textarea></div>' +
      '<div class="hs-w3c" hidden aria-live="polite"></div>' +
      '<div class="hs-janela"><div class="hs-barra"><span class="sim-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="hs-rot">Resultado</span><span class="hs-end" title="O endereço da página mostrada no quadro"></span>' +
      '<button type="button" class="hs-recarregar" title="Volta à primeira página e desenha de novo">↻</button><button type="button" class="hs-abrir" title="Abre o resultado numa aba nova" hidden>↗</button></div><div class="hs-frame-host"></div></div>';
    box.appendChild(w);
    var status = null, falta = null;
    if (meta) {
      status = el("p", { "class": "sim-status", "aria-live": "polite" }, "Missão em andamento…");
      box.appendChild(status);
    }
    var ta = w.querySelector(".ts-code"), nums = w.querySelector(".ts-nums");
    var endTxt = w.querySelector(".hs-end"), w3c = w.querySelector(".hs-w3c");
    var temScript = abas.some(function (a) { return /\.m?js$/i.test(a.nome) || /<script\b/i.test(a.original) || /\bon[a-z]+\s*=/i.test(a.original); }) || (solucao || []).some(function (s) { return /\.m?js$/i.test(s.nome) || /<script\b|\bon[a-z]+\s*=/i.test(s.codigo); }) || /console:/.test(meta);
    var painel = new Painel(w, temScript);
    var cumprida = false, timer = null;

    function arquivos() { return abas.map(function (a) { return { nome: a.nome, codigo: a.atual }; }); }
    function fonte() { return abas.map(function (a) { return a.atual; }).join("\n"); }
    var quadro = new Quadro(w.querySelector(".hs-frame-host"), {
      arquivos: arquivos,
      altura: { min: 120, max: 460 },
      aoConsole: function (t, txt) { painel.add(t, txt); agendarMetas(); },
      aoEndereco: function (e) { endTxt.textContent = e; },
      aoCarregar: function (info) {
        observar(info.doc);
        verificar();
        aoCarregarFns.splice(0).forEach(function (f) { f(info); });
      }
    });
    var aoCarregarFns = [];
    var obs = null;
    function observar(doc) {
      if (obs) obs.disconnect();
      if (!meta) return;
      try { obs = new MutationObserver(agendarMetas); obs.observe(doc, { subtree: true, childList: true, attributes: true, characterData: true }); } catch (e) {}
      try { doc.addEventListener("input", agendarMetas, true); doc.addEventListener("change", agendarMetas, true); } catch (e) {}
    }
    var tMetas = null;
    function agendarMetas() { if (!meta || cumprida) return; clearTimeout(tMetas); tMetas = setTimeout(verificar, 150); }
    function contexto() {
      var doc = null;
      if (quadro.atual === quadro.entrada()) { try { doc = quadro.frame.contentDocument; } catch (e) {} }
      return { doc: doc, console: quadro.consoleTexto, src: fonte() };
    }
    function verificar() {
      if (!status || cumprida) return;
      var ctx = contexto();
      if (!ctx.doc) { status.innerHTML = "Missão em andamento… <span class=\"hs-falta\">(as metas olham a página " + escHtml(quadro.entrada()) + ": volte a ela com o botão ↻)</span>"; return; }
      var f = HS.falhas(meta, ctx);
      if (!f.length) { cumprida = true; status.textContent = "✔ Missão cumprida!"; status.className = "sim-status ok"; return; }
      status.innerHTML = "Missão em andamento… <span class=\"hs-falta\">Ainda falta: " + f.map(function (x) { return escHtml(x.desc) + (x.motivo && !/^(src|nsrc)$/.test(x.tipo) ? " <small>(" + escHtml(x.motivo) + ")</small>" : ""); }).join("; ") + "</span>";
    }

    /* ---------- editor ---------- */
    function ajustar() {
      var n = ta.value.split("\n").length, t = "";
      for (var i = 1; i <= n; i++) t += i + "\n";
      nums.textContent = t;
      ta.style.height = "auto";
      ta.style.height = Math.max(ta.scrollHeight, 60) + "px";
    }
    function salvarAba() { abas[ativa].atual = ta.value; }
    function desenharAbas() {
      var cont = w.querySelector(".tc-tabs");
      cont.innerHTML = abas.map(function (a, i) { return '<button type="button" role="tab" class="tc-tab' + (i === ativa ? " on" : "") + '" data-i="' + i + '" aria-selected="' + (i === ativa) + '">' + escHtml(a.nome) + "</button>"; }).join("");
      Array.prototype.forEach.call(cont.querySelectorAll(".tc-tab"), function (b) { b.addEventListener("click", function () { trocarAba(+b.getAttribute("data-i")); }); });
      ta.setAttribute("aria-label", "Código do arquivo " + abas[ativa].nome);
    }
    function trocarAba(i) {
      salvarAba(); ativa = i; ta.value = abas[i].atual; ajustar(); desenharAbas();
      if (ehHtml(abas[i].nome) && quadro.atual !== abas[i].nome) desenhar(abas[i].nome);
    }
    function desenhar(nome) {
      painel.limpar();
      return quadro.mostrar(nome || (quadro.atual && quadro.arquivo(quadro.atual) ? quadro.atual : null));
    }
    function mudou() {
      salvarAba(); ajustar();
      clearTimeout(timer);
      timer = setTimeout(function () { desenhar(ehHtml(abas[ativa].nome) ? abas[ativa].nome : null); }, 450);
    }
    function inserir(txt, a, b) {
      if (ta.setRangeText) ta.setRangeText(txt, a, b, "end");
      else { ta.value = ta.value.slice(0, a) + txt + ta.value.slice(b); ta.selectionStart = ta.selectionEnd = a + txt.length; }
      mudou();
    }
    ta.addEventListener("input", mudou);
    ta.addEventListener("keydown", function (e) {
      var a = ta.selectionStart, b = ta.selectionEnd, v = ta.value;
      if (e.key === "Tab" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        var ini = v.lastIndexOf("\n", a - 1) + 1;
        if (e.shiftKey) {
          var tira = /^ {1,2}|^\t/.exec(v.slice(ini));
          if (tira) { ta.value = v.slice(0, ini) + v.slice(ini + tira[0].length); ta.selectionStart = Math.max(ini, a - tira[0].length); ta.selectionEnd = Math.max(ini, b - tira[0].length); mudou(); }
        } else if (a !== b && v.slice(a, b).indexOf("\n") >= 0) {
          var bloco = v.slice(ini, b).replace(/^/gm, "  ");
          ta.value = v.slice(0, ini) + bloco + v.slice(b); ta.selectionStart = ini; ta.selectionEnd = ini + bloco.length; mudou();
        } else inserir("  ", a, b);
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); clearTimeout(timer); salvarAba(); desenhar(); }
      else if (e.key === "Enter" && !e.shiftKey) {
        var ini2 = v.lastIndexOf("\n", a - 1) + 1, antes = v.slice(ini2, a), ind = /^[ \t]*/.exec(antes)[0];
        if (/<(?!\/|!|br|hr|img|input|meta|link|source|track|wbr|area|col|embed|base)[a-z][^>]*>\s*$/i.test(antes) || /\{\s*$/.test(antes)) ind += "  ";
        if (ind) { e.preventDefault(); inserir("\n" + ind, a, b); }
      } else if (e.key === "Escape") { ta.blur(); }
    });
    w.querySelector(".ts-rest").addEventListener("click", function () {
      abas = abas.filter(function (a) { return !a.extra; });
      abas.forEach(function (a) { a.atual = a.original; });
      ativa = Math.min(ativa, abas.length - 1); ta.value = abas[ativa].atual; ajustar(); desenharAbas(); w3c.hidden = true;
      desenhar(quadro.entrada());
    });
    var conf = w.querySelector(".hs-conf-sol");
    function aplicarSolucao() {
      solucao.forEach(function (sl) {
        var a = abas.filter(function (x) { return x.nome === sl.nome; })[0];
        if (a) a.atual = sl.codigo; else abas.push({ nome: sl.nome, original: "", atual: sl.codigo, extra: true });
      });
      ta.value = abas[ativa].atual; ajustar(); desenharAbas();
    }
    if (solucao) {
      w.querySelector(".ts-sol").addEventListener("click", function () { conf.hidden = false; w.querySelector(".hs-conf-w3c").hidden = true; });
      w.querySelector(".ts-sim").addEventListener("click", function () { aplicarSolucao(); conf.hidden = true; desenhar(quadro.entrada()); });
      w.querySelector(".ts-nao").addEventListener("click", function () { conf.hidden = true; });
    }
    // Validar no W3C (o código sai do navegador: só depois de confirmar)
    var confW = w.querySelector(".hs-conf-w3c");
    w.querySelector(".hs-validar").addEventListener("click", function () {
      salvarAba();
      var aba = ehHtml(abas[ativa].nome) ? abas[ativa] : abas.filter(function (a) { return ehHtml(a.nome); })[0];
      if (!aba) { w3c.hidden = false; w3c.textContent = "O validador de HTML confere arquivos .html; esta caixa não tem nenhum."; return; }
      w.querySelector(".hs-aba-w3c").textContent = aba.nome;
      confW.hidden = false; conf.hidden = true;
      confW._aba = aba;
    });
    w.querySelector(".hs-w3c-nao").addEventListener("click", function () { confW.hidden = true; });
    w.querySelector(".hs-w3c-sim").addEventListener("click", function () {
      var aba = confW._aba; confW.hidden = true;
      w3c.hidden = false; w3c.textContent = "Enviando " + aba.nome + " para o validador do W3C…";
      validarW3C(aba.atual).then(function (r) { mostrarW3C(w3c, r, aba.nome); }, function (e) {
        w3c.innerHTML = "Não consegui falar com o validador do W3C (" + escHtml(e.message || String(e)) + "). Confira a internet, ou cole o código em <a href=\"https://validator.w3.org/nu/#textarea\" target=\"_blank\" rel=\"noopener\">validator.w3.org/nu</a>.";
      });
    });
    w.querySelector(".hs-recarregar").addEventListener("click", function () { salvarAba(); desenhar(quadro.entrada()); });
    var abrir = w.querySelector(".hs-abrir");
    abrir.addEventListener("click", function () { if (quadro.modoAtual === "sw" && quadro.atual) window.open(quadro.pasta + quadro.atual, "_blank"); });
    prepararModo().then(function (md) { abrir.hidden = md !== "sw"; });
    ta.value = abas[0].atual;
    desenharAbas();
    ajustar();

    // desenha quando a caixa chega perto da tela
    var desenhado = false;
    function primeiro() { if (!desenhado) { desenhado = true; desenhar(quadro.entrada()); } }
    if ("IntersectionObserver" in window && !HS.teste) {
      var io = new IntersectionObserver(function (es) { if (es.some(function (x) { return x.isIntersecting; })) { io.disconnect(); primeiro(); } }, { rootMargin: "600px 0px" });
      io.observe(box);
    } else if (!HS.teste) primeiro();

    var ctrl = {
      box: box, meta: meta, quadro: quadro,
      abas: function () { return abas.map(function (a) { return { nome: a.nome, codigo: a.atual }; }); },
      cumprida: function () { return cumprida; },
      /* para o testador: põe o código ("inicial" ou "solucao"), desenha a página de entrada
         e devolve { metas, console, modo, compat, url } */
      testar: function (qual) {
        abas = abas.filter(function (a) { return !a.extra; });
        abas.forEach(function (a) { a.atual = a.original; });
        if (qual === "solucao" && solucao) aplicarSolucao();
        ativa = 0; ta.value = abas[0].atual; ajustar(); desenharAbas();
        cumprida = false;
        if (status) { status.className = "sim-status"; status.textContent = "Missão em andamento…"; }
        desenhado = true;
        return new Promise(function (ok) {
          aoCarregarFns.push(function (info) {
            quadro.assentar().then(function () {
              var ctx = contexto();
              ok({ metas: meta ? HS.avaliarMetas(meta, ctx) : [], console: quadro.consoleTexto, modo: quadro.modoAtual, compat: info.doc.compatMode, nome: info.nome, temDoc: !!ctx.doc });
            });
          });
          painel.limpar();
          quadro.mostrar(quadro.entrada());
        });
      }
    };
    caixas.push(ctrl);
    return ctrl;
  }

  /* ---------- pre.file[data-resultado]: o quadro "Resultado" ---------- */
  var resultados = [];
  HS.resultados = resultados;
  function montarResultado(pre) {
    if (pre.getAttribute("data-montado")) return;
    pre.setAttribute("data-montado", "1");
    // data-file é só o rótulo ("index.html", "trecho", "receita.html · erro de propósito"):
    // o código é desenhado como HTML, a não ser que o rótulo seja um arquivo .css/.js
    var rotulo = pre.getAttribute("data-file") || "";
    var arq = /[\w.\/-]+\.html?\b/i.exec(rotulo), nome = arq ? arq[0] : "index.html";
    var r = { pre: pre, nome: nome, rotulo: rotulo, codigo: lerPre(pre), pronto: null };
    resultados.push(r);
    if (naoDesenha(rotulo)) { console.warn("htmlsim: data-resultado desenha HTML, não " + rotulo); r.desenhar = function () { return Promise.resolve({ console: "", compat: "", modo: "" }); }; return r; }
    var caixa = el("div", { "class": "hs-res hs" },
      '<div class="hs-barra"><span class="sim-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="hs-rot">Resultado</span><span class="hs-end"></span></div><div class="hs-frame-host"></div>');
    pre.parentNode.insertBefore(caixa, pre.nextSibling);
    var painel = new Painel(caixa, false);
    var endTxt = caixa.querySelector(".hs-end");
    var esperando = [];
    var q = new Quadro(caixa.querySelector(".hs-frame-host"), {
      arquivos: function () { return [{ nome: nome, codigo: r.codigo }]; },
      altura: { min: 40, max: 640 },
      aoConsole: function (t, txt) { painel.add(t, txt); },
      aoEndereco: function (e) { endTxt.textContent = e; },
      aoCarregar: function (info) { esperando.splice(0).forEach(function (f) { f(info); }); }
    });
    r.quadro = q;
    r.desenhar = function () {
      if (r.pronto) return r.pronto;
      r.pronto = new Promise(function (ok) {
        esperando.push(function (info) { q.assentar().then(function () { ok({ console: q.consoleTexto, compat: info.doc.compatMode, modo: q.modoAtual }); }); });
      });
      q.mostrar(nome);
      return r.pronto;
    };
    if ("IntersectionObserver" in window && !HS.teste) {
      var io = new IntersectionObserver(function (es) { if (es.some(function (x) { return x.isIntersecting; })) { io.disconnect(); r.desenhar(); } }, { rootMargin: "800px 0px" });
      io.observe(pre);
    } else if (!HS.teste) r.desenhar();
    return r;
  }

  function montarTudo() {
    estilo();
    if (document.querySelector(".tryhtml, pre.file[data-resultado]")) prepararModo();
    Array.prototype.forEach.call(document.querySelectorAll(".tryhtml"), function (b) {
      try { montar(b); } catch (e) { console.error("htmlsim:", e); }
    });
    Array.prototype.forEach.call(document.querySelectorAll("pre.file[data-resultado]"), function (p) {
      try { montarResultado(p); } catch (e) { console.error("htmlsim:", e); }
    });
    HS.montado = true;
  }
  HS.teste = /[?&]htmlsim-teste\b/.test(location.search);
  HS.montarTudo = montarTudo;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montarTudo); else montarTudo();
})();
