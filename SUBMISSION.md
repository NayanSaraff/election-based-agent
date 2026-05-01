# 📋 Google Project Submission

## Project Overview

**Project Name:** ElectIQ — AI-Powered Civic Education Platform  
**Category:** Civic Technology / Education  
**Primary Technology:** Anthropic Claude API, HTML5, CSS3, JavaScript  
**Target Audience:** Citizens aged 16–65 seeking to understand elections and democratic processes  

---

## Problem Statement

Civic literacy is declining. Many citizens feel confused, overwhelmed, or excluded from understanding how elections actually work. Complex legal language, partisan media coverage, and fragmented information sources make it difficult for people — especially first-time voters — to confidently participate in democracy.

**ElectIQ solves this by:**
- Making election information conversational, accessible, and jargon-free
- Using AI to answer any civic question with accuracy and zero political bias
- Visualising the full election timeline interactively
- Testing and reinforcing civic knowledge through AI-generated quizzes

---

## How It Works

### 1. AI Chat Assistant
Users type any election-related question in natural language. Claude (Anthropic's AI) responds with:
- Clear, structured explanations
- Bullet points and bolded key terms
- Automatic follow-up question suggestions to deepen learning
- Strictly nonpartisan framing

### 2. Interactive Election Timeline
A visual 6-stage journey through the election process:
1. Candidate Filing
2. Primaries & Caucuses
3. Party Conventions
4. Voter Registration
5. Election Day
6. Counting & Certification

Each stage is expandable with detailed bullet points and a "Ask ElectIQ" button that opens the AI chat with a pre-filled question.

### 3. Civic Quiz
AI-generated multiple-choice questions across 6 categories:
- General, Voting Rights, Electoral College, Primaries, History, Laws & Rules

Questions are unique every session. Users receive explanations for each answer and a final score.

---

## Technical Architecture

```
┌────────────────────────────────────────────────────┐
│                    Browser (Client)                │
│                                                    │
│  index.html ──► style.css ──► app.js              │
│                                    │               │
│                          Anthropic API             │
│                        /v1/messages                │
│                    (claude-sonnet-4-20250514)       │
└────────────────────────────────────────────────────┘
```

**Stack:**
- Frontend: Pure HTML5 / CSS3 / Vanilla JS (no frameworks, no build tools)
- AI: Anthropic Claude API (claude-sonnet-4-20250514)
- Fonts: Google Fonts (Fraunces, Sora, JetBrains Mono)
- Deployment: Any static host (GitHub Pages, Vercel, Netlify)

---

## Impact & Value

| Metric | Description |
|--------|-------------|
| **Accessibility** | Zero install, opens in any browser |
| **Equity** | Free, nonpartisan, jargon-free |
| **Scalability** | Static site — handles any traffic |
| **Extensibility** | Easy to add state-specific data, multilingual support |
| **Civic Reach** | Applicable to all US elections; framework portable globally |

---

## Alignment with Google's Mission

ElectIQ advances **digital literacy** and **civic participation** — core pillars of Google's social impact work. Specifically:

- **Democratising information**: Breaking down complex civic processes for all literacy levels
- **AI for Good**: Applying generative AI responsibly with strict nonpartisan guardrails
- **Open & accessible**: No login, no paywall, no tracking
- **Education**: Serves students, first-time voters, educators, and civically curious citizens

---

## Demo

1. Open `index.html` in any browser
2. Click **"How does the Electoral College work?"** in the welcome screen
3. Read the structured AI response and click a follow-up chip
4. Switch to **Timeline** tab — click "Stage 5: Election Day" to expand it
5. Switch to **Quiz** tab — select "Voting Rights" and start a 10-question quiz

---

## Team

| Role | Name |
|------|------|
| Design & Development | [Your Name] |
| Civic Content Review | [Team Member] |
| Accessibility | [Team Member] |

---

## Links

- **GitHub Repository:** `https://github.com/YOUR_USERNAME/electiq`
- **Live Demo:** `https://YOUR_USERNAME.github.io/electiq`
- **Contact:** `your@email.com`

---

## Licence

MIT — free to use, modify, and distribute with attribution.
