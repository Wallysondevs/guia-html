#!/usr/bin/env python3
"""Desenha as imagens de exemplo do Guia HTML (SVG feito à mão, sem fotos de terceiros).
Uso: python3 svgs.py PASTA_SAIDA PASTA_QUADROS
Gera: bolo.svg, bolo-quadrado.svg, logo-lojinha.svg, avatar-ana.svg, mapa.svg, favicon.svg
e os quadros (SVG) do vídeo curto em PASTA_QUADROS."""
import math, os, random, sys

saida = sys.argv[1]
quadros = sys.argv[2] if len(sys.argv) > 2 else None
os.makedirs(saida, exist_ok=True)
FONTE = "Lato, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"


def grava(nome, txt):
    with open(os.path.join(saida, nome), "w", encoding="utf-8") as f:
        f.write(txt)


# ---------------------------------------------------------------- bolo
def bolo_defs():
    return """<defs>
<linearGradient id="fundo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdebd9"/><stop offset="1" stop-color="#f6c7a3"/></linearGradient>
<linearGradient id="mesa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8774b"/><stop offset="1" stop-color="#7f4826"/></linearGradient>
<linearGradient id="massa" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9772c"/><stop offset=".35" stop-color="#f4a558"/><stop offset=".6" stop-color="#f09a4a"/><stop offset="1" stop-color="#c96a24"/></linearGradient>
<linearGradient id="choc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3b1c10"/><stop offset=".4" stop-color="#6b3622"/><stop offset=".7" stop-color="#5a2c1a"/><stop offset="1" stop-color="#341709"/></linearGradient>
<radialGradient id="topo" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#7a432b"/><stop offset="1" stop-color="#4f2717"/></radialGradient>
<radialGradient id="prato" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9dee5"/></radialGradient>
<radialGradient id="luz" cx=".2" cy=".15" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<filter id="desfoque" x="-30%" y="-50%" width="160%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
</defs>"""


