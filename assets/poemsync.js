(function (global) {
    'use strict';

    function normalise(list) {
        if (!Array.isArray(list)) return [];
        return list.filter(function (p) { return p && typeof p.id === 'string'; }).map(function (p) {
            return { id: p.id, title: String(p.title || ''), content: String(p.content || ''), updated: p.updated || Date.now(), hasMedia: !!p.hasMedia };
        });
    }

    function fingerprint(poem) {
        return JSON.stringify([poem.id, poem.title, poem.content, poem.updated, poem.hasMedia]);
    }

    function byId(list) {
        var map = {};
        list.forEach(function (p) { map[p.id] = p; });
        return map;
    }

    function changedSince(poem, baseMap) {
        var before = baseMap[poem.id];
        return !before || fingerprint(before) !== fingerprint(poem);
    }

    function pickVersion(local, stored, baseMap) {
        var localChanged = changedSince(local, baseMap);
        var storedChanged = changedSince(stored, baseMap);
        if (localChanged && storedChanged) return stored.updated > local.updated ? stored : local;
        return localChanged ? local : stored;
    }

    function merge(stored, local, base) {
        var storedMap = byId(stored);
        var localMap = byId(local);
        var baseMap = byId(base);
        var addedElsewhere = stored.filter(function (p) { return !localMap[p.id] && !baseMap[p.id]; });
        var kept = [];
        local.forEach(function (poem) {
            var other = storedMap[poem.id];
            if (other) { kept.push(pickVersion(poem, other, baseMap)); return; }
            var deletedElsewhere = baseMap[poem.id] && !changedSince(poem, baseMap);
            if (!deletedElsewhere) kept.push(poem);
        });
        return addedElsewhere.concat(kept);
    }

    function same(a, b) {
        return a.length === b.length && a.every(function (p, i) { return fingerprint(p) === fingerprint(b[i]); });
    }

    var api = { normalise: normalise, merge: merge, same: same };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    global.PoemSync = api;
})(typeof window !== 'undefined' ? window : globalThis);
