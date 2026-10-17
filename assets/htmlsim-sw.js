/* htmlsim-sw.js — o "servidor" das caixas Experimente do Guia HTML.
   Escopo: assets/sim/. Cada caixa tem uma pasta virtual assets/sim/<caixa>/,
   cujos arquivos (as abas do editor) o assets/htmlsim.js grava no Cache Storage.
   - arquivo de uma aba → sai do cache (como um servidor de arquivos estáticos;
     o "?…" do endereço é ignorado);
   - outra página .html que não é aba → página 404 do editor;
   - qualquer outro arquivo (assets/midia/bolo-800.jpg…) → o arquivo do próprio
     site, como se a pasta da caixa fosse a raiz do guia. */
"use strict";
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener("fetch", function (e) {
  var escopo = self.registration.scope;
  if (e.request.url.indexOf(escopo) !== 0) return;
  e.respondWith(responder(e.request, escopo));
});

function pagina404(pasta, nome, abas) {
  var lista = abas.length ? abas.map(function (a) { return "<li><a href=\"" + a + "\">" + a + "</a></li>"; }).join("") : "";
  return "<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\"><title>404 Não encontrado</title>" +
    "<style>body{font:15px/1.5 system-ui,sans-serif;margin:16px;color:#1d1d1b;background:#fff}h1{font-size:1.25rem;margin:0 0 6px}code{background:#f1efeb;padding:1px 5px;border-radius:4px}</style></head><body>" +
    "<h1>404: página não encontrada</h1><p>O endereço <code>" + esc(nome) + "</code> não existe entre os arquivos desta caixa.</p>" +
    (lista ? "<p>Os arquivos que existem aqui são:</p><ul>" + lista + "</ul>" : "") +
    "<p style=\"color:#5f5f5a;font-size:13.5px\">Num site publicado, o servidor responderia algo parecido (o famoso erro 404). Confira o nome do arquivo no <code>href</code>: maiúsculas, acentos e a extensão <code>.html</code> contam.</p></body></html>";
}
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

async function responder(req, escopo) {
  var url = new URL(req.url);
  var resto = url.href.slice(escopo.length).split(/[?#]/)[0];
  var i = resto.indexOf("/");
  if (i < 0) return new Response("", { status: 404 });
  var pasta = resto.slice(0, i), arq = resto.slice(i + 1);
  var nome;
  try { nome = decodeURIComponent(arq); } catch (x) { nome = arq; }
  if (nome === "" || /\/$/.test(nome)) nome += "index.html";
  var chave = escopo + pasta + "/" + nome.split("/").map(encodeURIComponent).join("/");
  if (req.method === "GET" || req.method === "HEAD") {
    var r = await caches.match(chave);
    if (r) return r;
  }
  var ehPagina = /\.html?$/i.test(nome) || !/\.[a-z0-9]+$/i.test(nome);
  if (req.mode === "navigate" && ehPagina) {
    var abas = [];
    try {
      var ks = await caches.keys();
      for (var k = 0; k < ks.length; k++) {
        if (!/^htmlsim-/.test(ks[k])) continue;
        var c = await caches.open(ks[k]);
        (await c.keys()).forEach(function (q) {
          if (q.url.indexOf(escopo + pasta + "/") === 0) {
            var n = decodeURIComponent(q.url.slice((escopo + pasta + "/").length));
            if (/\.html?$/i.test(n) && n !== "__htmlsim__.html") abas.push(n);
          }
        });
      }
    } catch (x) {}
    var prof = nome.split("/").length - 1, sobe = prof ? new Array(prof + 1).join("../") : "";
    return new Response(pagina404(pasta, nome, abas.map(function (a) { return sobe + a; })), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  // o resto vem do próprio site: a pasta da caixa faz o papel da raiz do guia
  var raiz = new URL("../../", escopo);
  var real = new URL(arq, raiz).href + url.search;
  var h = new Headers();
  ["range", "accept"].forEach(function (n) { var v = req.headers.get(n); if (v) h.set(n, v); });
  return fetch(real, { method: req.method === "HEAD" ? "HEAD" : "GET", headers: h, credentials: "same-origin" });
}
