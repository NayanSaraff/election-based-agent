# ⚙️ Setup & Configuration Guide

## Prerequisites

- A modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Internet connection (for Anthropic API calls and Google Fonts)
- An Anthropic API key (if deploying outside of claude.ai)

---

## Running Locally

### No-server method
Simply open `index.html` in your browser:
```bash
open index.html         # macOS
start index.html        # Windows
xdg-open index.html     # Linux
```

### With a local dev server (recommended for development)
```bash
# Python 3
python3 -m http.server 8080

# Node.js
npx serve .
npx http-server .

# Then visit: http://localhost:8080
```

---

## API Key Configuration

ElectIQ uses the **Anthropic Claude API** (`claude-sonnet-4-20250514`) for:
1. AI chat responses
2. Quiz question generation

### In the claude.ai environment
No configuration needed — the API key is handled automatically by the platform.

### For independent deployment
Open `assets/js/app.js` and add your API key to the fetch headers:

```javascript
// In the fetch calls, add your key:
headers: {
  'Content-Type': 'application/json',
  'x-api-key': 'YOUR_ANTHROPIC_API_KEY',
  'anthropic-version': '2023-06-01',
},
```

> ⚠️ **Security Warning**: Never expose API keys in client-side code in production. For production deployments, proxy API calls through a backend server or use environment variables via a serverless function.

### Recommended production setup
Use a serverless function (Vercel Functions, Netlify Functions, Cloudflare Workers) to proxy API calls:

```
Browser → Your Backend → Anthropic API
```

---

## Environment Variables (for backend proxy)

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `ALLOWED_ORIGIN` | CORS origin (your domain) |

---

## Customisation

### Changing the AI model
In `assets/js/app.js`, update:
```javascript
const MODEL = 'claude-sonnet-4-20250514';
```

### Modifying the system prompt
Edit `CHAT_SYSTEM` and `QUIZ_SYSTEM` constants in `assets/js/app.js`.

### Adding new timeline stages
Edit the `STAGES` array in `assets/js/app.js` — each stage has: `n`, `cls`, `emoji`, `time`, `title`, `desc`, `details[]`, `prompt`.

### Adding quiz categories
Edit the `QUIZ_CATEGORIES` array in `assets/js/app.js`.

### Changing colours
All design tokens are CSS custom properties in `assets/css/style.css` under `:root { }`.

---

## Deployment Checklist

- [ ] API key secured (not exposed in client-side code for production)
- [ ] `index.html` served from root
- [ ] `assets/` folder in same directory as `index.html`
- [ ] HTTPS enabled (required for API calls in most browsers)
- [ ] CORS configured if using a backend proxy
