const assert = require('assert');
const PoemSync = require('../assets/poemsync.js');

const poem = (id, content, updated) => ({ id: id, title: '', content: content, updated: updated || 1, hasMedia: false });
const contents = list => list.map(p => p.content);

const base = [poem('a', 'first')];

assert.deepStrictEqual(contents(PoemSync.merge([poem('b', 'from other tab', 2), poem('a', 'first')], [poem('a', 'first')], base)),
    ['from other tab', 'first'], 'a poem added in another tab survives this tab saving');

assert.deepStrictEqual(contents(PoemSync.merge([poem('a', 'first')], [poem('c', 'mine', 3), poem('a', 'first')], base)),
    ['mine', 'first'], 'a poem added in this tab is kept');

assert.deepStrictEqual(contents(PoemSync.merge([poem('a', 'edited elsewhere', 2)], [poem('a', 'first')], base)),
    ['edited elsewhere'], 'an edit from another tab replaces an unchanged local copy');

assert.deepStrictEqual(contents(PoemSync.merge([poem('a', 'first')], [poem('a', 'edited here', 2)], base)),
    ['edited here'], 'an unsaved local edit is kept');

assert.deepStrictEqual(contents(PoemSync.merge([poem('a', 'older edit', 2)], [poem('a', 'newer edit', 3)], base)),
    ['newer edit'], 'when both tabs edited a poem the newer edit wins');

assert.deepStrictEqual(contents(PoemSync.merge([], [poem('a', 'first')], base)),
    [], 'a poem deleted in another tab is not brought back');

assert.deepStrictEqual(contents(PoemSync.merge([poem('a', 'first')], [], base)),
    [], 'a poem deleted in this tab stays deleted');

assert.deepStrictEqual(contents(PoemSync.merge([], [poem('a', 'edited here', 2)], base)),
    ['edited here'], 'a poem deleted elsewhere but edited here is kept');

assert.strictEqual(PoemSync.same([poem('a', 'x')], [poem('a', 'x')]), true);
assert.strictEqual(PoemSync.same([poem('a', 'x')], [poem('a', 'y')]), false);

assert.deepStrictEqual(PoemSync.normalise([null, { id: 3 }, { id: 'ok', title: 7, content: null, updated: 5, hasMedia: 1 }]),
    [{ id: 'ok', title: '7', content: '', updated: 5, hasMedia: true }]);
assert.deepStrictEqual(PoemSync.normalise({ not: 'a list' }), []);

console.log('poemsync.test.js: all tests passed');