def bolo_corpo(cx=400, topo=262, base=430, rx=190, ry=40, gota=1.0, semente=7):
    """O bolo (massa, recheio, cobertura com pingos, cenourinhas). gota: 0..1 (tamanho dos pingos)."""
    rnd = random.Random(semente)
    x0, x1 = cx - rx, cx + rx
    p = []
    p.append(f'<ellipse cx="{cx}" cy="{base + 22}" rx="{rx + 70}" ry="{ry - 6}" fill="#4a2410" opacity=".35" filter="url(#desfoque)"/>')
    p.append(f'<ellipse cx="{cx}" cy="{base + 30}" rx="{rx + 80}" ry="{ry + 4}" fill="#c3c9d2"/>')
    p.append(f'<ellipse cx="{cx}" cy="{base + 23}" rx="{rx + 80}" ry="{ry + 4}" fill="url(#prato)"/>')
    p.append(f'<ellipse cx="{cx}" cy="{base + 20}" rx="{rx + 25}" ry="{ry - 10}" fill="#eef1f5"/>')
    p.append(f'<path d="M{x0} {topo} L{x0} {base} A{rx} {ry} 0 0 0 {x1} {base} L{x1} {topo} Z" fill="url(#massa)"/>')
    meio = (topo + base) / 2 + 8
    p.append(f'<path d="M{x0} {meio} A{rx} {ry} 0 0 0 {x1} {meio} L{x1} {meio + 15} A{rx} {ry} 0 0 1 {x0} {meio + 15} Z" fill="#fbe3c4"/>')
    p.append(f'<path d="M{x0} {meio + 15} A{rx} {ry} 0 0 0 {x1} {meio + 15} L{x1} {meio + 19} A{rx} {ry} 0 0 1 {x0} {meio + 19} Z" fill="#e2a978" opacity=".8"/>')
    # migalhas (textura da massa)
    for _ in range(70):
        x = rnd.uniform(x0 + 8, x1 - 8)
        borda = ry * math.sqrt(max(0, 1 - ((x - cx) / rx) ** 2))
        y = rnd.choice([rnd.uniform(topo + 45, meio - 6), rnd.uniform(meio + 26, base + borda - 10)])
        p.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rnd.uniform(1.2, 3):.1f}" fill="#b85f1f" opacity="{rnd.uniform(.25, .55):.2f}"/>')
    # cobertura com pingos
    pingos = [(rnd.uniform(x0 + 10, x1 - 10), rnd.uniform(18, 72) * gota, rnd.uniform(7, 13)) for _ in range(13)]
    pts = []
    x = x0
    while x <= x1 + 0.01:
        borda = ry * math.sqrt(max(0, 1 - ((x - cx) / rx) ** 2))
        d = 16 + sum(L * math.exp(-((x - c) / w) ** 2 / 2) for c, L, w in pingos)
        pts.append(f"{x:.1f} {topo + borda + d:.1f}")
        x += 2
    p.append(f'<path d="M{x0} {topo} L{" L".join(pts)} L{x1} {topo} Z" fill="url(#choc)"/>')
    for c, L, w in pingos:
        borda = ry * math.sqrt(max(0, 1 - ((c - cx) / rx) ** 2))
        if L > 25:
            p.append(f'<circle cx="{c:.1f}" cy="{topo + borda + 16 + L - w * .9:.1f}" r="{w * .85:.1f}" fill="#5a2c1a"/>')
    p.append(f'<ellipse cx="{cx}" cy="{topo}" rx="{rx}" ry="{ry}" fill="url(#topo)"/>')
    p.append(f'<path d="M{cx - 110} {topo - 14} q70 -22 160 -8" stroke="#a46a4f" stroke-width="7" fill="none" stroke-linecap="round" opacity=".55"/>')
    # cenourinhas de enfeite
    for (ex, ey, ang) in [(cx - 95, topo - 4, -25), (cx - 15, topo - 18, 10), (cx + 70, topo + 2, 35), (cx + 10, topo + 22, -5)]:
        p.append(f'<g transform="translate({ex} {ey}) rotate({ang})">'
                 '<path d="M-6 -10 Q0 -14 6 -10 L1 22 Q0 25 -1 22 Z" fill="#f28c28" stroke="#c96a16" stroke-width="1.2"/>'
                 '<path d="M-3 -1 h6 M-3 6 h5 M-2 13 h4" stroke="#c96a16" stroke-width="1.2"/>'
                 '<path d="M0 -12 q-9 -12 -6 -20 q4 6 6 18 q2 -12 8 -17 q1 9 -8 19" fill="#3f9a3a"/></g>')
    # granulado
    for _ in range(26):
        a = rnd.uniform(0, 2 * math.pi)
        rr = math.sqrt(rnd.uniform(0, 1))
        x, y = cx + math.cos(a) * rx * .85 * rr, topo + math.sin(a) * ry * .75 * rr
        cor = rnd.choice(["#ffd166", "#ffffff", "#ef476f", "#f4a261"])
        p.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="7" height="2.6" rx="1.3" fill="{cor}" transform="rotate({rnd.uniform(0, 180):.0f} {x:.1f} {y:.1f})"/>')
    return "\n".join(p)


