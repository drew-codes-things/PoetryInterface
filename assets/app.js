(function () {
    'use strict';

    var POEMS_KEY = 'easepoet_poems';
    var LEGACY_KEY = 'easepoet_workspaces';
    var SYLLABLE_CACHE_KEY = 'easepoet_syllables';
    var DATAMUSE_SYLLABLES_KEY = 'easepoet_datamuse_syllables';
    var LEGACY_DEFAULT_TITLE = 'choose your poem name';
    var MAX_MEDIA_BYTES = 50 * 1024 * 1024;
    var DATAMUSE = 'https://api.datamuse.com/words';
    var DICTIONARY = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

    var poemsBox = document.getElementById('poems');
    var countEl = document.getElementById('poemCount');
    var lookupInput = document.getElementById('lookupInput');
    var lookupResult = document.getElementById('lookupResult');
    var rhymeInput = document.getElementById('rhymeInput');
    var rhymeResult = document.getElementById('rhymeResult');
    var printArea = document.getElementById('printArea');
    var datamuseToggle = document.getElementById('datamuseSyllables');

    var poems = loadPoems();
    var syncedPoems = snapshot(poems);
    var activeId = poems.length ? poems[0].id : null;
    var activeCaret = null;
    var syllableCache = ui.get(SYLLABLE_CACHE_KEY, {});
    if (!syllableCache || typeof syllableCache !== 'object') syllableCache = {};
    var pendingWords = {};
    var askDatamuse = ui.get(DATAMUSE_SYLLABLES_KEY, false) === true;

    function newId() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

    function loadPoems() {
        var saved = ui.get(POEMS_KEY, null);
        if (Array.isArray(saved)) return PoemSync.normalise(saved);
        var legacy = ui.get(LEGACY_KEY, null);
        if (Array.isArray(legacy) && legacy.length) {
            var migrated = legacy.map(function (item) {
                var title = String((item && item.title) || '');
                if (title.trim().toLowerCase() === LEGACY_DEFAULT_TITLE) title = '';
                return { id: newId(), title: title, content: String((item && item.content) || ''), updated: Date.now(), hasMedia: false };
            });
            ui.set(POEMS_KEY, migrated);
            return migrated;
        }
        return [];
    }

    function snapshot(list) {
        return list.map(function (p) { return Object.assign({}, p); });
    }

    function readStoredPoems() {
        return PoemSync.normalise(ui.get(POEMS_KEY, []));
    }

    var saveTimer = null;
    function savePoems(now) {
        clearTimeout(saveTimer);
        var write = function () {
            var merged = PoemSync.merge(readStoredPoems(), poems, syncedPoems);
            if (!ui.set(POEMS_KEY, merged)) {
                ui.toast('Your browser would not save. Download your poems so nothing is lost.');
                return;
            }
            syncedPoems = snapshot(merged);
            adoptPoems(merged);
        };
        if (now) write(); else saveTimer = setTimeout(write, 400);
    }

    function hasUnsavedEdits() {
        return !PoemSync.same(poems, syncedPoems);
    }

    window.addEventListener('beforeunload', function () { if (hasUnsavedEdits()) savePoems(true); });

    window.addEventListener('storage', function (event) {
        if (event.key !== POEMS_KEY) return;
        var stored = readStoredPoems();
        var merged = PoemSync.merge(stored, poems, syncedPoems);
        syncedPoems = snapshot(stored);
        adoptPoems(merged);
    });

    var media = (function () {
        var opening = null;
        function open() {
            if (!('indexedDB' in window)) return Promise.reject(new Error('no IndexedDB'));
            if (!opening) {
                opening = new Promise(function (resolve, reject) {
                    var req = indexedDB.open('easepoet', 1);
                    req.onupgradeneeded = function () { req.result.createObjectStore('media'); };
                    req.onsuccess = function () { resolve(req.result); };
                    req.onerror = function () { reject(req.error); };
                });
            }
            return opening;
        }
        function run(mode, action) {
            return open().then(function (db) {
                return new Promise(function (resolve, reject) {
                    var tx = db.transaction('media', mode);
                    var req = action(tx.objectStore('media'));
                    tx.oncomplete = function () { resolve(req ? req.result : undefined); };
                    tx.onerror = function () { reject(tx.error); };
                });
            });
        }
        return {
            get: function (id) { return run('readonly', function (s) { return s.get(id); }); },
            put: function (id, value) { return run('readwrite', function (s) { return s.put(value, id); }); },
            remove: function (id) { return run('readwrite', function (s) { return s.delete(id); }); }
        };
    })();

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = text;
        return node;
    }

    function button(className, label, onClick, aria) {
        var b = el('button', className, label);
        b.type = 'button';
        if (aria) b.setAttribute('aria-label', aria);
        b.addEventListener('click', onClick);
        return b;
    }

    function syllablesFor(word) {
        var w = Syllables.clean(word);
        if (!w) return 0;
        return typeof syllableCache[w] === 'number' ? syllableCache[w] : Syllables.estimate(w);
    }

    function fetchSyllables(words, done) {
        var missing = words.filter(function (w, i) { return w && words.indexOf(w) === i && typeof syllableCache[w] !== 'number' && !pendingWords[w]; });
        if (!missing.length) return;
        missing.forEach(function (w) { pendingWords[w] = true; });
        var queue = missing.slice();
        var active = 0;
        var changed = false;
        function next() {
            if (!queue.length) {
                if (active === 0) {
                    var keys = Object.keys(syllableCache);
                    if (keys.length > 4000) keys.slice(0, keys.length - 4000).forEach(function (k) { delete syllableCache[k]; });
                    ui.set(SYLLABLE_CACHE_KEY, syllableCache);
                    if (changed) done();
                }
                return;
            }
            var word = queue.shift();
            active++;
            fetch(DATAMUSE + '?sp=' + encodeURIComponent(word) + '&md=s&max=1')
                .then(function (r) { return r.ok ? r.json() : []; })
                .then(function (data) {
                    var hit = Array.isArray(data) && data[0] && data[0].word === word && data[0].numSyllables;
                    syllableCache[word] = hit ? data[0].numSyllables : Syllables.estimate(word);
                    changed = changed || !!hit;
                })
                .catch(function () { return null; })
                .finally(function () { delete pendingWords[word]; active--; next(); });
        }
        for (var i = 0; i < 6; i++) next();
    }

    var RHYME_COLOURS = 7;

    function renderStats(card, poem) {
        var stats = Syllables.lineStats(poem.content, syllablesFor);
        var filled = stats.filter(function (s) { return s.line; });
        var words = 0;
        var syl = 0;
        filled.forEach(function (s) { words += s.words; syl += s.syllables; });
        card.querySelector('[data-stat="lines"]').textContent = filled.length;
        card.querySelector('[data-stat="words"]').textContent = words;
        card.querySelector('[data-stat="syllables"]').textContent = syl;
        var rhyme = Rhymes.scheme(poem.content);
        var colours = {};
        var nextColour = 0;
        rhyme.lines.forEach(function (r) {
            if (r && r.rhymes && !(r.letter in colours)) colours[r.letter] = nextColour++ % RHYME_COLOURS;
        });
        var schemeEl = card.querySelector('[data-stat="scheme"]');
        schemeEl.textContent = '';
        if (filled.length < 2) {
            schemeEl.textContent = '–';
        } else {
            rhyme.summary.split('').forEach(function (ch) {
                if (ch === ' ') { schemeEl.appendChild(document.createTextNode(' ')); return; }
                schemeEl.appendChild(el('span', ch in colours ? 'rh-' + colours[ch] : 'rh-none', ch));
            });
        }
        schemeEl.parentNode.title = rhyme.groups ? 'Matching letters are lines whose last words rhyme. It is a rough guide that goes by spelling.' : 'No rhyming line endings found yet.';
        var list = card.querySelector('.per-line');
        list.textContent = '';
        if (!filled.length) {
            list.appendChild(el('li', 'empty', 'Write a line to see its syllables and rhymes.'));
            return;
        }
        stats.forEach(function (s, i) {
            if (!s.line) return;
            var r = rhyme.lines[i];
            var cls = r && r.letter in colours ? 'rh-' + colours[r.letter] : 'rh-none';
            var li = el('li');
            var letter = el('span', 'pl-letter ' + cls, r ? r.letter : '');
            letter.title = r && r.rhymes ? 'Rhymes with other ' + r.letter + ' lines' : 'No rhyme for this line yet';
            var text = el('span', 'pl-text');
            var cut = s.line.search(/\S+$/);
            if (r && cut >= 0) {
                text.appendChild(document.createTextNode(s.line.slice(0, cut)));
                text.appendChild(el('mark', 'pl-end ' + cls, s.line.slice(cut)));
            } else {
                text.textContent = s.line;
            }
            li.append(letter, text, el('span', 'pl-count', String(s.syllables)));
            list.appendChild(li);
        });
    }

    var statTimers = {};
    function scheduleStats(card, poem) {
        renderStats(card, poem);
        clearTimeout(statTimers[poem.id]);
        if (!askDatamuse) return;
        statTimers[poem.id] = setTimeout(function () {
            fetchSyllables(Syllables.words(poem.content), function () {
                var current = poems.find(function (p) { return p.id === poem.id; });
                var live = poemsBox.querySelector('[data-id="' + poem.id + '"]');
                if (current && live) renderStats(live, current);
            });
        }, 700);
    }

    function autosize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.max(220, textarea.scrollHeight + 4) + 'px';
    }

    function setActive(id) {
        activeId = id;
        poemsBox.querySelectorAll('.poem').forEach(function (c) { c.classList.toggle('active', c.dataset.id === id); });
    }

    var mediaUrls = {};
    function releaseMediaUrl(id) {
        if (!mediaUrls[id]) return;
        URL.revokeObjectURL(mediaUrls[id]);
        delete mediaUrls[id];
    }

    function renderMedia(card, poem) {
        var holder = card.querySelector('.ref-media');
        holder.textContent = '';
        releaseMediaUrl(poem.id);
        if (!poem.hasMedia) {
            holder.appendChild(el('p', 'empty', 'No reference yet. Add an image or short video to write from.'));
            return;
        }
        media.get(poem.id).then(function (item) {
            holder.textContent = '';
            if (!item || !item.blob) {
                poem.hasMedia = false;
                savePoems();
                holder.appendChild(el('p', 'empty', 'No reference yet. Add an image or short video to write from.'));
                return;
            }
            releaseMediaUrl(poem.id);
            var url = URL.createObjectURL(item.blob);
            mediaUrls[poem.id] = url;
            var node;
            if (String(item.type).indexOf('video/') === 0) {
                node = document.createElement('video');
                node.controls = true;
                node.loop = true;
                node.muted = true;
                node.playsInline = true;
            } else {
                node = document.createElement('img');
                node.alt = 'Reference for ' + (poem.title || 'this poem');
            }
            node.src = url;
            node.className = 'ref-node';
            holder.appendChild(node);
        }).catch(function () {
            holder.appendChild(el('p', 'error-text', 'This browser could not load the reference.'));
        });
    }

    function pickMedia(card, poem) {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.addEventListener('change', function () {
            var file = input.files && input.files[0];
            if (!file) return;
            if (!/^(image|video)\//.test(file.type)) { ui.toast('Pick an image or a video.'); return; }
            if (file.size > MAX_MEDIA_BYTES) { ui.toast('That file is over 50 MB. Pick a smaller one.'); return; }
            media.put(poem.id, { blob: file, type: file.type, name: file.name }).then(function () {
                poem.hasMedia = true;
                savePoems();
                card.querySelector('.ref').hidden = false;
                card.querySelector('[data-act="ref"]').setAttribute('aria-pressed', 'true');
                card.querySelector('[data-act="ref-remove"]').hidden = false;
                renderMedia(card, poem);
            }).catch(function () {
                ui.toast('This browser would not store the file. Private windows often block it.');
            });
        });
        input.click();
    }

    function fileName(poem) {
        var base = (poem.title.trim() || 'Untitled poem').replace(/[\\/:*?"<>|]+/g, '').slice(0, 80).trim();
        return (base || 'poem') + '.txt';
    }

    function download(poem) {
        var text = (poem.title.trim() ? poem.title.trim() + '\n\n' : '') + poem.content;
        var url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
        var a = el('a');
        a.href = url;
        a.download = fileName(poem);
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        ui.toast('Saved ' + a.download, 'ok');
    }

    function printPoem(poem) {
        printArea.textContent = '';
        printArea.append(el('h1', null, poem.title.trim() || 'Untitled poem'), el('div', 'print-body', poem.content));
        window.print();
    }

    function removePoem(poem) {
        ui.confirm({ title: 'Delete "' + (poem.title.trim() || 'Untitled poem') + '"?', text: 'The poem and its reference media are removed from this browser. Download it first if you want to keep a copy.', ok: 'Delete', danger: true })
            .then(function (yes) {
                if (!yes) return;
                poems = poems.filter(function (p) { return p.id !== poem.id; });
                if (poem.hasMedia) media.remove(poem.id).catch(function () { return null; });
                releaseMediaUrl(poem.id);
                if (!poems.length) poems.push(blankPoem());
                if (activeId === poem.id) activeId = poems[0].id;
                savePoems(true);
                renderAll();
                ui.toast('Poem deleted.');
            });
    }

    function blankPoem() { return { id: newId(), title: '', content: '', updated: Date.now(), hasMedia: false }; }

    function buildCard(poem) {
        var card = el('article', 'card poem');
        card.dataset.id = poem.id;
        if (poem.id === activeId) card.classList.add('active');

        var title = el('input', 'poem-title');
        title.type = 'text';
        title.placeholder = 'Untitled poem';
        title.value = poem.title;
        title.maxLength = 200;
        title.setAttribute('aria-label', 'Poem title');
        var body = el('textarea', 'poem-body');
        body.placeholder = 'Let your emotions go wild…';
        body.value = poem.content;
        body.setAttribute('aria-label', 'Poem text');
        body.spellcheck = true;

        var stats = el('div', 'poem-stats');
        stats.innerHTML = '<span><b data-stat="lines">0</b> lines</span><span><b data-stat="words">0</b> words</span><span><b data-stat="syllables">0</b> syllables</span><span class="scheme-stat">rhyme scheme <b data-stat="scheme" class="scheme"></b></span>';
        var details = el('details', 'per-line-box');
        details.appendChild(el('summary', null, 'Syllables and rhymes per line'));
        details.appendChild(el('ol', 'per-line'));

        var actions = el('div', 'btn-row poem-actions');
        var refBtn = button('btn-quiet', 'Reference', function () {
            var ref = card.querySelector('.ref');
            ref.hidden = !ref.hidden;
            refBtn.setAttribute('aria-pressed', String(!ref.hidden));
            if (!ref.hidden) renderMedia(card, poem);
        });
        refBtn.dataset.act = 'ref';
        refBtn.setAttribute('aria-pressed', 'false');
        actions.append(
            button('btn-quiet', 'Download .txt', function () { download(poem); }),
            button('btn-quiet', 'Print or PDF', function () { printPoem(poem); }),
            refBtn,
            button('btn-danger', 'Delete', function () { removePoem(poem); })
        );

        var ref = el('div', 'ref');
        ref.hidden = true;
        var refHead = el('div', 'ref-head');
        refHead.appendChild(el('span', 'label', 'Reference media'));
        var refRemove = button('btn-danger', 'Remove', function () {
            media.remove(poem.id).catch(function () { return null; });
            poem.hasMedia = false;
            savePoems();
            refRemove.hidden = true;
            renderMedia(card, poem);
        });
        refRemove.dataset.act = 'ref-remove';
        refRemove.hidden = !poem.hasMedia;
        refHead.append(button('btn-quiet', 'Choose file', function () { pickMedia(card, poem); }), refRemove);
        ref.append(refHead, el('div', 'ref-media'));

        function touched() {
            poem.updated = Date.now();
            savePoems();
            setActive(poem.id);
        }
        title.addEventListener('input', function () { poem.title = title.value; touched(); });
        body.addEventListener('input', function () {
            poem.content = body.value;
            autosize(body);
            touched();
            scheduleStats(card, poem);
        });
        [title, body].forEach(function (input) {
            input.addEventListener('focus', function () { setActive(poem.id); });
        });
        body.addEventListener('blur', function () { activeCaret = { id: poem.id, start: body.selectionStart, end: body.selectionEnd }; });

        card.append(title, body, stats, details, actions, ref);
        requestAnimationFrame(function () { autosize(body); });
        renderStats(card, poem);
        return card;
    }

    function renderAll() {
        poemsBox.textContent = '';
        poems.forEach(function (poem) { poemsBox.appendChild(buildCard(poem)); });
        countEl.textContent = poems.length === 1 ? '1 poem' : poems.length + ' poems';
        scheduleAllStats();
    }

    function scheduleAllStats() {
        poems.forEach(function (poem) {
            var card = poemsBox.querySelector('[data-id="' + poem.id + '"]');
            if (card) scheduleStats(card, poem);
        });
    }

    function setAskDatamuse(on) {
        askDatamuse = on;
        ui.set(DATAMUSE_SYLLABLES_KEY, on);
        scheduleAllStats();
    }

    function adoptPoems(merged) {
        if (PoemSync.same(merged, poems)) return;
        poems = merged;
        if (!poems.length) poems.push(blankPoem());
        if (!poems.some(function (p) { return p.id === activeId; })) activeId = poems[0].id;
        renderKeepingFocus();
    }

    function renderKeepingFocus() {
        var focused = document.activeElement;
        var isPoemField = focused && focused.matches && focused.matches('.poem-title, .poem-body');
        if (!isPoemField) { renderAll(); return; }
        var id = focused.closest('.poem').dataset.id;
        var selector = focused.classList.contains('poem-title') ? '.poem-title' : '.poem-body';
        var start = focused.selectionStart;
        var end = focused.selectionEnd;
        renderAll();
        var card = poemsBox.querySelector('[data-id="' + id + '"]');
        var field = card && card.querySelector(selector);
        if (!field) return;
        field.focus();
        field.setSelectionRange(start, end);
    }

    function addPoem() {
        var poem = blankPoem();
        poems.unshift(poem);
        activeId = poem.id;
        savePoems(true);
        renderAll();
        var card = poemsBox.querySelector('[data-id="' + poem.id + '"]');
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
            card.querySelector('.poem-title').focus();
        }
    }

    function insertWord(word) {
        var poem = poems.find(function (p) { return p.id === activeId; }) || poems[0];
        var card = poemsBox.querySelector('[data-id="' + poem.id + '"]');
        if (!card) return;
        var body = card.querySelector('.poem-body');
        var start = activeCaret && activeCaret.id === poem.id ? activeCaret.start : body.value.length;
        var end = activeCaret && activeCaret.id === poem.id ? activeCaret.end : body.value.length;
        var before = body.value.slice(0, start);
        var after = body.value.slice(end);
        var lead = before && !/\s$/.test(before) ? ' ' : '';
        var trail = after && !/^\s/.test(after) ? ' ' : '';
        body.value = before + lead + word + trail + after;
        var caret = (before + lead + word).length;
        poem.content = body.value;
        body.focus();
        body.setSelectionRange(caret, caret);
        activeCaret = { id: poem.id, start: caret, end: caret };
        autosize(body);
        savePoems();
        scheduleStats(card, poem);
        ui.toast('Added "' + word + '" to ' + (poem.title.trim() || 'your poem') + '.', 'ok');
    }

    function chip(word) {
        var b = button('chip', word, function () { insertWord(word); }, 'Add ' + word + ' to the poem');
        b.title = 'Add to the poem';
        return b;
    }

    function getJson(url) {
        return fetch(url).then(function (r) {
            if (r.status === 404) return null;
            if (!r.ok) throw new Error('http ' + r.status);
            return r.json();
        });
    }

    function suggest(word) {
        return getJson(DATAMUSE + '?sp=' + encodeURIComponent(word) + '&max=1').then(function (data) {
            var hit = Array.isArray(data) && data[0] ? data[0].word : null;
            return hit && hit !== word.toLowerCase() ? hit : null;
        }).catch(function () { return null; });
    }

    function loading(box, text) {
        box.textContent = '';
        box.appendChild(el('p', 'muted small', text));
    }

    async function lookup() {
        var word = lookupInput.value.trim();
        if (!word) { lookupInput.focus(); return; }
        loading(lookupResult, 'Looking up “' + word + '”…');
        try {
            var data = await getJson(DICTIONARY + encodeURIComponent(word));
            var shown = word;
            var note = null;
            if (!Array.isArray(data) || !data.length) {
                var alt = await suggest(word);
                if (alt) {
                    data = await getJson(DICTIONARY + encodeURIComponent(alt));
                    shown = alt;
                    note = 'Nothing for “' + word + '”, showing “' + alt + '” instead.';
                }
            }
            lookupResult.textContent = '';
            if (!Array.isArray(data) || !data.length) {
                lookupResult.appendChild(el('p', 'error-text', 'No definition found for “' + word + '”.'));
                return;
            }
            if (note) lookupResult.appendChild(el('p', 'muted small', note));
            var entry = data[0];
            lookupResult.appendChild(el('p', 'result-word', entry.word || shown));
            if (entry.phonetic) lookupResult.appendChild(el('p', 'muted small', entry.phonetic));
            var synonyms = [];
            (entry.meanings || []).slice(0, 3).forEach(function (meaning) {
                lookupResult.appendChild(el('p', 'pos', meaning.partOfSpeech || ''));
                var ol = el('ol', 'defs');
                (meaning.definitions || []).slice(0, 2).forEach(function (d) {
                    var li = el('li', null, d.definition || '');
                    if (d.example) li.appendChild(el('span', 'example', '“' + d.example + '”'));
                    ol.appendChild(li);
                    (d.synonyms || []).forEach(function (s) { synonyms.push(s); });
                });
                (meaning.synonyms || []).forEach(function (s) { synonyms.push(s); });
                lookupResult.appendChild(ol);
            });
            var unique = synonyms.filter(function (s, i) { return s && synonyms.indexOf(s) === i; }).slice(0, 16);
            if (unique.length) {
                lookupResult.appendChild(el('p', 'label', 'Synonyms, click to add'));
                var chips = el('div', 'chips');
                unique.forEach(function (s) { chips.appendChild(chip(s)); });
                lookupResult.appendChild(chips);
            }
        } catch (error) {
            lookupResult.textContent = '';
            lookupResult.appendChild(el('p', 'error-text', 'Could not reach the dictionary. Check your connection and try again.'));
        }
    }

    async function rhymes() {
        var word = rhymeInput.value.trim();
        if (!word) { rhymeInput.focus(); return; }
        loading(rhymeResult, 'Finding rhymes for “' + word + '”…');
        try {
            var perfect = await getJson(DATAMUSE + '?rel_rhy=' + encodeURIComponent(word) + '&max=40');
            var near = await getJson(DATAMUSE + '?rel_nry=' + encodeURIComponent(word) + '&max=20');
            perfect = Array.isArray(perfect) ? perfect : [];
            near = Array.isArray(near) ? near : [];
            var note = null;
            if (!perfect.length && !near.length) {
                var alt = await suggest(word);
                if (alt) {
                    perfect = (await getJson(DATAMUSE + '?rel_rhy=' + encodeURIComponent(alt) + '&max=40')) || [];
                    note = 'Nothing for “' + word + '”, showing rhymes for “' + alt + '”.';
                }
            }
            rhymeResult.textContent = '';
            if (note) rhymeResult.appendChild(el('p', 'muted small', note));
            if (!perfect.length && !near.length) {
                rhymeResult.appendChild(el('p', 'error-text', 'No rhymes found for “' + word + '”.'));
                return;
            }
            function group(label, list) {
                if (!list.length) return;
                rhymeResult.appendChild(el('p', 'label', label));
                var chips = el('div', 'chips');
                list.forEach(function (item) { if (item && item.word) chips.appendChild(chip(item.word)); });
                rhymeResult.appendChild(chips);
            }
            group('Rhymes, click to add', perfect.slice(0, 40));
            var nearOnly = near.filter(function (n) { return !perfect.some(function (p) { return p.word === n.word; }); });
            group('Near rhymes', nearOnly.slice(0, 20));
        } catch (error) {
            rhymeResult.textContent = '';
            rhymeResult.appendChild(el('p', 'error-text', 'Could not reach the rhyme finder. Check your connection and try again.'));
        }
    }

    document.getElementById('newPoem').addEventListener('click', addPoem);
    datamuseToggle.checked = askDatamuse;
    datamuseToggle.addEventListener('change', function () { setAskDatamuse(datamuseToggle.checked); });
    document.getElementById('lookupBtn').addEventListener('click', lookup);
    document.getElementById('rhymeBtn').addEventListener('click', rhymes);
    lookupInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); lookup(); } });
    rhymeInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); rhymes(); } });
    document.getElementById('downloadAll').addEventListener('click', function () {
        var text = poems.map(function (p) { return (p.title.trim() || 'Untitled poem') + '\n\n' + p.content.trim(); }).join('\n\n\n');
        var url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
        var a = el('a');
        a.href = url;
        a.download = 'easepoet-poems.txt';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });

    document.addEventListener('keydown', function (event) {
        if (typeof event.key !== 'string') return;
        var key = event.key.toLowerCase();
        if (event.altKey && !event.ctrlKey && !event.metaKey) {
            if (key === 'n') { event.preventDefault(); addPoem(); }
            if (key === 'l') { event.preventDefault(); lookupInput.focus(); lookupInput.select(); }
            if (key === 'r') { event.preventDefault(); rhymeInput.focus(); rhymeInput.select(); }
        }
        if ((event.ctrlKey || event.metaKey) && key === 's') {
            event.preventDefault();
            var poem = poems.find(function (p) { return p.id === activeId; }) || poems[0];
            if (poem) download(poem);
        }
    });

    if (!poems.length) poems.push(blankPoem());
    if (!activeId) activeId = poems[0].id;
    renderAll();
})();
