let workspaceCount = 0;


const AUTOSAVE_KEY = 'easepoet_workspaces';

function setSaveStatus() {
    const el = document.getElementById('saveStatus');
    if (!el) return;
    if (!navigator.onLine) {
        el.textContent = 'Offline - saved locally';
        el.className = 'save-status offline';
    } else {
        el.textContent = 'Saved';
        el.className = 'save-status saved';
    }
}

function autosaveAll() {
    const workspaces = document.querySelectorAll('.workspace');
    const data = [];
    workspaces.forEach(ws => {
        data.push({
            title:   ws.querySelector('.editable-title')?.value ?? '',
            content: ws.querySelector('textarea')?.value ?? ''
        });
    });
    try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
        setSaveStatus();
    } catch (e) {
    }
}

function restoreAutosave() {
    try {
        const raw = localStorage.getItem(AUTOSAVE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (!Array.isArray(data) || data.length === 0) return false;
        data.forEach(item => addWorkspace(item.title, item.content));
        return true;
    } catch (e) {
        return false;
    }
}


function createParticles() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const particles = document.getElementById('particles');
    for (let i = 0; i < 14; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDelay  = (Math.random() * 15) + 's';
        p.style.animationDuration = (15 + Math.random() * 10) + 's';
        particles.appendChild(p);
    }
}


function addWorkspace(restoredTitle, restoredContent) {
    workspaceCount++;
    const wsIndex = workspaceCount;
    const container = document.getElementById('workspaces');
    const ws = document.createElement('div');
    ws.className = 'workspace';
    ws.dataset.wsIndex = wsIndex;
    ws.style.opacity = '0';
    ws.style.transform = 'translateY(20px)';
    ws.innerHTML = `
        <input type="text" class="editable-title" placeholder="Enter your title...">
        <textarea placeholder="Let your creativity flow..."></textarea>
        <div class="syllable-bar" id="syllablebar${wsIndex}" aria-live="polite">
            <span class="syllable-label">Syllables:</span>
            <span class="syllable-count" id="syllablecount${wsIndex}">-</span>
            <button class="syllable-toggle" aria-expanded="false" aria-controls="syllabledetail${wsIndex}">per line \u25be</button>
            <div class="syllable-detail hidden" id="syllabledetail${wsIndex}"></div>
        </div>
        <div class="button-group">
            <button class="save-btn">Save as Text</button>
            <button class="save-pdf-btn">Save as PDF</button>
            <button class="toggle-reference">Reference Media</button>
            <button class="delete-btn" title="Delete this workspace">Delete</button>
        </div>
        <div class="reference-section hidden">
            <div class="reference-header">
                <h3>Reference Media</h3>
                <button class="change-image-btn">Change Media</button>
            </div>
            <div class="reference-image" id="reference${wsIndex}">
                <span class="reference-text">Click to upload inspiration image or video</span>
            </div>
        </div>
    `;
    container.appendChild(ws);

    requestAnimationFrame(() => requestAnimationFrame(() => {
        ws.style.transition = 'all .45s cubic-bezier(.4,0,.2,1)';
        ws.style.opacity = '1';
        ws.style.transform = 'translateY(0)';
    }));

    const ta = ws.querySelector('textarea');
    const titleInput = ws.querySelector('.editable-title');
    titleInput.value = restoredTitle || 'choose your poem name';
    ta.value = restoredContent || '';
    const syllableToggle = ws.querySelector('.syllable-toggle');
    const refImageEl = ws.querySelector('.reference-image');

    ws.querySelector('.save-btn').addEventListener('click', () => savePoem(ws));
    ws.querySelector('.save-pdf-btn').addEventListener('click', () => printPoem(ws));
    ws.querySelector('.toggle-reference').addEventListener('click', function () { toggleReference(this, ws); });
    ws.querySelector('.delete-btn').addEventListener('click', () => deleteWorkspace(ws));
    ws.querySelector('.change-image-btn').addEventListener('click', () => uploadBackground(refImageEl));
    refImageEl.addEventListener('click', function () {
        if (!this.querySelector('img') && !this.querySelector('video')) uploadBackground(this);
    });
    syllableToggle.addEventListener('click', function () { toggleSyllableDetail(this); });

    refImageEl._mediaHandlers = setupMediaHandlers(refImageEl);

    let syllableTimer;
    ta.addEventListener('input', function () {
        clearTimeout(syllableTimer);
        syllableTimer = setTimeout(() => updateSyllableBar(wsIndex, ta.value), 600);
        ta.style.height = 'auto';
        ta.style.height = Math.max(200, ta.scrollHeight) + 'px';
        autosaveAll();
    });
    titleInput.addEventListener('input', autosaveAll);

    ws.querySelectorAll('input[type="text"], textarea').forEach(attachFocusEffect);

    if (restoredContent) {
        setTimeout(() => updateSyllableBar(wsIndex, restoredContent), 800);
    } else {
        setTimeout(() => {
            ws.scrollIntoView({ behavior: 'smooth', block: 'center' });
            titleInput.focus();
            titleInput.select();
        }, 350);
        const addBtn = document.getElementById('addWorkspaceBtn');
        if (addBtn) {
            const orig = addBtn.textContent;
            addBtn.textContent = '\u2713 Added';
            addBtn.style.background = '#35d67c';
            addBtn.style.borderColor = '#35d67c';
            addBtn.style.color = '#07090c';
            setTimeout(() => { addBtn.textContent = orig; addBtn.style.background = ''; addBtn.style.borderColor = ''; addBtn.style.color = ''; }, 1000);
        }
    }
}