def bolo(viewbox="0 0 800 600", w=800, h=600, titulo="Bolo de cenoura com cobertura de chocolate"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" width="{w}" height="{h}" role="img" aria-labelledby="t">
<title id="t">{titulo}</title>
{bolo_defs()}
<rect width="800" height="600" fill="url(#fundo)"/>
<rect width="800" height="600" fill="url(#luz)"/>
<g opacity=".35" fill="none" stroke="#e8a77f" stroke-width="2">
<rect x="560" y="60" width="170" height="150" rx="8"/><path d="M645 60 v150 M560 135 h170"/>
</g>
<circle cx="120" cy="120" r="60" fill="#fff" opacity=".25"/>
<rect y="455" width="800" height="145" fill="url(#mesa)"/>
<rect y="455" width="800" height="7" fill="#d69a6c"/>
<path d="M0 520 h800 M0 570 h800" stroke="#6e3c1d" stroke-width="2" opacity=".35"/>
{bolo_corpo()}
</svg>
"""


grava("bolo.svg", bolo())
grava("bolo-quadrado.svg", bolo("170 150 460 460", 460, 460))

# ---------------------------------------------------------------- logo
toldo = []
for i in range(6):
    x = 18 + i * 20
    cor = "#c7401f" if i % 2 == 0 else "#ffffff"
    toldo.append(f'<path d="M{x} 30 h20 v22 a10 10 0 0 1 -20 0 Z" fill="{cor}" stroke="#9a2f14" stroke-width="1.5"/>')
grava("logo-lojinha.svg", f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" width="400" height="160" role="img" aria-labelledby="t">
<title id="t">Lojinha da Ana</title>
<g transform="translate(8 14)">
<rect x="22" y="56" width="112" height="70" rx="4" fill="#fff7ef" stroke="#1d6f6a" stroke-width="4"/>
<rect x="36" y="70" width="40" height="34" rx="3" fill="#bfe3df" stroke="#1d6f6a" stroke-width="3"/>
<rect x="88" y="70" width="32" height="56" rx="3" fill="#1d6f6a"/>
<circle cx="113" cy="99" r="2.6" fill="#ffd166"/>
<path d="M56 92 c-6 -7 -15 -1 -9 6 l9 8 l9 -8 c6 -7 -3 -13 -9 -6 Z" fill="#c7401f"/>
<rect x="14" y="20" width="128" height="12" rx="4" fill="#9a2f14"/>
{''.join(toldo)}
</g>
<text x="168" y="88" font-family="{FONTE}" font-size="50" font-weight="900" fill="#c7401f" letter-spacing="-1">Lojinha</text>
<text x="170" y="124" font-family="{FONTE}" font-size="30" font-weight="700" fill="#1d6f6a">da Ana</text>
<path d="M272 114 q40 10 80 -6" stroke="#ffd166" stroke-width="6" fill="none" stroke-linecap="round"/>
</svg>
""")

