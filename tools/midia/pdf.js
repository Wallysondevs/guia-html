// pdf.js SAIDA.pdf — imprime a receita do bolo da Ana num PDF de uma página (Chromium, sem janela).
"use strict";
const path = require("path");
let puppeteer;
for (const p of [path.join(__dirname, "../node_modules/puppeteer-core"), path.join(process.env.HOME, "rascunho/coord/cdp/node_modules/puppeteer-core")]) {
  try { puppeteer = require(p); break; } catch (e) { /* próximo */ }
}
const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Bolo de cenoura da Ana</title>
<style>
@page { size: A5; margin: 14mm; }
body { font: 11pt/1.5 Lato, "DejaVu Sans", sans-serif; color: #1d1d1b; }
h1 { font-size: 20pt; color: #c7401f; margin: 0 0 2mm; }
h2 { font-size: 12.5pt; color: #1d6f6a; margin: 5mm 0 1mm; }
p.sub { margin: 0 0 4mm; color: #5f5f5a; }
ul, ol { margin: 0; padding-left: 6mm; }
footer { margin-top: 8mm; font-size: 8.5pt; color: #5f5f5a; border-top: 1px solid #dddcd8; padding-top: 2mm; }
</style></head><body>
<h1>Bolo de cenoura da Ana</h1>
<p class="sub">Rende 12 fatias · Preparo: 20 minutos · Forno: 40 minutos</p>
<h2>Ingredientes da massa</h2>
<ul><li>3 cenouras médias</li><li>3 ovos</li><li>1 xícara de óleo</li><li>2 xícaras de açúcar</li><li>2 xícaras de farinha de trigo</li><li>1 colher (sopa) de fermento</li></ul>
<h2>Cobertura</h2>
<ul><li>4 colheres (sopa) de chocolate em pó</li><li>2 colheres (sopa) de manteiga</li><li>1 xícara de açúcar</li><li>4 colheres (sopa) de leite</li></ul>
<h2>Modo de preparo</h2>
<ol><li>Bata no liquidificador as cenouras, os ovos e o óleo.</li><li>Junte o açúcar e a farinha e misture bem.</li><li>Acrescente o fermento por último, mexendo devagar.</li><li>Asse em forno médio (180 °C) por cerca de 40 minutos.</li><li>Ferva os ingredientes da cobertura e espalhe sobre o bolo.</li></ol>
<footer>Lojinha da Ana · Arquivo de exemplo do Guia HTML</footer>
</body></html>`;
(async () => {
  const nav = await puppeteer.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-gpu"] });
  const pg = await nav.newPage();
  await pg.setContent(html, { waitUntil: "load" });
  await pg.pdf({ path: process.argv[2], format: "A5", printBackground: true, tagged: true });
  await nav.close();
})().catch((e) => { console.error(e); process.exit(1); });
