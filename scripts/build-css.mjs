// Compiles the SCSS sources to plain CSS:
//   dist/index.css             base styles + "default-light" theme (the default theme)
//   dist/themes/<theme>.css    one file per theme (to import in addition to index.css)
//   dist/themes/all.css        every theme
//   dist/scss/**               SCSS sources, to customise variables
import { compile } from 'sass';
import { cpSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const styleDir = join(root, 'src', 'style');
const dist = join(root, 'dist');
const sassOptions = {
  style: 'expanded',
  silenceDeprecations: ['import', 'global-builtin', 'color-functions'],
};

mkdirSync(join(dist, 'themes'), { recursive: true });

writeFileSync(
  join(dist, 'index.css'),
  compile(join(styleDir, 'index.scss'), sassOptions).css + '\n'
);

const themes = readdirSync(join(styleDir, 'theme'), { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort();

let all = '';
for (const theme of themes) {
  const css = compile(join(styleDir, 'theme', theme, 'index.scss'), sassOptions).css;
  writeFileSync(join(dist, 'themes', `${theme}.css`), css + '\n');
  all += `/* theme: ${theme} */\n${css}\n`;
}
writeFileSync(join(dist, 'themes', 'all.css'), all);

cpSync(styleDir, join(dist, 'scss'), { recursive: true });

console.log(`CSS built: index.css + ${themes.length} themes (${themes.join(', ')})`);