# ---------------------------------------------------------------- avatar
grava("avatar-ana.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="t">
<title id="t">Avatar da Ana</title>
<defs><clipPath id="c"><circle cx="128" cy="128" r="128"/></clipPath>
<linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe3cf"/><stop offset="1" stop-color="#f7b99a"/></linearGradient></defs>
<g clip-path="url(#c)">
<rect width="256" height="256" fill="url(#f)"/>
<path d="M30 256 c6 -52 44 -78 98 -78 s92 26 98 78 Z" fill="#1d6f6a"/>
<path d="M98 182 l30 30 l30 -30" fill="#fff7ef"/>
<rect x="110" y="150" width="36" height="40" rx="14" fill="#e0a07a"/>
<circle cx="128" cy="44" r="26" fill="#5b3420"/>
<ellipse cx="128" cy="110" rx="58" ry="64" fill="#5b3420"/>
<ellipse cx="128" cy="118" rx="47" ry="54" fill="#f0b48c"/>
<path d="M78 104 c8 -40 40 -52 66 -46 c22 6 34 22 36 44 c-20 -18 -52 -26 -102 2 Z" fill="#5b3420"/>
<ellipse cx="108" cy="120" rx="6" ry="7" fill="#2b1a12"/>
<ellipse cx="148" cy="120" rx="6" ry="7" fill="#2b1a12"/>
<circle cx="110" cy="117" r="2" fill="#fff"/><circle cx="150" cy="117" r="2" fill="#fff"/>
<path d="M98 106 q10 -6 20 -1 M138 105 q10 -5 20 1" stroke="#4a2a1a" stroke-width="3" fill="none" stroke-linecap="round"/>
<ellipse cx="96" cy="140" rx="9" ry="6" fill="#ec8d7a" opacity=".55"/>
<ellipse cx="160" cy="140" rx="9" ry="6" fill="#ec8d7a" opacity=".55"/>
<path d="M112 146 q16 14 32 0" stroke="#9a3b2a" stroke-width="4" fill="none" stroke-linecap="round"/>
<circle cx="72" cy="132" r="6" fill="#ffd166"/><circle cx="184" cy="132" r="6" fill="#ffd166"/>
</g>
</svg>
""")

# ---------------------------------------------------------------- mapa
arv = []
rnd = random.Random(3)
for _ in range(16):
    x, y = rnd.uniform(70, 270), rnd.uniform(300, 450)
    arv.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rnd.uniform(9, 15):.0f}" fill="#6fb35a"/><circle cx="{x - 3:.0f}" cy="{y - 3:.0f}" r="5" fill="#8fd17a"/>')
quarteiroes = []
for (x, y, w, h) in [(330, 40, 150, 170), (520, 40, 230, 170), (330, 290, 150, 170), (520, 290, 100, 170), (650, 290, 100, 170), (60, 40, 210, 170)]:
    quarteiroes.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="#f3efe4" stroke="#e2dccb"/>')
    for i in range(int(w // 40)):
        for j in range(2):
            quarteiroes.append(f'<rect x="{x + 10 + i * 40}" y="{y + 14 + j * 80}" width="28" height="56" rx="3" fill="#e7e0cf"/>')
grava("mapa.svg", f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500" role="img" aria-labelledby="t">
<title id="t">Mapa do bairro com a Lojinha da Ana, na Rua das Flores, perto da Praça da Árvore</title>
<rect width="800" height="500" fill="#e9eedf"/>
<path d="M-20 470 C120 430 160 500 300 475 S520 430 820 480" stroke="#9cc9ea" stroke-width="34" fill="none"/>
<path d="M-20 470 C120 430 160 500 300 475 S520 430 820 480" stroke="#bfe0f5" stroke-width="10" fill="none" stroke-dasharray="30 40"/>
{''.join(quarteiroes)}
<rect x="60" y="290" width="210" height="170" rx="10" fill="#bfe0a6" stroke="#9cc98a"/>
{''.join(arv)}
<circle cx="165" cy="375" r="22" fill="#d7ecf8" stroke="#9cc9ea" stroke-width="3"/>
<g stroke="#ffffff" stroke-linecap="round">
<path d="M0 250 H800" stroke-width="34"/><path d="M300 0 V500" stroke-width="26"/><path d="M500 0 V470" stroke-width="22"/>
</g>
<g stroke="#d9d2bf" stroke-width="2" stroke-dasharray="14 12"><path d="M0 250 H800"/><path d="M300 0 V500"/></g>
<g font-family="{FONTE}" fill="#5f5f5a">
<text x="560" y="243" font-size="16" font-weight="700">Av. Central</text>
<text x="292" y="150" font-size="15" font-weight="700" transform="rotate(-90 292 150)" text-anchor="middle">Rua das Flores</text>
<text x="493" y="80" font-size="15" font-weight="700" transform="rotate(-90 493 80)" text-anchor="middle">Rua do Sol</text>
<text x="165" y="320" font-size="15" font-weight="700" text-anchor="middle" fill="#3f7a35">Praça da Árvore</text>
<text x="700" y="488" font-size="14" font-style="italic" fill="#3f7fb0">Rio Azul</text>
</g>
<g transform="translate(330 196)">
<ellipse cx="0" cy="40" rx="12" ry="4" fill="#000" opacity=".2"/>
<path d="M0 40 C-6 26 -22 14 -22 -2 A22 22 0 0 1 22 -2 C22 14 6 26 0 40 Z" fill="#c7401f" stroke="#9a2f14" stroke-width="2"/>
<circle cx="0" cy="-2" r="8" fill="#fff"/>
</g>
<g transform="translate(352 140)">
<rect width="150" height="34" rx="8" fill="#fff" stroke="#c7401f" stroke-width="2"/>
<text x="75" y="23" font-family="{FONTE}" font-size="16" font-weight="900" fill="#c7401f" text-anchor="middle">Lojinha da Ana</text>
</g>
<g transform="translate(740 60)" font-family="{FONTE}">
<circle r="24" fill="#fff" stroke="#c9c2ae" stroke-width="2"/>
<path d="M0 -18 L7 4 L0 0 L-7 4 Z" fill="#c7401f"/><path d="M0 18 L7 -4 L0 0 L-7 -4 Z" fill="#9b9b94"/>
<text y="-28" font-size="13" font-weight="700" text-anchor="middle" fill="#5f5f5a">N</text>
</g>
<g transform="translate(40 30)" font-family="{FONTE}" font-size="12" fill="#5f5f5a">
<path d="M0 0 h80" stroke="#5f5f5a" stroke-width="3"/><path d="M0 -5 v10 M80 -5 v10" stroke="#5f5f5a" stroke-width="2"/>
<text x="40" y="-8" text-anchor="middle">100 m</text>
</g>
</svg>
""")

