const assert = require('assert');
global.Syllables = require('../assets/syllables.js');
const Rhymes = require('../assets/rhymes.js');

const rhyming = [
    ['moon', 'tune'], ['night', 'bite'], ['light', 'white'], ['day', 'away'], ['rain', 'plane'], ['rain', 'again'],
    ['tree', 'sea'], ['me', 'free'], ['blue', 'through'], ['you', 'too'], ['go', 'slow'], ['know', 'though'],
    ['heart', 'start'], ['fire', 'desire'], ['days', 'praise'], ['face', 'place'], ['cat', 'hat'], ['sky', 'fly'],
    ['my', 'high'], ['eyes', 'skies'], ['love', 'above'], ['song', 'long'], ['cold', 'old'], ['fall', 'call'],
    ['soul', 'whole'], ['ground', 'sound'], ['dream', 'seem'], ['sleep', 'deep'], ['stone', 'alone'], ['home', 'foam'],
    ['bed', 'head'], ['mind', 'kind'], ['wings', 'sings'], ['light', 'tonight'], ['true', 'new'], ['rose', 'knows'],
    ['door', 'more'], ['hollow', 'follow'], ['grace', 'space'], ['time', 'rhyme'], ['air', 'care'], ['fear', 'here']
];
const notRhyming = [
    ['moon', 'rain'], ['night', 'day'], ['face', 'days'], ['love', 'move'], ['tree', 'try'], ['cat', 'cut'],
    ['go', 'now'], ['heart', 'hurt'], ['sun', 'soon'], ['bed', 'bad'], ['song', 'sing'], ['blue', 'glow'],
    ['sleep', 'slip'], ['home', 'come'], ['fire', 'far'], ['cold', 'could']
];

for (const [a, b] of rhyming) assert.strictEqual(Rhymes.rhymeKey(a), Rhymes.rhymeKey(b), a + ' should rhyme with ' + b);
for (const [a, b] of notRhyming) assert.notStrictEqual(Rhymes.rhymeKey(a), Rhymes.rhymeKey(b), a + ' should not rhyme with ' + b);

assert.strictEqual(Rhymes.rhymeKey("Moon's"), Rhymes.rhymeKey('moons'));
assert.strictEqual(Rhymes.rhymeKey('Night,'), Rhymes.rhymeKey('night'));
assert.strictEqual(Rhymes.rhymeKey(''), '');
assert.strictEqual(typeof Rhymes.rhymeKey('constructor'), 'string');
assert.strictEqual(Rhymes.rhymeKey('constructors'), Rhymes.rhymeKey('instructors'));

const poem = 'The kettle hums a borrowed tune,\nthe streetlight learns the shape of rain,\nand somewhere past the sleeping moon\nthe morning starts its train again.\n\nOne line alone\nand nothing more';
const result = Rhymes.scheme(poem);
assert.strictEqual(result.summary, 'ABAB CD');
assert.strictEqual(result.lines[4], null, 'blank lines have no letter');
assert.ok(result.lines[0].rhymes && result.lines[1].rhymes);
assert.ok(!result.lines[5].rhymes && !result.lines[6].rhymes);
assert.strictEqual(result.groups, 2);
assert.strictEqual(Rhymes.scheme('').summary, '');
assert.strictEqual(Rhymes.scheme('a\n\n\nb').summary, 'A B');

console.log('rhymes.test.js: all tests passed');
