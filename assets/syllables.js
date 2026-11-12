(function (global) {
    'use strict';

    function clean(word) {
        return String(word || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z]/g, '');
    }

    var EXCEPTIONS = {
        fire: 1, hour: 1, our: 1, every: 2, business: 2, different: 3, evening: 2, poem: 2, poems: 2,
        people: 2, beautiful: 3, region: 2, ocean: 2, someone: 2, something: 2, sometimes: 2, maybe: 2,
        create: 2, idea: 3, real: 1, being: 2, area: 3, lion: 2, quiet: 2, science: 2, heaven: 2, forever: 3
    };

    function estimate(word) {
        var w = clean(word);
        if (!w) return 0;
        if (Object.prototype.hasOwnProperty.call(EXCEPTIONS, w)) return EXCEPTIONS[w];
        if (w.length <= 3) return 1;
        var stem = w.replace(/^y/, '');
        var count = (stem.match(/[aeiouy]+/g) || []).length;
        if (/[^aeiouy]e$/.test(stem) && !/[^aeiouy]le$/.test(stem)) count -= 1;
        if (/[^aeiouy]ed$/.test(stem) && !/[td]ed$/.test(stem)) count -= 1;
        if (/[^aeiouy]e(?:ly|ful|ment|ness|less)$/.test(stem)) count -= 1;
        if (/[^aeiouy]es$/.test(stem) && !/(?:s|x|z|ch|sh|ce|ge)es$/.test(stem)) count -= 1;
        count += (stem.match(/(?:ia|io|iu|eo|oe|uo)(?=[a-z])/g) || []).length;
        count += (stem.match(/(?:^|[^q])ua(?=[a-z])/g) || []).length;
        count += (stem.match(/[^q]ie(?=t)/g) || []).length;
        return Math.max(1, count);
    }

    function words(text) {
        return String(text || '').split(/\s+/).map(clean).filter(Boolean);
    }

    function lineStats(text, lookup) {
        var find = lookup || estimate;
        return String(text || '').split('\n').map(function (line) {
            var list = words(line);
            var total = 0;
            list.forEach(function (w) { total += find(w); });
            return { line: line.trim(), words: list.length, syllables: total };
        });
    }

    var api = { clean: clean, estimate: estimate, words: words, lineStats: lineStats };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    global.Syllables = api;
})(typeof window !== 'undefined' ? window : globalThis);