function deleteWorkspace(workspace) {
    const title = workspace.querySelector('.editable-title').value || 'Untitled';
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return;
    workspace.style.transition = 'all .35s ease';
    workspace.style.opacity = '0';
    workspace.style.transform = 'translateX(-60px) scale(.95)';
    workspace.style.maxHeight = workspace.offsetHeight + 'px';
    requestAnimationFrame(() => {
        workspace.style.maxHeight = '0px';
        workspace.style.marginBottom = '0';
        workspace.style.padding = '0';
    });
    setTimeout(() => {
        workspace.remove();
        autosaveAll();
        if (document.querySelectorAll('.workspace').length === 0) setTimeout(addWorkspace, 200);
    }, 380);
}


const syllableCache = {};

async function getSyllableCount(word) {
    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!clean) return 0;
    if (syllableCache[clean] !== undefined) return syllableCache[clean];
    try {
        const res  = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(clean)}&md=s&max=1`);
        const data = await res.json();
        if (data.length > 0 && data[0].numSyllables) {
            syllableCache[clean] = data[0].numSyllables;
            return data[0].numSyllables;
        }
        const count = (clean.match(/[aeiou]+/gi) || []).length || 1;
        syllableCache[clean] = count;
        return count;
    } catch {
        return (clean.match(/[aeiou]+/gi) || []).length || 1;
    }
}

async function updateSyllableBar(wsIndex, text) {
    const countEl  = document.getElementById('syllablecount' + wsIndex);
    const detailEl = document.getElementById('syllabledetail' + wsIndex);
    if (!countEl) return;
    const lines = text.split('\n');
    const allWords = lines.flatMap(l => l.trim().split(/\s+/).filter(Boolean));
    await Promise.all([...new Set(allWords)].map(getSyllableCount));
    let total = 0;
    const lineResults = [];
    for (const line of lines) {
        const words = line.trim().split(/\s+/).filter(Boolean);
        let lineSyl = 0;
        for (const word of words) lineSyl += await getSyllableCount(word);
        total += lineSyl;
        if (line.trim()) lineResults.push({ line: line.trim(), count: lineSyl });
    }
    countEl.textContent = total || '-';
    detailEl.innerHTML = lineResults.map(r =>
        `<div class="syllable-line"><span class="syllable-line-text">${escapeHtml(r.line)}</span><span class="syllable-line-count">${r.count}</span></div>`
    ).join('');
}

function toggleSyllableDetail(btn) {
    const detail = btn.nextElementSibling;
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    detail.classList.toggle('hidden', expanded);
    btn.setAttribute('aria-expanded', String(!expanded));
    btn.textContent = expanded ? 'per line \u25be' : 'per line \u25b4';
}

function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}


function setupMediaHandlers(container) {
    let scale = 1, isDragging = false, startX, startY, translateX = 0, translateY = 0, media = null;
    function updateTransform() { if (media) media.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`; }
    function resetTransform() { scale = 1; translateX = 0; translateY = 0; updateTransform(); }
    function onWheel(e) {
        if (!media) return;
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const prev = scale;
        scale = Math.max(.5, Math.min(5, scale * (e.deltaY < 0 ? 1.1 : 0.9)));
        translateX -= (e.clientX - rect.left - translateX) * (scale / prev - 1);
        translateY -= (e.clientY - rect.top  - translateY) * (scale / prev - 1);
        updateTransform();
    }
    function onPointerDown(e) { if (!media || e.button !== 0) return; isDragging = true; startX = e.clientX - translateX; startY = e.clientY - translateY; media.style.cursor = 'grabbing'; e.currentTarget.setPointerCapture(e.pointerId); }
    function onPointerMove(e) { if (!isDragging) return; translateX = e.clientX - startX; translateY = e.clientY - startY; updateTransform(); }
    function onPointerUp() { isDragging = false; if (media) media.style.cursor = 'grab'; }
    function setupVideoControls(video) {
        const old = container.querySelector('.video-controls'); if (old) old.remove();
        const ctrl = document.createElement('div'); ctrl.className = 'video-controls';
        const prog = document.createElement('div'); prog.className = 'video-progress';
        const bar  = document.createElement('div'); bar.className  = 'video-progress-bar';
        prog.appendChild(bar); ctrl.appendChild(prog); container.appendChild(ctrl);
        video.addEventListener('timeupdate', () => { if (video.duration) bar.style.width = (video.currentTime / video.duration * 100) + '%'; });
        prog.addEventListener('click', e => { const r = prog.getBoundingClientRect(); video.currentTime = ((e.clientX - r.left) / r.width) * video.duration; });
    }
    function attachHandlers(newMedia) {
        media = newMedia; resetTransform(); media.style.cursor = 'grab';
        media.addEventListener('pointerdown', onPointerDown);
        media.addEventListener('pointermove', onPointerMove);
        media.addEventListener('pointerup',   onPointerUp);
        media.addEventListener('pointercancel', onPointerUp);
    }
    container.addEventListener('wheel', onWheel, { passive: false });
    return { attachHandlers, setupVideoControls, resetTransform };
}


