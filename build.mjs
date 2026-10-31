/* Сборка одного index.html из исходников в src/ */
import { readFileSync, writeFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, 'src');

const tpl = readFileSync(join(src, 'index.template.html'), 'utf8');
const css = readFileSync(join(src, 'style.css'), 'utf8') + '\n' + readFileSync(join(src, 'theme.css'), 'utf8');

const jsFiles = ['data.js', 'engine.js', 'ai.js', 'ui.js', 'flows.js'];
const js = jsFiles.map(f => {
  const code = readFileSync(join(src, f), 'utf8');
  return '\n/* ===== ' + f + ' ===== */\n' + code;
}).join('\n');

const out = tpl.replace('<!--STYLE-->', () => css).replace('<!--SCRIPTS-->', () => js);
const dest = join(here, 'index.html');
writeFileSync(dest, out, 'utf8');
const kb = (statSync(dest).size / 1024).toFixed(1);
console.log('index.html собран: ' + kb + ' КБ');
