#!/usr/bin/env bash
# gerar.sh — gera toda a mídia de exemplo do Guia HTML em assets/midia/ (na VPS).
# Tudo é desenhado aqui (SVG à mão, sons e vídeo sintetizados): nada de fotos de terceiros.
# Precisa de: python3, rsvg-convert, ImageMagick (convert), cwebp, avifenc, ffmpeg, node + puppeteer-core (para o PDF).
# Uso: tools/midia/gerar.sh
set -euo pipefail
AQUI=$(cd "$(dirname "$0")" && pwd)
RAIZ=$(cd "$AQUI/../.." && pwd)
M="$RAIZ/assets/midia"
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
mkdir -p "$M"

python3 "$AQUI/svgs.py" "$M" "$T/quadros"

png() { rsvg-convert -w "$2" "$M/$1.svg" -o "$3"; }        # svg largura saída.png
jpg() { convert "$1" -background white -flatten -strip -sampling-factor 4:2:0 -interlace JPEG -quality "${3:-82}" "$2"; }
webp() { cwebp -quiet -q "${3:-80}" -metadata none "$1" -o "$2"; }
avif() { avifenc -q "${3:-55}" -s 6 -j 4 "$1" "$2" >/dev/null; }

# bolo: 400/800/1200 em JPG, WebP e AVIF; 800 em PNG (para comparar o peso); recorte quadrado
for w in 400 800 1200; do
  png bolo "$w" "$T/bolo-$w.png"
  jpg "$T/bolo-$w.png" "$M/bolo-$w.jpg"
  webp "$T/bolo-$w.png" "$M/bolo-$w.webp"
  avif "$T/bolo-$w.png" "$M/bolo-$w.avif"
done
convert "$T/bolo-800.png" -strip "$M/bolo-800.png"
for w in 400 800; do
  png bolo-quadrado "$w" "$T/bq-$w.png"
  jpg "$T/bq-$w.png" "$M/bolo-quadrado-$w.jpg"
  webp "$T/bq-$w.png" "$M/bolo-quadrado-$w.webp"
done

# logo (fundo transparente): 200 e 400 (1x e 2x) em PNG e WebP
for w in 200 400; do
  png logo-lojinha "$w" "$T/logo-$w.png"
  convert "$T/logo-$w.png" -strip "$M/logo-lojinha-$w.png"
  webp "$T/logo-$w.png" "$M/logo-lojinha-$w.webp"
done

# avatar: 96 e 192 em PNG, JPG e WebP
for w in 96 192; do
  png avatar-ana "$w" "$T/av-$w.png"
  convert "$T/av-$w.png" -strip "$M/avatar-ana-$w.png"
  jpg "$T/av-$w.png" "$M/avatar-ana-$w.jpg" 85
  webp "$T/av-$w.png" "$M/avatar-ana-$w.webp"
done

# mapa: 400 e 800 em PNG e WebP
for w in 400 800; do
  png mapa "$w" "$T/mapa-$w.png"
  convert "$T/mapa-$w.png" -strip -colors 64 "$M/mapa-$w.png"
  webp "$T/mapa-$w.png" "$M/mapa-$w.webp"
done

# favicon: .ico (16, 32, 48), PNG 32, apple-touch-icon 180
for w in 16 32 48 180; do png favicon "$w" "$T/fav-$w.png"; done
convert "$T/fav-16.png" "$T/fav-32.png" "$T/fav-48.png" "$M/favicon.ico"
convert "$T/fav-32.png" -strip "$M/favicon-32.png"
convert "$T/fav-180.png" -strip "$M/apple-touch-icon.png"

# áudio: campainha "dim-dom" (2,2 s) em OGG (Vorbis) e MP3
ffmpeg -loglevel error -y -f lavfi -i "aevalsrc='0.45*sin(2*PI*659.25*t)*exp(-3.5*t)*lt(t,0.9)+0.45*sin(2*PI*523.25*(t-0.9))*exp(-3*(t-0.9))*gte(t,0.9)+0.12*sin(2*PI*1318.5*t)*exp(-6*t)*lt(t,0.9)':s=44100:d=2.2" -ac 1 "$T/campainha.wav"
ffmpeg -loglevel error -y -i "$T/campainha.wav" -c:a libvorbis -q:a 3 "$M/campainha.ogg"
ffmpeg -loglevel error -y -i "$T/campainha.wav" -c:a libmp3lame -b:a 64k "$M/campainha.mp3"

# vídeo: 6 s, 640x360, 15 quadros/s, sem som; WebM (VP9) e MP4 (H.264); capa (poster) em JPG
for f in "$T"/quadros/q*.svg; do rsvg-convert "$f" -o "${f%.svg}.png"; done
ffmpeg -loglevel error -y -framerate 15 -i "$T/quadros/q%03d.png" -c:v libvpx-vp9 -b:v 0 -crf 42 -row-mt 1 -pix_fmt yuv420p -an "$M/video-bolo.webm"
ffmpeg -loglevel error -y -framerate 15 -i "$T/quadros/q%03d.png" -c:v libx264 -preset slow -crf 30 -pix_fmt yuv420p -movflags +faststart -an "$M/video-bolo.mp4"
jpg "$T/quadros/q089.png" "$M/video-bolo-poster.jpg" 80

# legendas em português (WebVTT)
cat > "$M/video-bolo.vtt" <<'VTT'
WEBVTT

1
00:00:00.000 --> 00:00:02.000
Primeiro, a Ana mistura a cenoura,
os ovos e o açúcar.

2
00:00:02.000 --> 00:00:04.000
Depois, o bolo assa no forno
por 40 minutos.

3
00:00:04.000 --> 00:00:06.000
Por fim, ela cobre o bolo
com chocolate. Pronto!
VTT

# PDF pequeno (para o atributo download): a receita do bolo, impressa pelo Chromium
node "$AQUI/pdf.js" "$M/receita-bolo.pdf"

echo "mídia gerada em $M:"
( cd "$M" && ls -l --block-size=1 | awk 'NR>1 {print $5, $9}' )
du -sh "$M"
