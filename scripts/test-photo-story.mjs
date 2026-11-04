// Focused check for the Magic Story PHOTO+DRAWING pipeline gates.
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

const { PHOTO_LOCATIONS, cleanFoundThings, validPhotoStory, fallbackPhotoStory } = loadTs('../src/data/photoStory.ts');

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
check('max param caps at 3 for drawings', cleanFoundThings([
  { fa: 'توپ', en: 'ball', look: 'small red ball' },
  { fa: 'لیوان', en: 'cup', look: 'blue cup' },
  { fa: 'گیاه', en: 'plant', look: 'green plant' },
  { fa: 'کتاب', en: 'book', look: 'red book' },
], 3)?.length === 3);
check('null when nothing usable', cleanFoundThings([{ fa: 'دختر', en: 'girl', look: 'little girl' }]) === null);
check('null on non-array', cleanFoundThings('nope') === null);

// STEP 4 gate (4 pages, per-page cast, full coverage, cast-only)
const loc = PHOTO_LOCATIONS[0];
const names = ['نلی', 'توپ', 'لیوان'];
const page = (i, cast) => ({ text: 'نلی و توپ قرمز با هم بازی کردن امروز', scene: 'Two friends play with a red ball, page ' + i, cast });
const good = {
  title: 'نلی و توپ',
  location: loc.en,
  pages: [page(1, ['نلی', 'توپ']), page(2, ['نلی', 'لیوان']), page(3, ['نلی', 'توپ']), page(4, ['لیوان', 'توپ'])],
};
check('accepts a clean 4-page story with full cast coverage', validPhotoStory(good, loc, names)?.pages.length === 4);
check('rejects 3 pages', validPhotoStory({ ...good, pages: good.pages.slice(0, 3) }, loc, names) === null);
check('rejects 5 pages', validPhotoStory({ ...good, pages: [...good.pages, page(5, ['نلی'])] }, loc, names) === null);
check('rejects wrong location', validPhotoStory(good, PHOTO_LOCATIONS[1], names) === null);
check('rejects banned word', validPhotoStory({ ...good, pages: good.pages.map((p, i) => i === 2 ? { ...p, text: 'نلی از تاریک ترسید و گریه کرد' } : p) }, loc, names) === null);
check('rejects a page over 14 words', validPhotoStory({ ...good, pages: good.pages.map((p, i) => i === 0 ? { ...p, text: Array(15).fill('توپ').join(' ') } : p) }, loc, names) === null);
check('rejects a non-cast name', validPhotoStory({ ...good, pages: good.pages.map((p, i) => i === 0 ? { ...p, cast: ['نلی', 'هیولا'] } : p) }, loc, names) === null);
check('rejects missing coverage', validPhotoStory({ ...good, pages: good.pages.map(p => ({ ...p, cast: ['نلی', 'توپ'] })) }, loc, names) === null);

// Fallbacks: only cast members, 4 pages, every member covered, gate passes
let fallbacksOk = true;
for (let salt = 0; salt < 5; salt++) {
  const fb = fallbackPhotoStory({ buddy: 'نلی', items: ['توپ', 'لیوان', 'گیاه'], place: 'باغ' }, salt);
  const castNames = ['نلی', 'توپ', 'لیوان', 'گیاه'];
  if (!validPhotoStory({ title: fb.title, location: 'garden', pages: fb.pages }, PHOTO_LOCATIONS[0], castNames)) fallbacksOk = false;
}
check('all 5 fallbacks pass the gate', fallbacksOk);

if (failures) { console.error(failures + ' check(s) failed'); process.exit(1); }
console.log('All photo-story gate checks passed.');
