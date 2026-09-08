// Empaqueta el juego en UN solo archivo HTML (sin módulos ES) para poder
// abrirlo con doble clic, mandarlo por WhatsApp o publicarlo donde sea.
//   node scripts/bundle.mjs            → dist/monitos-azotea.html
//   node scripts/bundle.mjs --fragment → imprime sólo el contenido (sin <html>)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

// Orden de dependencias: cada módulo sólo importa de los anteriores.
const MODULES = [
  'src/core/config.js', 'src/core/world.js', 'src/render/monito.js', 'src/render/effects.js',
  'src/render/scene.js', 'src/bot.js', 'src/touch.js', 'src/game.js',
];

let js = '';
for (const file of MODULES) {
  let code = read(file);
  const exports = [...code.matchAll(/^export\s+(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  code = code.replace(/^import\s[^;]*;\s*$/gm, '').replace(/^export\s+/gm, '');
  js += `\n// ---- ${file} ----\nconst { ${exports.join(', ')} } = (() => {\n${code}\nreturn { ${exports.join(', ')} };\n})();\n`;
}

const html = read('index.html');
const style = html.match(/<style>([\s\S]*?)<\/style>/)[1];
const body = html.match(/<body>([\s\S]*?)<script type="module">/)[1];
const boot = `window.game = new Game(document.getElementById('game'), {
    menu: document.getElementById('menu'), over: document.getElementById('over'),
    winner: document.getElementById('winner'), touch: document.getElementById('touch'),
  });`;

const fragment = `<title>Monitos en la Azotea</title>
<style>${style}</style>
${body.trim()}
<script>
'use strict';
${js}
${boot}
</script>
`;

if (process.argv.includes('--fragment')) {
  process.stdout.write(fragment);
} else {
  const full = `<!DOCTYPE html>
<html lang="es-MX">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#1d1a24">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<title>Monitos en la Azotea</title>
<style>${style}</style>
</head>
<body>
${body.trim()}
<script>
'use strict';
${js}
${boot}
</script>
</body>
</html>
`;
  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, 'dist/monitos-azotea.html'), full);
  console.log('dist/monitos-azotea.html', full.length, 'bytes');
}
