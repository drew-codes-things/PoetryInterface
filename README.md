<div align="center">

# PoetryEaseWrite

**A distraction-free browser app for writing poetry, with a word lookup panel, rhyme finder, syllable counter, and auto-save support.**

[![HTML](https://img.shields.io/badge/html-drew?style=flat-square&logo=html5&logoColor=FFFFFF&color=E34C26)](https://html.spec.whatwg.org/)
[![JavaScript](https://img.shields.io/badge/javascript-drew?style=flat-square&logo=javascript&logoColor=F7DF1E&color=000000)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

</div>

---

EasePoet is a single-page browser tool for writing poetry without distractions. It runs entirely client-side with no install, no account, and no backend. The app is also live at [easepoet.drew-gnr.xyz](https://easepoet.drew-gnr.xyz/).

---

## Features

### Writing workspace

- Multiple poem workspaces open at once, each in its own panel
- Add a new workspace with the `+ New Poem` button or `Ctrl+N`
- Syllable count updates live as you type in each workspace

### Word lookup (left sidebar)

- Dictionary definitions fetched on demand
- Open with `Ctrl+L` or type directly into the search box

### Rhyme finder (right sidebar)

- Rhyme suggestions fetched on demand
- Open with `Ctrl+R` or type directly into the search box

### Auto-save

- Poem content is preserved automatically in the browser (localStorage), surviving refresh
- A "Saved" / "Offline - saved locally" indicator in the header reflects save state
- No manual save step required

### Import / Export

- **Export All** downloads every open poem as a single `.zip` (one `.txt` per poem)
- **Import** accepts one or more `.txt` files, or a previously exported `.zip`, each becoming a new workspace

### Installable (PWA)

- Installable as an offline app via a web manifest and service worker - the editor works with no connection (word lookup and rhymes still need network)

---

## Usage

Open `index.html` in any modern browser and start writing. No dependencies to install.

Or visit the live version: [easepoet.drew-gnr.xyz](https://easepoet.drew-gnr.xyz/)

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+N` | New poem workspace |
| `Ctrl+L` | Focus word lookup input |
| `Ctrl+R` | Focus rhyme finder input |

---

## Tech

- Pure HTML, CSS, and JavaScript - no frameworks or build tools
- Fonts: [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) (headings) and [Montserrat](https://fonts.google.com/specimen/Montserrat) (UI) via Google Fonts
- Particle background rendered via canvas in `Assets/script.js`
- Stylesheet in `Assets/style.css`

---

## Get the Code

Clone with git:

```bash
git clone https://github.com/drew-codes-things/PoetryInterface.git
```

Or with the [GitHub CLI](https://cli.github.com/):

```bash
gh repo clone drew-codes-things/PoetryInterface
```

## License

MIT - made by [Drew](https://github.com/drew-codes-things)
