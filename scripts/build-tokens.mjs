// Compiles src/design/tokens.json into src/design/tokens.css (the design system's
// documented tokens.css shape). Run via `npm run tokens`.
import { readFileSync, writeFileSync } from 'node:fs';

const tokens = JSON.parse(readFileSync('src/design/tokens.json', 'utf8'));
const themes = tokens.color.themes.map((t) => t.id);
const first = themes[0];

const ref = (v) => {
  const m = /^\{(.+)\}$/.exec(v);
  return m ? `var(--${m[1]})` : v;
};
const valueFor = (value, theme) => (typeof value === 'string' ? (theme === first ? value : undefined) : value[theme]);

const decls = (list, theme) =>
  list
    .map((t) => [t.name, valueFor(t.value, theme)])
    .filter(([, v]) => v !== undefined)
    .map(([n, v]) => `  --${n}: ${ref(v)};`)
    .join('\n');

const themed = [...tokens.color.tokens, ...(tokens.shadow?.tokens ?? [])];
const plain = (fam) => fam.tokens.map((t) => `  --${t.name}: ${t.value};`).join('\n');

const fonts = Object.entries(tokens.type.families)
  .map(([k, v]) => `  --font-${k}: ${v};`)
  .join('\n');

const px = (v) => v;
const styles = tokens.type.groups
  .flatMap((g) => g.styles.map((s) => ({ ...s, family: s.family ?? g.family })))
  .map((s) => {
    const rules = [
      `font-family: var(--font-${s.family})`,
      `font-size: ${px(s.fontSize)}`,
      `line-height: ${px(s.lineHeight)}`,
      `font-weight: ${s.fontWeight}`,
    ];
    if (s.fontStyle) rules.push(`font-style: ${s.fontStyle}`);
    if (s.letterSpacing) rules.push(`letter-spacing: ${s.letterSpacing}`);
    return `.${s.name} { ${rules.join('; ')}; }`;
  })
  .join('\n');

const css = [
  '/* Nimble — generated from tokens.json by scripts/build-tokens.mjs. Do not edit. */',
  `:root, [data-theme="${first}"] {\n${decls(themed, first)}\n}`,
  ...themes.slice(1).map((t) => `[data-theme="${t}"] {\n${decls(themed, t)}\n}`),
  `:root {\n${plain(tokens.spacing)}\n${plain(tokens.radius)}\n${fonts}\n}`,
  styles,
  '',
].join('\n');

writeFileSync('src/design/tokens.css', css);
console.log(`tokens.css: ${css.split('\n').length} lines`);
