// Focused check for the Magic Story PHOTO pipeline gates (STEP 1 + 4).
// No test framework ships with this repo, so this uses the already-present
// TypeScript compiler to load the pure data module in Node:
//   node scripts/test-photo-story.mjs
import fs from 'node:fs';
import ts from 'typescript';

function loadTs(rel) {
  const src = fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  const localRequire = (p) => {
    if (p.endsWith('magicStory')) return loadTs('../src/data/magicStory.ts');
    throw new Error('unexpected require ' + p);
  };
  new Function('require', 'module', 'exports', js)(localRequire, mod, mod.exports);
  return mod.exports;
}

const { PHOTO_LOCATIONS, cleanFoundThings, validPhotoStory } = loadTs('../src/data/photoStory.ts');

let failures = 0;
const check = (name, cond) => { console.log((cond ? 'PASS ' : 'FAIL ') + name); if (!cond) failures++; };

// STEP 1 gate
const things = cleanFoundThings([
  { fa: 'توپ', en: 'ball', look: 'small red and white striped ball' },
  { fa: 'توپ', en: 'ball', look: 'small red and white striped ball' },
  { fa: 'دختر', en: 'girl', look: 'little girl with brown hair' },
  { fa: 'هیولا', en: 'monster toy', look: 'green monster toy' },
  { fa: 'لیوان', en: 'cup', look: 'blue cup with dots' },
  { fa: 'گیاه', en: 'plant', look: 'green plant in a brown pot' },
  { fa: 'چراغ', en: 'lamp', look: 'yellow lamp on the table' },
  { fa: 'کتاب', en: 'book', look: 'red book with a star' },
]);
check('caps at 4, dedupes, drops people and banned', Array.isArray(things) && things.length === 4 && things[0].en === 'ball');
check('null when nothing usable', cleanFoundThings([{ fa: 'دختر', en: 'girl', look: 'little girl' }]) === null);
check('null on non-array', cleanFoundThings('nope') === null);

// STEP 4 gate
const loc = PHOTO_LOCATIONS[0];
const page = (i) => ({ text: 'نلی و توپ قرمز با هم بازی کردن امروز', scene: 'Two friends play with a red ball in a garden, page ' + i });
const good = { title: 'نلی و توپ', location: loc.en, pages: [1, 2, 3, 4, 5, 6].map(page) };
check('accepts a clean 6-page story', validPhotoStory(good, loc)?.pages.length === 6);
check('rejects 5 pages', validPhotoStory({ ...good, pages: good.pages.slice(0, 5) }, loc) === null);
check('rejects wrong location', validPhotoStory(good, PHOTO_LOCATIONS[1]) === null);
check('rejects banned word', validPhotoStory({ ...good, pages: good.pages.map((p, i) => i === 2 ? { ...p, text: 'نلی از تاریک ترسید و گریه کرد' } : p) }, loc) === null);
check('rejects a page over 14 words', validPhotoStory({ ...good, pages: good.pages.map((p, i) => i === 0 ? { ...p, text: Array(15).fill('توپ').join(' ') } : p) }, loc) === null);

if (failures) { console.error(failures + ' check(s) failed'); process.exit(1); }
console.log('All photo-story gate checks passed.');
