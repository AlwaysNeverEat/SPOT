# SPOT

Landing page prototype for **СТО SPOT**, a car service network focused on oil-change and maintenance services.

## What this project contains
- A single-page marketing site in Russian (`index.html`).
- Custom styling for responsive layouts and animated sections (`styles.css`).
- Vanilla JavaScript for interactivity (`main.js`), including:
  - sticky header behavior,
  - parallax effects,
  - horizontal scroll section,
  - animated counters,
  - city selector modal with saved state in `localStorage`,
  - dynamic phone number updates by selected city.
- Static assets in `photos/` and `video/`.

## Current page structure
The page currently includes:
- Hero section with background video/fallback image and primary CTA,
- Service cards section,
- Pricing CTA,
- “How it works” flow,
- Oil brand block,
- Station locations section,
- Contact/CTA elements with city-dependent phone links.

## Tech stack
- **HTML5**
- **CSS3**
- **Vanilla JavaScript (ES6+)**
- No framework or build tool required.

## Run locally
Because this is a static site, you can open `index.html` directly, or run a local static server.

### Option 1: open directly
- Open `index.html` in your browser.

### Option 2: local server (recommended)
```bash
python3 -m http.server 8000
```
Then visit `http://localhost:8000`.

## Repository layout
```text
.
├── index.html
├── styles.css
├── main.js
├── photos/
└── video/
```

## Notes from recent history
Recent commits indicate ongoing work on hero media behavior and mobile layout polish (including fallback handling for hero video and image assets).

## Next improvements
- Replace hardcoded business numbers/content with a config source.
- Split large `main.js` behaviors into modules.
- Add basic linting/formatting and CI checks.
