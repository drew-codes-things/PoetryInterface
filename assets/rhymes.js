(function (global) {
    'use strict';

    var clean = global.Syllables ? global.Syllables.clean : function (word) {
        return String(word || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z]/g, '');
    };

    var EXACT = {
        now: 'aU', how: 'aU', cow: 'aU', wow: 'aU', vow: 'aU', allow: 'aU', plough: 'aU', bough: 'aU', brow: 'aU',
        you: 'U', through: 'U', threw: 'U', two: 'U', do: 'U', to: 'U', too: 'U', who: 'U', shoe: 'U', into: 'U', true: 'U',
        though: 'O', although: 'O', dough: 'O', soul: 'Ol', bowl: 'Ol', roll: 'Ol', toll: 'Ol', whole: 'Ol', control: 'Ol',
        love: 'uv', glove: 'uv', above: 'uv', dove: 'uv', shove: 'uv', of: 'uv',
        come: 'um', some: 'um', become: 'um', from: 'um', done: 'un', none: 'un', one: 'un', won: 'un', sun: 'un', son: 'un',
        give: 'iv', live: 'iv', forgive: 'iv', have: 'av', gone: 'on', were: 'er', there: 'Ar', where: 'Ar', their: 'Ar',
        move: 'Uv', prove: 'Uv', lose: 'Uz', whose: 'Uz', choose: 'Uz',
        good: 'ud', hood: 'ud', wood: 'ud', stood: 'ud', could: 'ud', should: 'ud', would: 'ud', understood: 'ud',
        head: 'ed', bread: 'ed', dead: 'ed', dread: 'ed', spread: 'ed', thread: 'ed', instead: 'ed', ahead: 'ed', said: 'ed', fled: 'ed',
        heart: 'art', blood: 'ud2', flood: 'ud2', enough: 'uf', rough: 'uf', tough: 'uf',
        eye: 'Y', eyes: 'Yz', bye: 'Y', buy: 'Y', die: 'Y', lie: 'Y', tie: 'Y', pie: 'Y', lies: 'Yz', cries: 'Yz', skies: 'Yz', ties: 'Yz', dies: 'Yz',
        they: 'A', grey: 'A', gray: 'A', prey: 'A', obey: 'A', weigh: 'A', sleigh: 'A',
        are: 'ar', car: 'ar', far: 'ar', star: 'ar', war: 'Or', door: 'Or', floor: 'Or', more: 'Or', your: 'Or', four: 'Or', pour: 'Or',
        mind: 'Ynd', kind: 'Ynd', find: 'Ynd', behind: 'Ynd', blind: 'Ynd', wind: 'ind', child: 'Yld', wild: 'Yld',
        again: 'An', been: 'En', seen: 'En', friend: 'end', break: 'Ak', great: 'At', steak: 'Ak'
    };

    var LONG = { a: 'A', e: 'E', i: 'Y', o: 'O', u: 'U', y: 'Y' };
    var VOWELS = 'aeiouyAEIOUY';

    function phonetic(w) {
        var s = w;
        s = s.replace(/eigh/g, 'A').replace(/igh/g, 'Y').replace(/ough$/, 'O');
        s = s.replace(/ce$/, 'S').replace(/([aeiouy])se$/, '$1Ze').replace(/([^s])s$/, function (m, a) { return /[aeiouy]/.test(a) ? a + 'Z' : a + 'S'; });
        s = s.replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/c$/, 'k').replace(/que$/, 'k').replace(/tch/g, 'ch').replace(/dge$/, 'j').replace(/ge$/, 'j');
        s = s.replace(/([^aeiouy])\1/g, '$1');
        s = s.replace(/(^|[^aeiouy])([aeiouy])([^aeiouyAEIOUYSZ]|[SZ])e$/, function (m, pre, v, c) { return pre + LONG[v] + c; });
        s = s.replace(/ee|ea|ie(?=.)/g, 'E').replace(/ai|ay|ey$/g, 'A').replace(/oa|oe$/g, 'O').replace(/ow$/, 'O').replace(/owS$/, 'OZ').replace(/own$/, 'On');
        s = s.replace(/ue$|ew|oo|ui/g, 'U').replace(/ou/g, 'aU').replace(/oi|oy/g, 'oI').replace(/au|aw/g, 'aw');
        if (/[^aeiouyAEIOUY]y$/.test(s)) s = s.replace(/y$/, /[aeiouAEIOU]/.test(s.slice(0, -1)) ? 'E' : 'Y');
        if (/^[^aeiouy]{1,2}e$/.test(s)) s = s.replace(/e$/, 'E');
        s = s.replace(/([^aeiouyAEIOUY])o$/, '$1O');
        if (/[^aeiouyAEIOUY]e$/.test(s) && /[aeiouyAEIOUY]/.test(s.slice(0, -2))) s = s.slice(0, -1);
        return s;
    }

    function rhymeKey(word) {
        var w = clean(word);
        if (!w) return '';
        if (EXACT[w]) return EXACT[w];
        if (w.length > 3 && /s$/.test(w) && !/(ss|us|is)$/.test(w) && EXACT[w.slice(0, -1)]) return EXACT[w.slice(0, -1)] + 'z';
        var s = phonetic(w);
        var m = s.match(new RegExp('[' + VOWELS + ']+[^' + VOWELS + ']*$'));
        return m ? m[0].replace(/S$/, 's').replace(/Z$/, 'z') : s;
    }

    function letterFor(n) {
        var base = String.fromCharCode(65 + (n % 26));
        return n < 26 ? base : base + Math.floor(n / 26);
    }

    function scheme(text) {
        var lines = String(text || '').split('\n');
        var letters = {};
        var counts = {};
        var next = 0;
        var result = lines.map(function (line) {
            var parts = String(line).split(/\s+/).map(clean).filter(Boolean);
            if (!parts.length) return null;
            var key = rhymeKey(parts[parts.length - 1]);
            if (!(key in letters)) letters[key] = letterFor(next++);
            counts[key] = (counts[key] || 0) + 1;
            return { key: key, letter: letters[key], word: parts[parts.length - 1] };
        });
        result.forEach(function (r) { if (r) r.rhymes = counts[r.key] > 1; });
        var stanzas = [];
        var current = '';
        result.forEach(function (r) {
            if (!r) { if (current) stanzas.push(current); current = ''; return; }
            current += r.letter;
        });
        if (current) stanzas.push(current);
        return { lines: result, summary: stanzas.join(' '), groups: Object.keys(counts).filter(function (k) { return counts[k] > 1; }).length };
    }

    var api = { rhymeKey: rhymeKey, scheme: scheme };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    global.Rhymes = api;
})(typeof window !== 'undefined' ? window : globalThis);