function savePoem(workspace) {
    const text  = workspace.querySelector('textarea').value;
    const title = workspace.querySelector('.editable-title').value.trim() || 'Untitled';
    const btn   = workspace.querySelector('.save-btn');
    btn.style.transform = 'scale(.95)';
    btn.textContent = 'Saving...';
    setTimeout(() => {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${title}.txt`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        btn.textContent = 'Saved!';
        btn.style.background = '#35d67c';
        btn.style.borderColor = '#35d67c';
        btn.style.color = '#07090c';
        setTimeout(() => { btn.textContent = 'Save as Text'; btn.style.background = ''; btn.style.borderColor = ''; btn.style.color = ''; btn.style.transform = ''; }, 2000);
    }, 500);
}

function printPoem(workspace) {
    document.querySelectorAll('.workspace').forEach(ws => ws.classList.remove('print-target'));
    workspace.classList.add('print-target');
    window.print();
    setTimeout(() => workspace.classList.remove('print-target'), 1000);
}


async function lookupWord() {
    const word = document.getElementById('lookupInput').value.trim();
    const resultDiv = document.getElementById('lookupResult');
    if (!word) return;
    resultDiv.innerHTML = '<div class="loading">Searching...</div>';
    try {
        let res  = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        let data = await res.json();
        let suggestionHtml = '';
        if (!Array.isArray(data)) {
            const sugRes = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&max=1`);
            const suggestions = await sugRes.json();
            if (suggestions.length > 0) {
                const closest = suggestions[0].word;
                suggestionHtml = `<p class="result-suggestion">Did you mean <strong style="color:var(--accent)">${escapeHtml(closest)}</strong>?</p>`;
                res  = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(closest)}`);
                data = await res.json();
            }
        }
        if (!Array.isArray(data) || !data.length) {
            resultDiv.innerHTML = '<p class="result-error">Unable to find definition. Try another word.</p>';
            return;
        }
        if (!Array.isArray(data[0].meanings) || !data[0].meanings.length) {
            resultDiv.innerHTML = '<p class="result-error">No dictionary meanings were found for that word.</p>';
            return;
        }
        const allSynonyms = [];
        data[0].meanings.forEach(m => {
            m.synonyms && allSynonyms.push(...m.synonyms);
            if (Array.isArray(m.definitions)) {
                m.definitions.forEach(d => d.synonyms && allSynonyms.push(...d.synonyms));
            }
        });
        const uniqueSynonyms = [...new Set(allSynonyms)];
        const meaning    = data[0].meanings[0];
        if (!Array.isArray(meaning.definitions) || !meaning.definitions.length || !meaning.definitions[0].definition) {
            resultDiv.innerHTML = '<p class="result-error">No definition details were found for that word.</p>';
            return;
        }
        const displayWord = escapeHtml(data[0].word || "");
        const definition = escapeHtml(meaning.definitions[0].definition);
        const safeSynonyms = uniqueSynonyms.slice(0, 10).map(s => escapeHtml(String(s)));
        resultDiv.innerHTML = suggestionHtml + `
            <div class="result-block">
                <p class="result-word">${displayWord}</p>
                <p><span class="result-label">Definition:</span></p>
                <p class="result-text">${definition}</p>
                <p><span class="result-label">Synonyms:</span></p>
                <p class="result-text">${safeSynonyms.length > 0 ? safeSynonyms.join(', ') : 'None found'}</p>
            </div>`;
    } catch (e) {
        resultDiv.innerHTML = '<p class="result-error">Unable to find definition. Try another word.</p>';
    }
}


async function findRhymes() {
    const word = document.getElementById('rhymeInput').value.trim();
    const resultDiv = document.getElementById('rhymeResult');
    if (!word) return;
    resultDiv.innerHTML = '<div class="loading">Finding rhymes...</div>';
    try {
        let res  = await fetch(`https://api.datamuse.com/words?rel_rhy=${encodeURIComponent(word)}`);
        let data = await res.json();
        let suggestionHtml = '';
        if (data.length === 0) {
            const sugRes = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&max=1`);
            const suggestions = await sugRes.json();
            if (suggestions.length > 0) {
                const closest = suggestions[0].word;
                suggestionHtml = `<p class="result-suggestion">Did you mean <strong style="color:var(--accent)">${escapeHtml(closest)}</strong>?</p>`;
                res  = await fetch(`https://api.datamuse.com/words?rel_rhy=${encodeURIComponent(closest)}`);
                data = await res.json();
            }
        }
        if (data.length === 0) { resultDiv.innerHTML = suggestionHtml + '<p class="result-error">No rhymes found. Try a different word.</p>'; return; }
        const pills = data.slice(0,20).map(item => `<span class="rhyme-pill">${escapeHtml(item.word)}</span>`).join('');
        const displayWord = escapeHtml(word);
        resultDiv.innerHTML = suggestionHtml + `
            <div class="result-block">
                <p class="result-word">Rhymes for "${displayWord}":</p>
                <div>${pills}</div>
            </div>`;
    } catch (e) {
        resultDiv.innerHTML = '<p class="result-error">Unable to find rhymes. Please try again.</p>';
    }
}


