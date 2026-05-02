# 🗳️ ElectIQ India — Election Guide (ElectIQ)

![Vercel](https://img.shields.io/badge/Deployed-Vercel-black)
![License](https://img.shields.io/badge/License-MIT-green)
![Google Services](https://img.shields.io/badge/Google-Firebase%20%7C%20Analytics%20%7C%20Translate%20%7C%20NLP-blue)
![AI](https://img.shields.io/badge/AI-Groq%20Llama%203.3-orange)

ElectIQ (ElectIQ India) is a compact, client-first web application that provides an election-focused reference, an in-page AI assistant, and a continuously streaming election-news ticker. The project is designed for quick deployment as a static site and for extensible, privacy-minded local usage.

## Project Structure
├── api/              # Vercel serverless functions
│   ├── chat.js       # Groq AI chat endpoint
│   ├── eci-news.js   # Indian election RSS aggregator
│   ├── news.js       # NewsData.io proxy
│   ├── newsapi.js    # NewsAPI proxy
│   ├── sentiment.js   # Google Cloud Natural Language API proxy
│   ├── results.js    # ECI live results fetcher
│   ├── translate.js   # Google Translate API proxy
│   └── rss.js        # RSS feed proxy
├── tests/            # Unit tests
├── app.js            # Main frontend logic
├── index.html        # App shell
├── style.css         # Styles
├── icon.svg          # App icon
├── package.json      # Node config + test scripts
├── vercel.json       # Vercel routing config
├── config.example.js # Example config for local dev
└── SETUP.md          # Local development guide

What this repo contains (short):
- `index.html` — The single-page app shell (UI, chat, ticker, panels).
- `app.js` — Application logic: chat UI, conversation rendering, and UI glue.
- `style.css` — Visual styles, responsive layout, and animations.
- `icon.svg` — Project brand icon used as favicon and header logo.

Why ElectIQ exists
- Help journalists, civic educators, and engaged voters quickly find clear, nonpartisan answers about Indian election processes, timelines, and current contests.
- Surface short, election-focused headlines and context so users can see what is trending without leaving the single app window.

Key features (explained briefly)
- AI Chat Assistant: An on-page assistant that uses a configured LLM provider to explain procedures, laws, and election jargon. Prompts are constrained to produce nonpartisan, factual answers.
- Streaming Election Marquee: A continuously scrolling headline strip that shows election-only headlines. Headlines are produced by the configured model, sanitized, cached in `localStorage`, and rotated to avoid off-topic content.
- Timeline & Trackers: Interactive timeline stages and election tracker cards that summarize stages of an election (filing, primaries, polling, counting).
- Single-window UX: Chat, references, and news all live inside one responsive layout designed for quick interaction and small screens.

Configuration and security notes
- `config.js` is where you supply your API credentials. Keep keys secret — do not commit private keys to public repositories. The app expects a `CONFIG` object with a `gemini` (or Anthropic) entry.
- If you plan to publish the repo publicly, replace keys with environment-backed proxy endpoints or a server-side token exchange to avoid exposing secrets in the client.

Running locally (brief)
1. Clone or download the repo:

```bash
git clone https://github.com/NayanSaraff/Election-Assistant.git
cd Election-Assistant
```

 2. Set up your API keys:
    - Copy `config.example.js` to `config.js` (it is in `.gitignore` — never commit it).
    - Open `config.js` and replace placeholder keys with your actual API credentials (Gemini, Anthropic, NewsAPI, etc.).
    - Keep `config.js` local only — it should never be pushed to git.

Customization points (where to edit)
- `news-ticker-streaming.js`: Modify prompt templates, refresh intervals, or the hard-coded election-only fallback headlines.
- `app.js`: Adjust message ordering, UI behavior (message alignment, single-window policies), and provider selection logic.
- `style.css`: Tweak look-and-feel, theme colors, and spacing. The header logo and favicon are `icon.svg`.

Troubleshooting
- If headlines are off-topic, check the sanitizer functions in `news-ticker-streaming.js` and refine the model prompt to be stricter.
- If the assistant fails to respond, confirm your API settings in `config.js` and verify network access to the provider.
- For CORS or rate-limit errors, consider routing requests through a small server-side proxy that hides API keys and implements caching.

Contributing
- Suggestions and fixes are welcome. Start by opening an issue describing the change. For code contributions, fork the repo, create a feature branch, and submit a pull request. Focus areas: prompt reliability, headline sanitization, UI accessibility, and documentation.

License & attribution
- This project is provided under the terms in the `LICENSE` file. Third-party resources (fonts, icons) are noted in the source files where used.

Support
- If you want help setting up a secure API proxy, improving prompt reliability, or adding screenshots and examples to the README, ask and I can make the changes.

Thank you for using ElectIQ — together we can make election information more accessible and factual.
