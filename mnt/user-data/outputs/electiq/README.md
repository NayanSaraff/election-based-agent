# 🗳️ ElectIQ — AI-Powered Civic Education Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Anthropic Claude](https://img.shields.io/badge/Powered%20by-Claude%20AI-orange)](https://anthropic.com)
[![No Build Required](https://img.shields.io/badge/No%20Build-Required-blue)](#)

> An interactive, AI-powered web application that helps citizens understand elections, voting processes, timelines, and democratic systems — clearly, accessibly, and without political bias.

---

## 📸 Features

### 💬 AI Chat Assistant
Ask any election question in plain language. ElectIQ responds with structured, nonpartisan explanations and automatically suggests follow-up questions to guide your learning.

### 📅 Interactive Election Timeline
A visual, expandable 6-stage timeline — from Candidate Filing all the way through to Certification — with key facts and direct links into the AI for deeper exploration.

### 🧠 Civic Knowledge Quiz
AI-generated quiz questions across 6 categories (General, Voting Rights, Electoral College, Primaries, History, Laws & Rules). Every quiz is unique. Track your score across 10 questions.

### 🗂️ Quick Topics Sidebar
One-click access to 14 common election topics — Voter Registration, ID Requirements, Electoral College, Gerrymandering, Campaign Finance, and more.

---

## 🚀 Getting Started

### Option A — Open directly (no server needed)
```bash
git clone https://github.com/YOUR_USERNAME/electiq.git
cd electiq
open index.html   # macOS
# or: start index.html  (Windows)
# or: xdg-open index.html  (Linux)
```

### Option B — Run with a local server (recommended)
```bash
# Python 3
python3 -m http.server 8080

# Node.js (npx)
npx serve .

# Then open: http://localhost:8080
```

### API Key
The app uses the **Anthropic Claude API**. Your API key is handled automatically by the claude.ai environment. If deploying independently, see [`docs/SETUP.md`](docs/SETUP.md).

---

## 📁 Project Structure

```
electiq/
│
├── index.html              # Main application entry point
│
├── assets/
│   ├── css/
│   │   └── style.css       # All styles (dark civic theme, responsive)
│   └── js/
│       └── app.js          # All application logic (chat, timeline, quiz)
│
├── docs/
│   ├── SETUP.md            # Configuration and deployment guide
│   ├── CONTRIBUTING.md     # How to contribute
│   └── SUBMISSION.md       # Google project submission details
│
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| Primary (Teal) | `#2dd4bf` | Actions, highlights, AI responses |
| Accent (Amber) | `#f59e0b` | User messages, quiz scoring |
| Background | `#0b1120` | App background |
| Surface | `#111827` | Cards, panels |
| Typography | Fraunces (headings) + Sora (body) | Editorial civic aesthetic |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Structure | HTML5 (semantic, accessible) |
| Styling | CSS3 (custom properties, grid, flexbox, animations) |
| Logic | Vanilla JavaScript (ES6+, async/await) |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Fonts | Google Fonts (Fraunces, Sora, JetBrains Mono) |
| Build | None — zero dependencies, zero build step |

---

## ♿ Accessibility

- Semantic HTML5 elements (`header`, `main`, `nav`, `section`, `aside`)
- ARIA roles and labels throughout (`role="tabpanel"`, `aria-live`, `aria-label`)
- Keyboard navigable
- Sufficient colour contrast ratios (WCAG AA)
- Responsive layout for mobile, tablet, and desktop

---

## 🌐 Deployment

### GitHub Pages
```bash
# Push to main branch, then enable GitHub Pages in repository Settings → Pages
# Select: Deploy from branch → main → / (root)
```

### Vercel / Netlify
Drop the folder into Vercel or Netlify's dashboard — no configuration needed.

### Custom Server
Any static file host works. No server-side processing required.

---

## 🗺️ Roadmap

- [ ] Multilingual support (Spanish, Hindi priority)
- [ ] State-specific election information
- [ ] Voter registration deadlines calendar
- [ ] Shareable quiz results
- [ ] Dark/light theme toggle
- [ ] Offline mode (service worker)
- [ ] Accessibility audit & WCAG AAA improvements

---

## 🤝 Contributing

Contributions are welcome! Please read [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) before opening a pull request.

---

## 📄 License

This project is licensed under the **MIT License** — see [`LICENSE`](LICENSE) for details.

---

## 🙏 Acknowledgements

- [Anthropic](https://anthropic.com) for the Claude API
- [Google Fonts](https://fonts.google.com) for Fraunces, Sora, and JetBrains Mono
- [vote.gov](https://vote.gov) — the official US voter information resource

---

*ElectIQ is a nonpartisan civic education tool. It does not promote any political party, candidate, or ideology.*