const _crcTable = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = _crcTable[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}

function buildZip(files) {
    const enc = new TextEncoder();
    const chunks = [];
    const central = [];
    let offset = 0;
    const u16 = n => [n & 0xFF, (n >>> 8) & 0xFF];
    const u32 = n => [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF];

    for (const f of files) {
        const nameBytes = enc.encode(f.name);
        const data = f.data;
        const crc = crc32(data);
        const local = [
            ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
            ...u32(crc), ...u32(data.length), ...u32(data.length),
            ...u16(nameBytes.length), ...u16(0)
        ];
        chunks.push(new Uint8Array(local), nameBytes, data);
        central.push([
            ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
            ...u32(crc), ...u32(data.length), ...u32(data.length),
            ...u16(nameBytes.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0),
            ...u32(offset)
        ]);
        offset += local.length + nameBytes.length + data.length;
        central[central.length - 1]._name = nameBytes;
    }

    const cdStart = offset;
    let cdSize = 0;
    for (let i = 0; i < central.length; i++) {
        const rec = new Uint8Array(central[i]);
        chunks.push(rec, central[i]._name);
        cdSize += rec.length + central[i]._name.length;
    }
    const end = [
        ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
        ...u32(cdSize), ...u32(cdStart), ...u16(0)
    ];
    chunks.push(new Uint8Array(end));
    return new Blob(chunks, { type: 'application/zip' });
}