# ---------------------------------------------------------------- favicon
grava("favicon.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
<rect width="64" height="64" rx="14" fill="#c7401f"/>
<rect x="13" y="30" width="38" height="20" rx="4" fill="#fff7ef"/>
<rect x="13" y="38" width="38" height="4" fill="#f4a558"/>
<path d="M13 32 q4 6 8 0 q4 6 8 0 q4 6 8 0 q4 6 7 0 q4 6 7 0 v-4 h-38 Z" fill="#5a2c1a"/>
<rect x="30" y="14" width="4" height="13" rx="2" fill="#ffd166"/>
<path d="M32 6 q5 5 0 9 q-5 -4 0 -9 Z" fill="#ffd166"/>
</svg>
""")

# ---------------------------------------------------------------- quadros do vídeo (640x360, 15 q/s, 6 s)
if quadros:
    os.makedirs(quadros, exist_ok=True)
    FPS, SEG = 15, 6

    def cena(t):
        k = t % 2 / 2  # 0..1 dentro da cena
        fundo = '<rect width="800" height="600" fill="url(#fundo)"/><rect y="455" width="800" height="145" fill="url(#mesa)"/><rect y="455" width="800" height="7" fill="#d69a6c"/>'
        if t < 2:  # misturar
            a = k * 2 * math.pi * 2
            colher_x, colher_y = 400 + math.cos(a) * 90, 330 + math.sin(a) * 22
            cair = []
            for i, (x0, d) in enumerate([(330, 0), (420, .3), (470, .6)]):
                y = -40 + ((k + d) % 1) * 360
                if y < 330:
                    cair.append(f'<g transform="translate({x0} {y:.0f}) rotate({(k * 360 + i * 90) % 360:.0f})"><circle r="13" fill="#f28c28" stroke="#c96a16" stroke-width="2"/><circle r="5" fill="#f7b267"/></g>')
            return fundo + ''.join(cair) + f'''
<ellipse cx="400" cy="440" rx="200" ry="26" fill="#4a2410" opacity=".3" filter="url(#desfoque)"/>
<path d="M200 320 Q210 450 400 450 Q590 450 600 320 Z" fill="#7fb8d6" stroke="#4f8fb0" stroke-width="4"/>
<ellipse cx="400" cy="320" rx="200" ry="40" fill="#f6b56f"/>
<ellipse cx="400" cy="320" rx="200" ry="40" fill="none" stroke="#4f8fb0" stroke-width="6"/>
<path d="M{colher_x:.0f} {colher_y:.0f} L{colher_x + 60:.0f} {colher_y - 170:.0f}" stroke="#a46a3f" stroke-width="14" stroke-linecap="round"/>
<ellipse cx="{colher_x:.0f}" cy="{colher_y:.0f}" rx="22" ry="12" fill="#a46a3f"/>'''
        if t < 4:  # forno
            brilho = .55 + .35 * math.sin(k * 2 * math.pi * 3)
            ang = k * 360
            return fundo + f'''<g transform="translate(0 14)">
<rect x="190" y="120" width="420" height="340" rx="22" fill="#d7dbe0" stroke="#9aa2ab" stroke-width="5"/>
<rect x="190" y="120" width="420" height="60" rx="22" fill="#b9c0c8"/>
<circle cx="250" cy="150" r="16" fill="#fff" stroke="#6b737c" stroke-width="3"/><circle cx="300" cy="150" r="16" fill="#fff" stroke="#6b737c" stroke-width="3"/>
<g transform="translate(540 150)"><circle r="20" fill="#fff" stroke="#6b737c" stroke-width="3"/><path d="M0 0 L0 -15" stroke="#c7401f" stroke-width="4" stroke-linecap="round" transform="rotate({ang:.0f})"/></g>
<rect x="230" y="210" width="340" height="210" rx="14" fill="#2b2b30"/>
<rect x="245" y="225" width="310" height="180" rx="10" fill="#ff8a3d" opacity="{brilho:.2f}"/>
<rect x="300" y="330" width="200" height="60" rx="8" fill="#e98a3a"/>
<path d="M260 395 h280" stroke="#888" stroke-width="5"/></g>'''
        # cobertura
        return fundo + bolo_corpo(gota=min(1, .15 + k * 1.1), semente=7)

    for n in range(FPS * SEG):
        t = n / FPS
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="80 128 640 360" width="640" height="360">{bolo_defs()}{cena(t)}</svg>'
        with open(os.path.join(quadros, f"q{n:03d}.svg"), "w") as f:
            f.write(svg)
