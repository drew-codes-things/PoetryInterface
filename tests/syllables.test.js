const assert = require('assert');
const S = require('../assets/syllables.js');

const expected = {
    cat: 1, the: 1, water: 2, poetry: 3, beautiful: 3, table: 2, little: 2, moonlight: 2,
    whispered: 2, silence: 2, remember: 3, yesterday: 3, rose: 1, roses: 2, fire: 1, quiet: 2,
    makes: 1, loves: 1, wanted: 2, actual: 3, piano: 3, diet: 2, heart: 1, darkness: 2,
    morning: 2, forgotten: 3, together: 3, shadow: 2, river: 2, lonely: 2, broken: 2
};
const misses = Object.entries(expected).filter(([word, count]) => S.estimate(word) !== count);
assert.ok(misses.length <= 2, 'estimates are exact for nearly every common word, missed: ' + misses.map(([w, c]) => w + '=' + S.estimate(w) + ' (want ' + c + ')').join(', '));
assert.ok(misses.every(([word, count]) => Math.abs(S.estimate(word) - count) === 1), 'and never off by more than one');

assert.strictEqual(S.estimate(''), 0);
assert.strictEqual(S.estimate('123'), 0);
assert.deepStrictEqual(S.words("Don't  stop,\nbelievin'"), ['dont', 'stop', 'believin']);

const lines = S.lineStats('Roses are red\n\nviolets are blue', () => 1);
assert.strictEqual(lines.length, 3);
assert.deepStrictEqual(lines.map(l => l.syllables), [3, 0, 3]);
assert.strictEqual(lines[0].words, 3);

console.log('syllables.test.js: all tests passed');