async function parseZip(buffer) {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const dec = new TextDecoder();
    const out = [];
    let p = 0;
    while (p + 4 <= bytes.length && view.getUint32(p, true) === 0x04034b50) {
        const method = view.getUint16(p + 8, true);
        const compSize = view.getUint32(p + 18, true);
        const nameLen = view.getUint16(p + 26, true);
        const extraLen = view.getUint16(p + 28, true);
        const nameStart = p + 30;
        const name = dec.decode(bytes.slice(nameStart, nameStart + nameLen));
        const dataStart = nameStart + nameLen + extraLen;
        const raw = bytes.slice(dataStart, dataStart + compSize);
        let content = '';
        if (method === 0) {
            content = dec.decode(raw);
        } else if (method === 8 && 'DecompressionStream' in window) {
            const ds = new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')));
            content = await ds.text();
        } else {
            content = '';
        }
        if (name.endsWith('.txt')) out.push({ name, content });
        p = dataStart + compSize;
    }
    return out;
}

function exportAllPoems() {
    const enc = new TextEncoder();
    const workspaces = document.querySelectorAll('.workspace');
    if (!workspaces.length) return;
    const used = {};
    const files = [];
    workspaces.forEach(ws => {
        let title = (ws.querySelector('.editable-title')?.value || 'Untitled').trim() || 'Untitled';
        title = title.replace(/[<>:"/\\|?*]/g, '').slice(0, 80) || 'Untitled';
        used[title] = (used[title] || 0) + 1;
        const name = used[title] > 1 ? `${title} (${used[title]}).txt` : `${title}.txt`;
        files.push({ name, data: enc.encode(ws.querySelector('textarea')?.value || '') });
    });
    const url = URL.createObjectURL(buildZip(files));
    const a = document.createElement('a');
    a.href = url; a.download = 'easepoet-poems.zip';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}

async function importFiles(fileList) {
    for (const file of fileList) {
        if (file.name.toLowerCase().endsWith('.zip')) {
            try {
                const poems = await parseZip(await file.arrayBuffer());
                poems.forEach(p => addWorkspace(p.name.replace(/\.txt$/i, ''), p.content));
            } catch (e) {
                alert(`Could not read ${file.name}.`);
            }
        } else if (file.name.toLowerCase().endsWith('.txt')) {
            const text = await file.text();
            addWorkspace(file.name.replace(/\.txt$/i, ''), text);
        }
    }
    autosaveAll();
}

function uploadBackground(element) {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*,video/*';
    input.onchange = e => changeBackground(e, element);
    input.click();
}

function changeBackground(event, element) {
    const file = event.target.files[0];
    if (!file) return;
    const handlers = element._mediaHandlers;
    element.innerHTML = '<div class="loading">Loading media...</div>';
    handlers.resetTransform();
    const reader = new FileReader();
    reader.onload = function(e) {
        element.innerHTML = '';
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img'); img.src = e.target.result;
            img.onload = () => { element.appendChild(img); handlers.attachHandlers(img); element.style.borderStyle = 'solid'; element.style.borderColor = 'var(--accent)'; };
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = e.target.result; video.autoplay = true; video.loop = true; video.muted = true; video.playsInline = true; video.controls = true;
            video.onloadeddata = () => { element.appendChild(video); handlers.attachHandlers(video); handlers.setupVideoControls(video); element.style.borderStyle = 'solid'; element.style.borderColor = 'var(--accent)'; };
        }
    };
    reader.readAsDataURL(file);
}


function toggleReference(button, workspace) {
    const refSection = workspace.querySelector('.reference-section');
    const isNowHidden = refSection.classList.toggle('hidden');
    button.textContent = isNowHidden ? 'Reference Media' : 'Hide Reference';
}

function attachFocusEffect(input) {
    input.addEventListener('focus', function() { if (this.parentElement) this.parentElement.style.transform = 'scale(1.005)'; });
    input.addEventListener('blur',  function() { if (this.parentElement) this.parentElement.style.transform = ''; });
}


document.addEventListener('DOMContentLoaded', function () {
    createParticles();

    const restored = restoreAutosave();
    if (!restored) addWorkspace();

    setInterval(autosaveAll, 30000);

    document.getElementById('addWorkspaceBtn').addEventListener('click', () => addWorkspace());

    const exportBtn = document.getElementById('exportAllBtn');
    const importBtn = document.getElementById('importBtn');
    const importInput = document.getElementById('importInput');
    if (exportBtn) exportBtn.addEventListener('click', exportAllPoems);
    if (importBtn && importInput) {
        importBtn.addEventListener('click', () => importInput.click());
        importInput.addEventListener('change', e => { importFiles(e.target.files); e.target.value = ''; });
    }
    setSaveStatus();
    window.addEventListener('online', setSaveStatus);
    window.addEventListener('offline', setSaveStatus);

    document.getElementById('lookupBtn').addEventListener('click', lookupWord);
    document.getElementById('rhymeBtn').addEventListener('click', findRhymes);

    document.getElementById('lookupInput').addEventListener('keydown', e => { if (e.key === 'Enter') lookupWord(); });
    document.getElementById('rhymeInput').addEventListener('keydown',  e => { if (e.key === 'Enter') findRhymes(); });

    document.querySelectorAll('.sidebar input[type="text"]').forEach(attachFocusEffect);

    setTimeout(() => {
        const firstTextarea = document.querySelector('textarea');
        if (firstTextarea && !firstTextarea.value) {
            const text = 'Let your emotions go wild...';
            let i = 0;
            function type() {
                if (i < text.length && !firstTextarea.value) {
                    firstTextarea.placeholder = text.substring(0, i + 1);
                    i++; setTimeout(type, 55);
                }
            }
            type();
        }
    }, 800);

    const rippleStyle = document.createElement('style');
    rippleStyle.textContent = '@keyframes ripple { to { transform: scale(2); opacity: 0; } }';
    document.head.appendChild(rippleStyle);
    document.addEventListener('click', function(e) {
        if (e.target.tagName === 'BUTTON') {
            const btn = e.target;
            const ripple = document.createElement('span');
            const rect   = btn.getBoundingClientRect();
            const size   = Math.max(rect.width, rect.height);
            ripple.style.cssText = `position:absolute;width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px;background:rgba(255,255,255,.2);border-radius:50%;transform:scale(0);animation:ripple .5s ease-out;pointer-events:none;`;
            btn.appendChild(ripple);
            setTimeout(() => ripple.remove(), 500);
        }
    });

    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const ta = document.activeElement;
            if (ta && ta.tagName === 'TEXTAREA') ta.closest('.workspace')?.querySelector('.save-btn')?.click();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); addWorkspace(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') { e.preventDefault(); document.getElementById('lookupInput')?.focus(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') { e.preventDefault(); document.getElementById('rhymeInput')?.focus(); }
        if (e.key === 'Escape') document.getElementById('lookupInput')?.focus();
    });
});
