'use strict';

const CONFIG = window.ELECTIQ_CONFIG || {};

const GEMINI_COOLDOWN_KEY = 'electiq_gemini_cooldown_until';
const GEMINI_COOLDOWN_MS = 60 * 60 * 1000;

function getGeminiCooldownUntil() {
  try {
    return Number(localStorage.getItem(GEMINI_COOLDOWN_KEY) || 0);
  } catch (error) {
    return 0;
  }
}

function setGeminiCooldown(durationMs = GEMINI_COOLDOWN_MS) {
  try {
    localStorage.setItem(GEMINI_COOLDOWN_KEY, String(Date.now() + durationMs));
  } catch (error) {
    // Ignore storage errors.
  }
}

function isGeminiCooldownActive() {
  return Date.now() < getGeminiCooldownUntil();
}

function isGeminiRateLimitError(error) {
  const message = String(error?.message || '');
  return message.includes('Gemini API error 429') || message.includes('Gemini error 429') || message.includes('429');
}

const ELECTION_HEADLINE_KEYWORDS = [
  'election',
  'elections',
  'poll',
  'polling',
  'counting',
  'results',
  'result',
  'candidate',
  'candidates',
  'nomination',
  'nominations',
  'campaign',
  'campaigning',
  'manifesto',
  'voter',
  'voting',
  'electoral college',
  'lok sabha',
  'rajya sabha',
  'vidhan sabha',
  'assembly election',
  'presidential election',
  'vice presidential election',
  'eci',
  'evm',
  'vvpat',
];

function isElectionHeadline(title) {
  const normalized = String(title || '').toLowerCase();
  return ELECTION_HEADLINE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function filterElectionHeadlines(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      title: String(item?.title || '').trim(),
      url: item?.url || '#',
    }))
    .filter((item) => item.title && isElectionHeadline(item.title));
}

function getApiConfig() {
  if (CONFIG.provider === 'anthropic' && CONFIG.anthropic?.apiKey) {
    return { provider: 'anthropic', ...CONFIG.anthropic };
  }
  if (CONFIG.provider === 'gemini' && CONFIG.gemini?.apiKey) {
    return { provider: 'gemini', ...CONFIG.gemini };
  }
  if (CONFIG.gemini?.apiKey) {
    return { provider: 'gemini', ...CONFIG.gemini };
  }
  if (CONFIG.anthropic?.apiKey) {
    return { provider: 'anthropic', ...CONFIG.anthropic };
  }
  return { provider: CONFIG.provider || 'gemini', apiUrl: '', apiKey: '', model: '' };
}

const CHAT_SYSTEM = `You are ElectIQ India, a friendly, neutral civic education assistant.

Rules:
1. Stay strictly nonpartisan. Never endorse or attack a party, candidate, or ideology.
2. Always assume the user wants information about India unless they explicitly ask about another country.
3. Never default to the United States or use US election examples unless the user clearly requests a comparison or asks about the US directly.
4. Prioritize Indian election systems: Lok Sabha, Rajya Sabha, Vidhan Sabha, President, Vice-President, ECI, EVM, VVPAT, MCC, voter registration, counting, certification, and election law.
5. If the user asks a broad question like "how elections work" or "electoral college", answer for India first.
6. If the user asks for current election status, use the page snapshot date of 1 May 2026 unless the prompt itself provides fresher information.
7. Do not invent legal provisions, dates, or results. If unsure, say so clearly.
8. Teach step by step. Prefer a clear flow such as "big picture", "how it works", "why it matters", and "next step" when appropriate.
9. Explain terms in plain language before using jargon-heavy detail.
10. Use simple, accurate language with short sections and bullets when helpful.
11. End every reply with this exact JSON line and nothing after it:
FOLLOWUPS:["question 1?","question 2?","question 3?"]`;

const QUIZ_SYSTEM = `You generate one multiple-choice quiz question about Indian elections only.

Return valid JSON only:
{
  "question": "Question text?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct": 0,
  "explanation": "Short explanation."
}`;

const NEWS_TICKER_CONFIG = {
  refreshMs: 15 * 60 * 1000,
  cacheKey: 'electiq_ticker_cache',
  cacheTtlMs: 10 * 60 * 1000, // Cache for 10 minutes
  proxyBase: 'https://api.allorigins.win/raw?url=',
  feeds: [
    'https://news.google.com/rss/search?q=india+election+OR+eci+OR+assembly+election&hl=en-IN&gl=IN&ceid=IN:en',
    'https://news.google.com/rss/search?q=site:eci.gov.in+election+commission+india&hl=en-IN&gl=IN&ceid=IN:en',
  ],
  fallback: [
    { title: 'Assam, Kerala, and Puducherry polling completed; counting scheduled for 4 May 2026', url: 'https://www.eci.gov.in' },
    { title: 'Tamil Nadu Assembly election completed in a single phase on 23 April 2026', url: 'https://www.eci.gov.in' },
    { title: 'West Bengal completed its final polling phase on 29 April 2026; official counting due on 4 May 2026', url: 'https://www.eci.gov.in' },
    { title: 'Track official result updates on counting day through the ECI results portal', url: 'https://results.eci.gov.in' },
  ],
};

// Fetch headlines from NewsData.io (PRIMARY SOURCE - CORS-friendly, real-time news)
async function fetchNewsDataIoHeadlines() {
  const config = CONFIG.newsdataio;
  if (!config?.apiKey || !config?.baseUrl) {
    throw new Error('NewsData.io not configured');
  }
  const url = new URL(config.baseUrl);
  url.searchParams.append('q', 'India election');
  url.searchParams.append('country', 'in');
  url.searchParams.append('language', 'en');
  url.searchParams.append('sort', 'latest');
  url.searchParams.append('limit', '10');
  url.searchParams.append('apikey', config.apiKey);

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`NewsData.io error ${res.status}: ${body}`);
  }
  const data = await res.json();
  if (!data.results || !data.results.length) {
    throw new Error('No articles returned from NewsData.io');
  }
  return filterElectionHeadlines(data.results.slice(0, 8).map((article) => { let t = String(article.title || "").trim(); if (t.includes("title:")) t = t.split("title:")[1]; t = t.replace(/"/g, " ").replace(/{/g, " ").replace(/}/g, " ").substring(0, 150).trim(); return { title: t, url: article.link || "#" }; }));
}

// Fetch headlines from NewsAPI (SECONDARY SOURCE)
async function fetchNewsApiHeadlines() {
  const config = CONFIG.newsapi;
  if (!config?.apiKey || !config?.baseUrl) {
    throw new Error('NewsAPI not configured');
  }
  const url = new URL(config.baseUrl);
  url.searchParams.append('q', 'India election OR Assembly OR election commission');
  url.searchParams.append('language', 'en');
  url.searchParams.append('sortBy', 'publishedAt');
  url.searchParams.append('pageSize', '10');
  url.searchParams.append('apiKey', config.apiKey);

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`NewsAPI error ${res.status}: ${body}`);
  }
  const data = await res.json();
  if (!data.articles || !data.articles.length) {
    throw new Error('No articles returned from NewsAPI');
  }
  return filterElectionHeadlines(data.articles.slice(0, 8).map((article) => ({
    title: article.title || '',
    url: article.url || '#',
  })));
}

const state = {
  activeTab: 'assistant',
  chat: { history: [], loading: false },
  tracker: {
    selectedId: 'assam-2026',
    view: 'list',
    liveById: {},
    loadingId: null,
  },
  quiz: {
    category: 'General',
    score: 0,
    total: 0,
    answered: false,
    loading: false,
    current: null,
  },
};

const TOPIC_GROUPS = [
  {
    label: 'Basics',
    items: [
      ['What does the Election Commission of India do?', 'ECI role'],
      ['How do I register as a voter in India?', 'Voter registration'],
      ['How do EVM and VVPAT work in India?', 'EVM + VVPAT'],
      ['What is the Model Code of Conduct?', 'MCC'],
    ],
  },
  {
    label: 'Current 2026 Polls',
    items: [
      ['Summarize the 2026 West Bengal Assembly election timeline.', 'West Bengal 2026'],
      ['Summarize the 2026 Tamil Nadu Assembly election timeline.', 'Tamil Nadu 2026'],
      ['Which elections are ongoing in India as of 1 May 2026?', 'Ongoing elections'],
      ['Explain the 2026 bypolls across Goa, Gujarat, Karnataka, Maharashtra, Nagaland, and Tripura.', '2026 bypolls'],
    ],
  },
  {
    label: 'Constitution & Law',
    items: [
      ['Explain Articles 324, 325, and 326 of the Constitution of India.', 'Constitution'],
      ['What is the Representation of the People Act, 1950?', 'RPA 1950'],
      ['What is the Representation of the People Act, 1951?', 'RPA 1951'],
      ['How is the President of India elected through the electoral college?', 'President electoral college'],
    ],
  },
];

const STAGES = [
  {
    n: 1,
    cls: 's1',
    emoji: '1',
    time: 'Before poll notification',
    title: 'Electoral Roll Revision',
    desc: 'The voter list is revised, new electors are added, corrections are processed, and Booth Level Officers verify records.',
    details: [
      'The legal base mainly comes from the Representation of the People Act, 1950 and the Registration of Electors Rules, 1960.',
      'Citizens must be 18+ on the qualifying date and ordinarily resident in the constituency.',
      'Voters can add, delete, or correct entries before polling.',
      'EPIC and roll entries are used to verify eligibility at the polling station.',
    ],
    prompt: 'Explain how electoral roll revision and voter registration work in India.',
  },
  {
    n: 2,
    cls: 's2',
    emoji: '2',
    time: 'After ECI schedule announcement',
    title: 'Notification And Nominations',
    desc: 'The Election Commission announces the poll schedule, nominations open, scrutiny happens, and candidates may withdraw.',
    details: [
      'Different states or phases may have different notification dates.',
      'Returning Officers scrutinize nominations for legal validity.',
      'After withdrawal, the final candidate list and symbols are settled.',
      'The Model Code of Conduct takes effect once the schedule is announced.',
    ],
    prompt: 'How do notification, nomination, scrutiny, and withdrawal work in Indian elections?',
  },
  {
    n: 3,
    cls: 's3',
    emoji: '3',
    time: 'Campaign period',
    title: 'Campaign And MCC',
    desc: 'Political parties and candidates campaign under expenditure rules and the Model Code of Conduct.',
    details: [
      'The MCC regulates speeches, misuse of official machinery, campaign conduct, and announcements by governments.',
      'Expenditure monitoring teams track candidate spending.',
      'Campaign silence applies before polling in the relevant constituency.',
      'Star campaigners, rallies, door-to-door outreach, and media outreach all remain subject to ECI rules.',
    ],
    prompt: 'What is the Model Code of Conduct and how is campaigning regulated in India?',
  },
  {
    n: 4,
    cls: 's4',
    emoji: '4',
    time: 'Polling day',
    title: 'Polling With EVM And VVPAT',
    desc: 'Voters verify identity, cast a secret ballot on EVM, and see a brief VVPAT slip display.',
    details: [
      'Polling stations are run by Presiding Officers and polling teams.',
      'Voter identity is checked against the electoral roll and approved documents.',
      'EVMs record the vote electronically and VVPAT provides voter-verifiable paper audit confirmation.',
      'Special arrangements may exist for absentee voters in defined categories and postal ballots where allowed.',
    ],
    prompt: 'Walk me through what happens at an Indian polling station on election day.',
  },
  {
    n: 5,
    cls: 's5',
    emoji: '5',
    time: 'After polling closes',
    title: 'Strong Rooms, Counting, Results',
    desc: 'Machines and records are sealed, stored securely, then counting takes place on the notified date.',
    details: [
      'Candidates and agents may observe key parts of the process under the rules.',
      'Postal ballots are counted before EVM rounds in many contests.',
      'Round-wise trends may appear before the final declaration by the Returning Officer.',
      'The winner is declared once counting is complete and the statutory process is satisfied.',
    ],
    prompt: 'Explain how counting and result declaration work in India after polling closes.',
  },
  {
    n: 6,
    cls: 's6',
    emoji: '6',
    time: 'After results',
    title: 'Government Formation Or Indirect Election',
    desc: 'In direct elections, the winning side forms government if it has numbers. In indirect elections, an electoral college may choose the office-holder.',
    details: [
      'Lok Sabha majorities determine who forms the Union government.',
      'State Assembly majorities determine who forms the state government.',
      'The President is elected indirectly under Articles 54 and 55.',
      'The Vice-President is elected indirectly under Article 66.',
    ],
    prompt: 'Explain the difference between direct elections in India and the President or Vice-President electoral college.',
  },
];

const TRACKER_ITEMS = [
  {
    id: 'assam-2026',
    title: 'Assam Assembly Election 2026',
    seats: '126 seats',
    majority: '64',
    electorate: '126 constituencies in contest',
    schedule: 'Single phase polling on 9 April 2026',
    countingDate: '2026-05-04T08:00:00+05:30',
    status: 'Polling completed; counting scheduled for 4 May 2026',
    detail: 'This is a direct election to the Assam Legislative Assembly. The outgoing Assembly term ends in May 2026, and official trends begin only on counting day.',
    detailPoints: [
      'Election type: State assembly general election',
      'Polling model: Single phase',
      'Official counting day: 4 May 2026',
      'No official leader or vote total exists before counting starts',
    ],
    keywords: ['assam'],
  },
  {
    id: 'kerala-2026',
    title: 'Kerala Assembly Election 2026',
    seats: '140 seats',
    majority: '71',
    electorate: '140 constituencies in contest',
    schedule: 'Single phase polling on 9 April 2026',
    countingDate: '2026-05-04T08:00:00+05:30',
    status: 'Polling completed; counting scheduled for 4 May 2026',
    detail: 'Kerala voted in one phase. The result determines the next Keralam Legislative Assembly government.',
    detailPoints: [
      'Election type: State assembly general election',
      'Polling model: Single phase',
      'Official counting day: 4 May 2026',
      'Live round-wise data should appear only after counting opens',
    ],
    keywords: ['kerala', 'keralam'],
  },
  {
    id: 'puducherry-2026',
    title: 'Puducherry Assembly Election 2026',
    seats: '30 elected seats',
    majority: '16',
    electorate: '30 elected seats in contest',
    schedule: 'Single phase polling on 9 April 2026',
    countingDate: '2026-05-04T08:00:00+05:30',
    status: 'Polling completed; counting scheduled for 4 May 2026',
    detail: 'Puducherry elects 30 assembly members directly; three additional members are nominated separately.',
    detailPoints: [
      'Election type: Union territory assembly general election',
      'Polling model: Single phase',
      'Official counting day: 4 May 2026',
      'Live trends should come from ECI when the count starts',
    ],
    keywords: ['puducherry'],
  },
  {
    id: 'tamil-nadu-2026',
    title: 'Tamil Nadu Assembly Election 2026',
    seats: '234 seats',
    majority: '118',
    electorate: '234 constituencies in contest',
    schedule: 'Single phase polling on 23 April 2026',
    countingDate: '2026-05-04T08:00:00+05:30',
    status: 'Polling completed; counting scheduled for 4 May 2026',
    detail: 'Tamil Nadu voted in one phase. The majority mark in a 234-seat House is 118.',
    detailPoints: [
      'Election type: State assembly general election',
      'Polling model: Single phase',
      'Official counting day: 4 May 2026',
      'Seat leads and candidate vote totals are not official before counting day',
    ],
    keywords: ['tamil nadu'],
  },
  {
    id: 'west-bengal-2026',
    title: 'West Bengal Assembly Election 2026',
    seats: '294 seats',
    majority: '148',
    electorate: '294 constituencies in contest',
    schedule: 'Phase 1: 23 April 2026 · Phase 2: 29 April 2026',
    countingDate: '2026-05-04T08:00:00+05:30',
    status: 'Final polling phase completed on 29 April 2026; counting scheduled for 4 May 2026',
    detail: 'West Bengal is the only major 2026 assembly contest in this set to vote in more than one phase.',
    detailPoints: [
      'Election type: State assembly general election',
      'Polling model: Two phases',
      'Final polling date: 29 April 2026',
      'Official counting day: 4 May 2026',
    ],
    keywords: ['west bengal', 'bengal'],
  },
  {
    id: 'bypolls-2026',
    title: 'Assembly Bypolls Across 6 States',
    seats: '8 assembly constituencies',
    majority: 'Not applicable',
    electorate: 'Seats across Goa, Gujarat, Karnataka, Maharashtra, Nagaland, and Tripura',
    schedule: 'Polling on 9 April 2026 and 23 April 2026',
    countingDate: '2026-05-04T08:00:00+05:30',
    status: 'Polling completed; counting scheduled for 4 May 2026',
    detail: 'Bypoll constituencies were announced in Goa, Gujarat, Karnataka, Maharashtra, Nagaland, and Tripura to fill vacancies before the end of the normal term.',
    detailPoints: [
      'Election type: Assembly by-elections',
      'Polling happened in two waves',
      'Official counting day: 4 May 2026',
      'Statewide majority math does not apply because these are vacancy-filling contests',
    ],
    keywords: ['bye elections', 'bye election', 'bypoll', 'bypolls'],
  },
];

const LIVE_RESULTS_MAIN_URLS = [
  'https://results.eci.gov.in/ResultAcGenMay2026/index.htm',
  'https://results.eci.gov.in/ResultAcGenMay2026/index.html',
];

const DATE_ITEMS = [
  { label: 'Assam polling', value: '9 April 2026' },
  { label: 'Kerala polling', value: '9 April 2026' },
  { label: 'Puducherry polling', value: '9 April 2026' },
  { label: 'Tamil Nadu polling', value: '23 April 2026' },
  { label: 'West Bengal phase 1', value: '23 April 2026' },
  { label: 'West Bengal phase 2', value: '29 April 2026' },
  { label: '2026 bypoll count day', value: '4 May 2026' },
  { label: 'Major 2026 state result day', value: '4 May 2026' },
];

const SOURCE_ITEMS = [
  {
    label: 'ECI and Legislative Department',
    href: 'https://www.eci.gov.in',
    note: 'Primary reference for election administration and legal framework.',
  },
  {
    label: 'Representation of the People Act, 1950',
    href: 'https://lddashboard.legislative.gov.in/electionlawsrelated/representation-people-act-1950-43-1950',
    note: 'Electoral rolls and voter registration framework.',
  },
  {
    label: 'Representation of the People Act, 1951',
    href: 'https://lddashboard.legislative.gov.in/electionlawsrelated/representation-people-act-1951-act-no-43-1951',
    note: 'Conduct of elections, qualifications, disqualifications, and disputes.',
  },
  {
    label: 'Vice-President election rules overview',
    href: 'https://vicepresidentofindia.gov.in/election-vice-president',
    note: 'Official explanation of the Vice-President electoral college.',
  },
  {
    label: '2026 election schedule reporting',
    href: 'https://www.onmanorama.com/news/india/2026/03/15/assembly-elections-election-commission-poll-schedule-4-state-ut-kerala-tamil-nadu-assam-west-bengal-puducherry.html',
    note: 'Used for the 2026 assembly schedule snapshot in this static app.',
  },
  {
    label: 'ECI Results Portal',
    href: 'https://results.eci.gov.in',
    note: 'Official trends and results page used by the live refresh flow when counting data is published.',
  },
];

const LAW_ITEMS = [
  {
    title: 'Article 324',
    body: 'Gives the Election Commission of India superintendence, direction, and control over elections to Parliament, State Legislatures, and the offices of President and Vice-President.',
  },
  {
    title: 'Articles 325 and 326',
    body: 'Article 325 bars exclusion from electoral rolls on religion, race, caste, or sex grounds. Article 326 establishes adult suffrage for eligible citizens.',
  },
  {
    title: 'Articles 327 and 329',
    body: 'Article 327 empowers Parliament to make election laws. Article 329 limits court intervention during the election process, with challenges usually routed through election petitions afterward.',
  },
  {
    title: 'Representation of the People Act, 1950',
    body: 'Deals mainly with allocation of seats and preparation and revision of electoral rolls.',
  },
  {
    title: 'Representation of the People Act, 1951',
    body: 'Covers actual conduct of elections, corrupt practices, qualifications, disqualifications, and election disputes.',
  },
  {
    title: 'Registration of Electors Rules, 1960',
    body: 'Explains how electoral rolls are prepared, corrected, maintained, and updated.',
  },
  {
    title: 'Conduct of Elections Rules, 1961',
    body: 'Provides procedural rules for nominations, polling, counting, forms, and related operations.',
  },
  {
    title: 'Model Code of Conduct',
    body: 'Not an Act of Parliament, but an ECI-enforced code that shapes campaign conduct once elections are announced.',
  },
];

const ELECTORAL_COLLEGE_INFO = {
  title: 'India’s Electoral College',
  text: 'India does not use a US-style electoral college for electing the Prime Minister. The Prime Minister emerges from Lok Sabha majority support. India does use indirect electoral colleges for the President and Vice-President.',
  points: [
    'President of India: elected members of both Houses of Parliament plus elected members of State Legislative Assemblies and the legislative assemblies of Delhi and Puducherry take part.',
    'Vice-President of India: members of both Houses of Parliament form the electoral college.',
    'These elections use proportional representation by means of the single transferable vote and secret ballot.',
  ],
};

const QUIZ_CATEGORIES = [
  'General',
  'Constitution',
  'Parliament & Assemblies',
  'EVM & VVPAT',
  'Voter Registration',
  'Electoral College',
];

const QUIZ_FALLBACK = {
  'General': [
    {
      question: "What is the minimum age requirement to vote in India?",
      options: ["16 years", "18 years", "21 years", "25 years"],
      correct: 1,
      explanation: "Indian citizens who are 18 years or older can vote in elections."
    },
    {
      question: "Which body is responsible for conducting elections in India?",
      options: ["Prime Minister's Office", "Election Commission of India", "Ministry of Law", "Supreme Court"],
      correct: 1,
      explanation: "The Election Commission of India (ECI) is the constitutional body responsible for conducting elections."
    }
  ],
  'Constitution': [
    {
      question: "In which year was the Indian Constitution adopted?",
      options: ["1947", "1950", "1952", "1955"],
      correct: 1,
      explanation: "The Indian Constitution was adopted on 26 January 1950."
    },
    {
      question: "Who is the chairperson of the Election Commission?",
      options: ["Appointed by President", "Appointed by Prime Minister", "Elected by Parliament", "Appointed by Cabinet"],
      correct: 0,
      explanation: "The Election Commissioners are appointed by the President of India."
    }
  ],
  'Parliament & Assemblies': [
    {
      question: "How many members are in the Lok Sabha?",
      options: ["500", "545", "552", "600"],
      correct: 1,
      explanation: "The Lok Sabha has 545 members (530 from states + 13 from union territories + 2 nominated)."
    },
    {
      question: "What is the term of the Lok Sabha?",
      options: ["3 years", "4 years", "5 years", "6 years"],
      correct: 2,
      explanation: "The Lok Sabha's normal term is 5 years, unless dissolved earlier."
    }
  ],
  'EVM & VVPAT': [
    {
      question: "What does VVPAT stand for?",
      options: ["Voice Voting & Polling Assessment", "Voter Verified Paper Audit Trail", "Valid Vote Process Assessment Tool", "Voting Verification & Poll Authentication"],
      correct: 1,
      explanation: "VVPAT (Voter Verified Paper Audit Trail) provides a paper record of each electronic vote."
    },
    {
      question: "What is the primary function of an EVM?",
      options: ["Count votes manually", "Record votes electronically", "Train election officials", "Verify voter identity"],
      correct: 1,
      explanation: "Electronic Voting Machines (EVMs) record votes electronically for accuracy and efficiency."
    }
  ],
  'Voter Registration': [
    {
      question: "Where can a citizen register to vote?",
      options: ["Police station", "District office", "Designated enrollment center or online", "Post office"],
      correct: 2,
      explanation: "Voter registration can be done at enrollment centers or through the NVSP online portal."
    },
    {
      question: "What document is required for voter registration?",
      options: ["Aadhaar or passport", "Driving license", "Any of the above", "Employment letter"],
      correct: 2,
      explanation: "Various documents like Aadhaar, passport, driving license, etc., are accepted for voter registration."
    }
  ],
  'Electoral College': [
    {
      question: "Who elects the President of India?",
      options: ["Citizens of India", "Electoral College members", "Members of Parliament", "State governments"],
      correct: 1,
      explanation: "The President is elected by members of an Electoral College comprising MPs and state legislators."
    },
    {
      question: "What is the term of the President of India?",
      options: ["3 years", "4 years", "5 years", "6 years"],
      correct: 2,
      explanation: "The President of India serves a term of 5 years and can be re-elected."
    }
  ]
};

function getFallbackQuizQuestion(category) {
  const bucket = QUIZ_FALLBACK[category] || QUIZ_FALLBACK.General;
  return bucket[Math.floor(Math.random() * bucket.length)] || QUIZ_FALLBACK.General[0];
}

function buildLocalFollowups(text) {
  const prompt = String(text || '').toLowerCase();
  if (prompt.includes('president') || prompt.includes('electoral college')) {
    return [
      'Who can vote in the President election of India?',
      'How is vote value calculated for President election?',
      'How is the Vice-President elected in India?',
    ];
  }
  if (prompt.includes('evm') || prompt.includes('vvpat')) {
    return [
      'How does VVPAT verification work?',
      'Why are EVMs used in India?',
      'Who secures EVMs before counting?',
    ];
  }
  if (prompt.includes('register') || prompt.includes('voter')) {
    return [
      'How do I register to vote online in India?',
      'Which documents are needed for voter registration?',
      'How can I correct details on my voter card?',
    ];
  }
  return [
    'Explain Lok Sabha election steps in simple words.',
    'What are key election laws in India?',
    'How does counting and result declaration work?',
  ];
}

function buildLocalChatResponse(userText) {
  const prompt = String(userText || '').trim();
  const lower = prompt.toLowerCase();
  let answer = '';

  if (lower.includes('president') || lower.includes('electoral college')) {
    answer = [
      'India uses an indirect electoral college for the President and Vice-President.',
      'President election: elected MPs and elected MLAs vote using single transferable vote and secret ballot.',
      'Vice-President election: members of both Houses of Parliament vote using single transferable vote.',
      'This is different from Lok Sabha elections, where citizens vote directly.'
    ].join('\n');
  } else if (lower.includes('lok sabha') || lower.includes('parliament')) {
    answer = [
      'Lok Sabha elections are direct elections where citizens vote for candidates in their constituency.',
      'The party or coalition with majority support in Lok Sabha forms the Union Government.',
      'A majority mark is needed to form government, and then the Prime Minister is appointed.',
      'The Election Commission of India supervises the full process from schedule to final results.'
    ].join('\n');
  } else if (lower.includes('vidhan sabha') || lower.includes('assembly')) {
    answer = [
      'Vidhan Sabha elections choose representatives for a state legislative assembly.',
      'Voters directly elect MLAs from state constituencies.',
      'The party or coalition with majority in the assembly forms the state government.',
      'Polling and counting are conducted under Election Commission rules and state election machinery.'
    ].join('\n');
  } else if (lower.includes('evm') || lower.includes('vvpat')) {
    answer = [
      'EVM records the vote electronically at the polling station.',
      'VVPAT prints a short paper slip visible to the voter for a few seconds.',
      'The slip then drops into a sealed box for audit and verification.',
      'This supports transparency while keeping vote counting efficient.'
    ].join('\n');
  } else if (lower.includes('register') || lower.includes('voter')) {
    answer = [
      'To vote in India, you must be 18+ and enrolled in the electoral roll.',
      'You can apply through NVSP or authorized voter registration channels.',
      'Keep identity and address proof ready during registration.',
      'After verification, your name is added to the roll and you can vote.'
    ].join('\n');
  } else if (lower.includes('law') || lower.includes('constitution') || lower.includes('article')) {
    answer = [
      'Indian election governance is anchored in the Constitution, especially Article 324 for the Election Commission of India.',
      'Representation of the People Acts, 1950 and 1951, govern rolls, qualifications, conduct of elections, and disputes.',
      'The Conduct of Elections Rules, 1961 define procedural details for nominations, polling, and counting.',
      'The Model Code of Conduct sets campaign behavior standards once elections are announced.'
    ].join('\n');
  } else if (lower.includes('count') || lower.includes('result')) {
    answer = [
      'Counting starts on the official date announced by the Election Commission of India.',
      'Postal ballots are processed first, then EVM round-wise counting is carried out constituency by constituency.',
      'Round updates are published as trends, and final winners are declared after validation.',
      'Official confirmed results should be taken from Election Commission result channels.'
    ].join('\n');
  } else {
    answer = [
      'Indian election flow in short: electoral roll preparation, nominations, scrutiny, campaign period, polling, counting, and final declaration.',
      'Key institutions include the Election Commission of India, returning officers, and polling staff.',
      'Ask a specific topic like Lok Sabha, Vidhan Sabha, election laws, voter registration, EVM/VVPAT, or electoral college for a more detailed answer.'
    ].join('\n');
  }

  return `${answer}\nFOLLOWUPS:${JSON.stringify(buildLocalFollowups(prompt))}`;
}

function buildLocalModelResponse(messages, jsonMode) {
  if (jsonMode) {
    const userPrompt = String(messages?.[0]?.content || '');
    const categoryMatch = userPrompt.match(/Category:\s*([^\.\n]+)/i);
    const category = categoryMatch ? categoryMatch[1].trim() : 'General';
    return JSON.stringify(getFallbackQuizQuestion(category));
  }
  const userText = String(messages?.[messages.length - 1]?.content || '');
  return buildLocalChatResponse(userText);
}

function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === `tab-${tabId}`);
  });
}

function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBubble(text) {
  const safe = escapeHtml(text);
  return safe
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

function detectLessonTopic(text) {
  const normalized = text.toLowerCase();
  if (/(electoral college|president|vice-president|vice president|article 54|article 55|article 66)/.test(normalized)) {
    return 'electoral-college';
  }
  if (/(register|registration|electoral roll|epic|voter id)/.test(normalized)) {
    return 'registration';
  }
  if (/(evm|vvpat|machine|ballot unit|control unit)/.test(normalized)) {
    return 'evm';
  }
  if (/(counting|results|certification|strong room|postal ballot|margin)/.test(normalized)) {
    return 'counting';
  }
  if (/(timeline|process|steps|how election works|election day|polling)/.test(normalized)) {
    return 'process';
  }
  if (/(current election|ongoing election|who is contesting|which election)/.test(normalized)) {
    return 'current';
  }
  return 'process';
}

function buildLessonData(topic) {
  const lessons = {
    process: {
      title: 'Election Process Roadmap',
      summary: 'This flow shows the full path of a typical Indian election from voter roll work to final government formation.',
      steps: ['Roll Revision', 'Notification', 'Campaign', 'Polling', 'Counting', 'Result'],
      cues: ['Scan left to right', 'Then read the detailed answer', 'Ask about any one stage'],
    },
    registration: {
      title: 'Voter Registration Flow',
      summary: 'This is the shortest path for understanding how a citizen gets onto the electoral roll and becomes eligible to vote.',
      steps: ['Check Eligibility', 'Apply', 'Verification', 'Roll Update', 'EPIC / Entry Check'],
      cues: ['Start with eligibility', 'Then application', 'Finish by verifying your roll entry'],
    },
    evm: {
      title: 'EVM + VVPAT Flow',
      summary: 'This diagram shows what happens from voter verification to the vote confirmation shown through VVPAT.',
      steps: ['Identity Check', 'Ballot Enabled', 'Vote On EVM', 'VVPAT Slip Display', 'Machine Sealed'],
      cues: ['One voter at a time', 'Secret ballot remains protected', 'VVPAT adds voter-verifiable confirmation'],
    },
    counting: {
      title: 'Counting Day Flow',
      summary: 'This sequence simplifies what normally happens after polling ends and before a winner is officially declared.',
      steps: ['Strong Room Security', 'Postal Ballots', 'EVM Rounds', 'Lead Changes', 'RO Declaration'],
      cues: ['Trends are not final results', 'Margins can change round by round', 'RO declaration has legal value'],
    },
    'electoral-college': {
      title: 'President / Vice-President Election Flow',
      summary: 'India does not use a US-style electoral college for choosing the Prime Minister. This flow shows where India actually uses indirect election.',
      steps: ['Electors Defined', 'Nomination', 'Secret Ballot', 'STV Counting', 'Office Filled'],
      cues: ['President and Vice-President are indirect elections', 'Prime Minister comes from Lok Sabha majority', 'Different offices use different elector groups'],
    },
    current: {
      title: 'Current Election Reading Guide',
      summary: 'Use this sequence to interpret any live or scheduled election card in the tracker section.',
      steps: ['Schedule', 'Polling Status', 'Counting Date', 'Trends', 'Declared Result'],
      cues: ['Before counting, no official leads exist', 'Use official results links on counting day', 'Read trends and final declarations separately'],
    },
  };
  return lessons[topic] || lessons.process;
}

function buildLessonHtml(questionText) {
  const topic = detectLessonTopic(questionText);
  const lesson = buildLessonData(topic);
  return `
    <div class="teaching-block">
      <div class="teaching-head">
        <span class="teaching-tag">Auto Diagram</span>
        <strong>${lesson.title}</strong>
      </div>
      <p class="teaching-summary">${lesson.summary}</p>
      <div class="diagram-flow">
        ${lesson.steps.map((step, index) => `
          <div class="diagram-step">
            <span class="diagram-index">${index + 1}</span>
            <span class="diagram-label">${step}</span>
          </div>
        `).join('')}
      </div>
      <div class="teaching-cues">
        ${lesson.cues.map((cue) => `<span class="teaching-cue">${cue}</span>`).join('')}
      </div>
    </div>
  `;
}

const stripBadJson = t => String(t).split("title:").pop().split("url:")[0].replace(/["{}\[\]]/g, " ").substring(0, 150).trim(); function renderNewsTickerItems(items) {
  const track = document.getElementById('newsMarqueeTrack');
  if (!track) return;

  // Clear existing content
  track.innerHTML = '';

  // Build nodes safely to avoid malformed HTML when titles contain JSON
  const buildFragment = (list) => {
    const frag = document.createDocumentFragment();
    list.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'news-marquee-item';

      const dot = document.createElement('span');
      dot.className = 'news-dot';

      const title = document.createElement('span');
      // Use textContent to avoid injecting tags or broken JSON
      title.textContent = (item.title || '').replace(/[\n\r]+/g, ' ').trim();

      row.appendChild(dot);
      row.appendChild(title);
      frag.appendChild(row);
    });
    return frag;
  };

  // Append duplicated fragments for smooth continuous scroll
  track.appendChild(buildFragment(items));
  track.appendChild(buildFragment(items));

  // Enable/disable moving animation depending on overflow
  requestAnimationFrame(() => {
    const wrap = track.parentElement; // .news-marquee-track-wrap
    if (!wrap) return;
    if (track.scrollWidth > wrap.clientWidth + 8) track.classList.add('moving');
    else track.classList.remove('moving');
  });
}

function parseNewsRss(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'text/xml');
  const items = Array.from(xml.querySelectorAll('item')).slice(0, 8).map((item) => ({
    title: item.querySelector('title')?.textContent?.trim() || '',
    url: item.querySelector('link')?.textContent?.trim() || '#',
  })).filter((item) => item.title && item.url);
  return items;
}

async function fetchTickerFeed(feedUrl) {
  const proxied = `${NEWS_TICKER_CONFIG.proxyBase}${encodeURIComponent(feedUrl)}`;
  const response = await fetch(proxied, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Feed request failed with ${response.status}`);
  }
  const xmlText = await response.text();
  const items = parseNewsRss(xmlText);
  if (!items.length) {
    throw new Error('No news items found in feed.');
  }
  return items;
}

// Simple cache helper to reduce API calls
function getTickerCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(NEWS_TICKER_CONFIG.cacheKey));
    if (cached && cached.timestamp && Date.now() - cached.timestamp < NEWS_TICKER_CONFIG.cacheTtlMs) {
      return cached.items;
    }
  } catch (e) {
    // Ignore cache errors
  }
  return null;
}

function setTickerCache(items) {
  try {
    localStorage.setItem(NEWS_TICKER_CONFIG.cacheKey, JSON.stringify({ items, timestamp: Date.now() }));
  } catch (e) {
    // Ignore cache errors (quota, privacy mode, etc.)
  }
}

async function loadNewsTicker() {
  const track = document.getElementById('newsMarqueeTrack');
  const hasExisting = track && track.children && track.children.length && !track.textContent.includes('Loading latest');
  
  // Try to use cached headlines if fresh
  const cached = getTickerCache();
  if (cached && cached.length) {
    const filteredCached = filterElectionHeadlines(cached);
    if (filteredCached.length) {
      renderNewsTickerItems(filteredCached);
      return;
    }
  }

  // PRIMARY: Try NewsData.io first (CORS-friendly, real-time news)
  try {
    const newsDataItems = await fetchNewsDataIoHeadlines();
    if (newsDataItems && newsDataItems.length) {
      console.log('📰 Fetched', newsDataItems.length, 'headlines from NewsData.io');
      setTickerCache(newsDataItems);
      renderNewsTickerItems(newsDataItems);
      return;
    }
  } catch (error) {
    console.warn('NewsData.io fetch failed:', error);
  }

  // SECONDARY: Try NewsAPI (may be blocked by CORS on browser)
  try {
    const newsApiItems = await fetchNewsApiHeadlines();
    if (newsApiItems && newsApiItems.length) {
      console.log('📰 Fetched', newsApiItems.length, 'headlines from NewsAPI');
      setTickerCache(newsApiItems);
      renderNewsTickerItems(newsApiItems);
      return;
    }
  } catch (error) {
    console.warn('NewsAPI fetch failed:', error);
  }

  // TERTIARY: Try RSS feeds (fallback)
  for (const feed of NEWS_TICKER_CONFIG.feeds) {
    try {
      const items = await fetchTickerFeed(feed);
      const filteredItems = filterElectionHeadlines(items);
      if (filteredItems && filteredItems.length) {
        console.log('📰 Fetched', filteredItems.length, 'headlines from RSS feed');
        setTickerCache(filteredItems);
        renderNewsTickerItems(filteredItems);
        return;
      }
    } catch (error) {
      console.warn('News ticker feed failed:', feed, error);
      continue;
    }
  }

  // QUATERNARY: Try generating with Gemini
  if (isGeminiCooldownActive()) {
    console.warn('Gemini ticker generation skipped due to cooldown');
    if (hasExisting) {
      return;
    }
    console.log('📰 Using fallback static headlines while Gemini is cooling down');
    renderNewsTickerItems(NEWS_TICKER_CONFIG.fallback);
    return;
  }

  try {
    const genItems = await generateTickerWithGemini();
    const filteredGenItems = filterElectionHeadlines(genItems);
    if (filteredGenItems && filteredGenItems.length) {
      console.log('📰 Generated', filteredGenItems.length, 'headlines with Gemini');
      setTickerCache(filteredGenItems);
      renderNewsTickerItems(filteredGenItems);
      return;
    }
  } catch (err) {
    console.warn('Gemini ticker generation failed:', err);
    if (isGeminiRateLimitError(err)) {
      setGeminiCooldown();
    }
  }

  // No fresh items fetched. If there are already items showing, keep them looping.
  if (hasExisting) {
    console.log('📰 Keeping existing marquee items');
    return;
  }

  // FALLBACK: Static headlines
  console.log('📰 Using fallback static headlines');
  renderNewsTickerItems(NEWS_TICKER_CONFIG.fallback);
}

async function generateTickerWithGemini() {
  const api = getApiConfig();
  if (!api || api.provider !== 'gemini' || !api.apiKey && !api.key) {
    throw new Error('Gemini not configured');
  }
  const key = api.apiKey || api.key;
  const prompt = `Default Gemini prompt: fetch only Indian election news. Provide 6 concise, recent-style India election headlines only as a JSON array. Every headline must be strictly about Indian elections, such as polling, counting, results, nominations, candidates, voter turnout, EVMs, VVPAT, the ECI, Lok Sabha, Rajya Sabha, Vidhan Sabha, or the President/Vice-President electoral college. Do not include any non-election topic. Each item should be an object with keys \"title\" and \"url\". If you cannot provide a real URL, use \"#\". Example: [{"title":"...","url":"..."}, ...]`;

  const url = new URL(api.apiUrl);
  url.searchParams.append('key', key);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini ticker error ${res.status}: ${body}`);
  }
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  // Try to parse JSON out of raw text. Accept JSON embedded inside code fences or text.
  let items = [];
  const tryParseJsonFromString = (text) => {
    if (!text || typeof text !== 'string') return null;
    // common code-fence wrappers
    text = text.replace(/```json|```/gi, '\n');
    // look for JSON array first
    const arrMatch = text.match(/(\[\s*\{[\s\S]*\}\s*\])/m);
    if (arrMatch) {
      try { return JSON.parse(arrMatch[1]); } catch (e) {}
    }
    // fallback: look for any bracketed array
    const anyArr = text.match(/(\[.*\])/s);
    if (anyArr) {
      try { return JSON.parse(anyArr[1]); } catch (e) {}
    }
    // try object collection separated by newlines
    const objMatch = text.match(/(\{[\s\S]*\})/m);
    if (objMatch) {
      try { return JSON.parse(objMatch[1]); } catch (e) {}
    }
    return null;
  };

  const sanitizeHeadline = (rawTitle) => {
    if (!rawTitle) return '';
    let t = String(rawTitle).trim();
    // remove code fences and excessive whitespace
    t = t.replace(/```/g, '\n').replace(/[\r\t]+/g, ' ');
    // if the title itself contains JSON, try extract
    const parsed = tryParseJsonFromString(t);
    if (parsed) {
      if (Array.isArray(parsed)) {
        // join up to three titles
        return parsed.slice(0,3).map(it => (it && (it.title || it.text || it[0]))).filter(Boolean).join(' · ');
      } else if (parsed.title) {
        return parsed.title;
      }
    }
    // strip surrounding stray braces or quotes
    t = t.replace(/^\[+|\]+$/g, '').replace(/^\{+|\}+$/g, '');
    // collapse long JSON-like fragments
    if (t.length > 180) t = t.slice(0, 177) + '...';
    return t;
  };

  // First try to parse an embedded JSON array from the model response
  try {
    const parsed = tryParseJsonFromString(raw);
    if (Array.isArray(parsed) && parsed.length) {
      items = parsed.map((it) => ({ title: sanitizeHeadline(it.title || it.text || JSON.stringify(it)), url: it.url || '#' })).filter(Boolean).slice(0, 6);
      if (items.length) return filterElectionHeadlines(items);
    }
  } catch (e) {
    // ignore
  }

  // Fallback: split lines into items
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0,6);
  items = lines.map(l => {
    const urlMatch = l.match(/https?:\/\/[\S]+/);
    const url = urlMatch ? urlMatch[0] : '#';
    const title = urlMatch ? l.replace(urlMatch[0], '').trim().replace(/[()\[\]]/g,'') : l.replace(/\s*\([^)]*\)\s*$/, '');
    return { title: sanitizeHeadline(title || l), url };
  });
  return filterElectionHeadlines(items);
}

function parseResponse(raw) {
  const match = raw.match(/FOLLOWUPS:(\[.*?\])/s);
  let followUps = [];
  let text = raw;
  if (match) {
    try {
      followUps = JSON.parse(match[1]);
    } catch (error) {
      followUps = [];
    }
    text = raw.replace(/FOLLOWUPS:\[.*?\]/s, '').trim();
  }
  return { text, followUps };
}

function appendMessage(role, html) {
  const wrap = document.getElementById('messages');
  const row = document.createElement('div');
  row.className = `msg-row ${role === 'assistant' ? '' : 'user'}`.trim();
  row.innerHTML = `
    <div class="avatar ${role === 'assistant' ? 'ai' : 'user-av'}">${role === 'assistant' ? 'AI' : 'You'}</div>
    <div class="bubble ${role === 'assistant' ? 'ai' : 'user'}">${html}</div>
  `;
  wrap.appendChild(row);
  wrap.scrollTop = wrap.scrollHeight;
}

function showTyping() {
  const wrap = document.getElementById('messages');
  const row = document.createElement('div');
  row.id = 'typing';
  row.className = 'typing-row';
  row.innerHTML = `
    <div class="avatar ai">AI</div>
    <div class="typing-bubble">
      <div class="t-dot"></div>
      <div class="t-dot"></div>
      <div class="t-dot"></div>
    </div>
  `;
  wrap.appendChild(row);
  wrap.scrollTop = wrap.scrollHeight;
}

function hideTyping() {
  document.getElementById('typing')?.remove();
}

function renderWelcome() {
  const wrap = document.getElementById('messages');
  wrap.innerHTML = `
    <div class="welcome-hero">
      <span class="welcome-emoji">IND</span>
      <h2>ElectIQ India</h2>
      <p>Ask about Lok Sabha elections, Vidhan Sabha contests, election laws, voter registration, EVMs, the President's electoral college, or the 2026 state election schedule. The assistant now teaches with step flows and auto diagrams.</p>
      <div class="starter-grid">
        <div class="starter-card" data-ask="How is the President of India elected through the electoral college?">
          <strong>Electoral College</strong>
          President and Vice-President rules
        </div>
        <div class="starter-card" data-ask="Which elections are ongoing in India as of 1 May 2026?">
          <strong>Current Elections</strong>
          2026 live snapshot
        </div>
        <div class="starter-card" data-ask="What are the most important Indian election laws I should know?">
          <strong>Election Laws</strong>
          Constitution, RPA, rules
        </div>
        <div class="starter-card" data-ask="Walk me through election day in India step by step.">
          <strong>Election Day</strong>
          Polling station to counting
        </div>
      </div>
    </div>
  `;
}

function renderTopics() {
  const sidebar = document.getElementById('topicsSidebar');
  sidebar.innerHTML = TOPIC_GROUPS.map((group) => `
    <div class="topic-group">
      <div class="topic-group-label">${group.label}</div>
      ${group.items.map(([prompt, label]) => `
        <div class="topic-item" data-ask="${escapeHtml(prompt)}">
          <span class="icon">•</span>
          <span>${label}</span>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function getStageColor(index) {
  return ['#f87171', '#fb923c', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'][index - 1];
}

function renderTimeline() {
  const grid = document.getElementById('stagesGrid');
  const bar = document.getElementById('tlBar');
  grid.innerHTML = '';
  bar.innerHTML = '';

  STAGES.forEach((stage) => {
    const seg = document.createElement('div');
    seg.className = 'tl-seg';
    seg.style.background = getStageColor(stage.n);
    seg.addEventListener('click', () => toggleStage(stage.n));
    bar.appendChild(seg);

    const card = document.createElement('div');
    card.className = `stage-card ${stage.cls}`;
    card.id = `stage-${stage.n}`;
    card.innerHTML = `
      <div class="stage-card-top">
        <div class="stage-path-chip">Stage ${stage.n}</div>
        <div class="stage-time-badge">${stage.time}</div>
      </div>
      <div class="stage-flow-head">
        <div class="stage-emoji-ring">
          <span class="stage-emoji">${stage.emoji}</span>
        </div>
        <div class="stage-flow-copy">
          <div class="stage-title">${stage.title}</div>
          <div class="stage-desc">${stage.desc}</div>
        </div>
      </div>
      <div class="stage-flow-arrow" aria-hidden="true">→</div>
      <div class="stage-details">
        <ul>${stage.details.map((item) => `<li>${item}</li>`).join('')}</ul>
        <button class="ask-btn" data-ask="${escapeHtml(stage.prompt)}">Ask ElectIQ India</button>
      </div>
    `;
    card.addEventListener('click', (event) => {
      if (!event.target.closest('.ask-btn')) {
        toggleStage(stage.n);
      }
    });
    grid.appendChild(card);
  });
}

function toggleStage(index) {
  const card = document.getElementById(`stage-${index}`);
  const open = card.classList.contains('expanded');
  document.querySelectorAll('.stage-card').forEach((node) => node.classList.remove('expanded'));
  document.querySelectorAll('.tl-seg').forEach((node, i) => {
    node.classList.toggle('active', i + 1 === index);
  });
  if (!open) {
    card.classList.add('expanded');
  }
}

function getTrackerItem(id) {
  return TRACKER_ITEMS.find((item) => item.id === id) || TRACKER_ITEMS[0];
}

function getNowIndia() {
  return new Date();
}

function hasCountingStarted(item) {
  return getNowIndia() >= new Date(item.countingDate);
}

function formatLiveStatus(item) {
  if (hasCountingStarted(item)) {
    return 'Live result window: counting should be underway or already published on the ECI results portal.';
  }
  return `Counting has not started yet. As of 1 May 2026, final data for ${item.title} is yet to be released.`;
}

async function fetchFirstAvailableText(urls) {
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) {
        return { text: await response.text(), url };
      }
    } catch (error) {
      continue;
    }
  }
  throw new Error('Official results page could not be reached from this browser session.');
}

function normalizeCompact(value) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function buildAbsoluteUrl(baseUrl, href) {
  return new URL(href, baseUrl).toString();
}

function findStateLinkFromIndex(doc, baseUrl, trackerItem) {
  const anchors = Array.from(doc.querySelectorAll('a[href*="statewise"]'));
  const match = anchors.find((anchor) => {
    const text = normalizeCompact(anchor.textContent || anchor.parentElement?.textContent || '');
    return trackerItem.keywords.some((keyword) => text.includes(keyword));
  });
  return match ? buildAbsoluteUrl(baseUrl, match.getAttribute('href')) : null;
}

function parseStateResultTable(doc) {
  const rows = Array.from(doc.querySelectorAll('table tr'));
  const parsed = [];
  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll('th,td')).map((cell) => cell.textContent.replace(/\s+/g, ' ').trim());
    if (cells.length >= 8 && cells[0] !== 'Constituency') {
      parsed.push({
        constituency: cells[0],
        leadingCandidate: cells[2],
        leadingParty: cells[3],
        trailingCandidate: cells[4],
        trailingParty: cells[5],
        margin: cells[6],
        round: cells[7],
        status: cells[8] || '',
      });
    }
  });
  return parsed.slice(0, 8);
}

function parseStatusKnown(doc) {
  const text = doc.body?.textContent?.replace(/\s+/g, ' ').trim() || '';
  const match = text.match(/Status Known For\s+(\d+)\s+out of\s+(\d+)\s+Constituencies/i);
  return match ? `${match[1]} of ${match[2]} constituencies known` : '';
}

function parsePartySummary(doc) {
  const text = doc.body?.textContent?.replace(/\s+/g, ' ').trim() || '';
  const matches = [...text.matchAll(/([A-Za-z().& -]{3,}?)\s+Leading In\s*:\s*(\d+)\s+Won In\s*:\s*(\d+)\s+Trailing In\s*:\s*(\d+)/g)];
  return matches.slice(0, 6).map((match) => ({
    party: match[1].trim(),
    leading: match[2],
    won: match[3],
    trailing: match[4],
  }));
}

async function fetchLiveTrackerData(item) {
  if (!hasCountingStarted(item)) {
    return {
      phase: 'pre-count',
      summary: formatLiveStatus(item),
      officialUrl: LIVE_RESULTS_MAIN_URLS[0],
    };
  }

  const indexResult = await fetchFirstAvailableText(LIVE_RESULTS_MAIN_URLS);
  const parser = new DOMParser();
  const indexDoc = parser.parseFromString(indexResult.text, 'text/html');
  const stateUrl = findStateLinkFromIndex(indexDoc, indexResult.url, item);

  if (!stateUrl) {
    return {
      phase: 'counting',
      summary: 'Counting may have started, but a state-specific trends link could not be identified automatically yet.',
      officialUrl: indexResult.url,
    };
  }

  const stateResponse = await fetch(stateUrl, { cache: 'no-store' });
  if (!stateResponse.ok) {
    throw new Error(`Official state page returned ${stateResponse.status}.`);
  }

  const stateText = await stateResponse.text();
  const stateDoc = parser.parseFromString(stateText, 'text/html');
  return {
    phase: 'counting',
    summary: parseStatusKnown(stateDoc) || 'Official result trends are available.',
    officialUrl: stateUrl,
    partySummary: parsePartySummary(stateDoc),
    topConstituencies: parseStateResultTable(stateDoc),
  };
}

async function refreshTrackerData(id) {
  const item = getTrackerItem(id);
  state.tracker.loadingId = id;
  state.tracker.liveById[id] = {
    ...(state.tracker.liveById[id] || {}),
    loading: true,
    error: '',
  };
  renderTracker();

  try {
    const live = await fetchLiveTrackerData(item);
    state.tracker.liveById[id] = { ...live, loading: false, error: '' };
  } catch (error) {
    state.tracker.liveById[id] = {
      loading: false,
      error: error.message,
      summary: hasCountingStarted(item)
        ? 'Live data could not be loaded automatically from the official page in this browser session.'
        : formatLiveStatus(item),
      officialUrl: LIVE_RESULTS_MAIN_URLS[0],
    };
  } finally {
    state.tracker.loadingId = null;
    renderTracker();
  }
}

function renderTrackerDetail() {
  const item = getTrackerItem(state.tracker.selectedId);
  const live = state.tracker.liveById[item.id];
  const preCount = !hasCountingStarted(item);
  const showBackButton = state.tracker.view === 'detail';

  const liveSummary = live?.loading
    ? '<div class="tracker-live-note">Refreshing official data...</div>'
    : `<div class="tracker-live-note">${escapeHtml((live && (live.error || live.summary)) || formatLiveStatus(item))}</div>`;

  const preCountTable = preCount
    ? `
      <div class="tracker-subsection">
        <h4>Result Status Before Counting</h4>
        <div class="mini-table">
          <div class="mini-head mini-head-two"><span>Field</span><span>Value</span></div>
          <div class="mini-row mini-row-two"><span>Leading party</span><span>Final data yet to be released</span></div>
          <div class="mini-row mini-row-two"><span>Leading candidate</span><span>Final data yet to be released</span></div>
          <div class="mini-row mini-row-two"><span>Total votes polled</span><span>Final data yet to be released</span></div>
          <div class="mini-row mini-row-two"><span>Vote share</span><span>Final data yet to be released</span></div>
          <div class="mini-row mini-row-two"><span>Winning margin</span><span>Final data yet to be released</span></div>
        </div>
      </div>
    `
    : '';

  const partyTable = live?.partySummary?.length
    ? `
      <div class="tracker-subsection">
        <h4>Party Trend Snapshot</h4>
        <div class="mini-table">
          <div class="mini-head"><span>Party</span><span>Lead</span><span>Won</span><span>Trail</span></div>
          ${live.partySummary.map((party) => `
            <div class="mini-row">
              <span>${escapeHtml(party.party)}</span>
              <span>${party.leading}</span>
              <span>${party.won}</span>
              <span>${party.trailing}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  const constituencyTable = live?.topConstituencies?.length
    ? `
      <div class="tracker-subsection">
        <h4>Top Reported Constituencies</h4>
        <div class="constituency-list">
          ${live.topConstituencies.map((row) => `
            <div class="constituency-card">
              <strong>${escapeHtml(row.constituency)}</strong>
              <span>${escapeHtml(row.leadingCandidate)} (${escapeHtml(row.leadingParty)})</span>
              <span>Margin: ${escapeHtml(row.margin)} | Round: ${escapeHtml(row.round)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  document.getElementById('trackerDetail').innerHTML = `
    <div class="tracker-detail-card">
      <div class="tracker-detail-head">
        <div>
          ${showBackButton ? '<button class="tracker-back-btn" data-tracker-back="true">← Back To Elections</button>' : ''}
          <div class="tracker-kicker">${item.seats}</div>
          <h3>${item.title}</h3>
        </div>
        <div class="tracker-actions">
          <button class="ask-btn tracker-refresh-btn" data-refresh-election="${item.id}">
            ${live?.loading ? 'Refreshing...' : 'Refresh Live Data'}
          </button>
          <a class="tracker-link-btn" href="${(live && live.officialUrl) || LIVE_RESULTS_MAIN_URLS[0]}" target="_blank" rel="noreferrer">Open Official Results</a>
        </div>
      </div>

      <p>${item.detail}</p>

      <div class="tracker-facts">
        <div><span>Seats</span><strong>${item.seats}</strong></div>
        <div><span>Majority mark</span><strong>${item.majority}</strong></div>
        <div><span>Contest</span><strong>${item.electorate}</strong></div>
        <div><span>Polling timeline</span><strong>${item.schedule}</strong></div>
      </div>

      ${liveSummary}

      <div class="tracker-subsection">
        <h4>What We Can Confirm Right Now</h4>
        <ul class="tracker-points">
          ${item.detailPoints.map((point) => `<li>${point}</li>`).join('')}
        </ul>
      </div>

      ${preCountTable}
      ${partyTable}
      ${constituencyTable}
    </div>
  `;
}

function renderTracker() {
  const isDetailView = state.tracker.view === 'detail';
  const banner = document.getElementById('trackerBanner');
  const grid = document.getElementById('trackerGrid');
  const detail = document.getElementById('trackerDetail');
  const meta = document.getElementById('trackerMetaSection');

  if (isDetailView) {
    banner.innerHTML = '';
    banner.style.display = 'none';
    grid.innerHTML = '';
    grid.style.display = 'none';
    meta.style.display = 'none';
    renderTrackerDetail();
    detail.style.display = 'block';
  } else {
    banner.style.display = 'block';
    banner.innerHTML = `
      <div class="tracker-banner-card">
        <strong>Live status:</strong> On 1 May 2026, the major 2026 state elections have completed polling, but official counting is scheduled for 4 May 2026. Before that date, no verified leader or vote total should be shown.
      </div>
    `;

    grid.style.display = 'grid';
    grid.innerHTML = TRACKER_ITEMS.map((item) => {
      const selected = item.id === state.tracker.selectedId;
      const live = state.tracker.liveById[item.id];
      const status = live?.summary || item.status;
      return `
        <article class="tracker-card ${selected ? 'selected' : ''}" data-election-id="${item.id}">
          <div class="tracker-kicker">${item.seats}</div>
          <h3>${item.title}</h3>
          <p>${item.detail}</p>
          <div class="tracker-meta"><strong>Polling:</strong> ${item.schedule}</div>
          <div class="tracker-status">${escapeHtml(status)}</div>
        </article>
      `;
    }).join('');

    detail.innerHTML = '';
    detail.style.display = 'none';
    meta.style.display = 'grid';
  }

  document.getElementById('dateList').innerHTML = DATE_ITEMS.map((item) => `
    <div class="date-row">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
    </div>
  `).join('');

  document.getElementById('sourceList').innerHTML = SOURCE_ITEMS.map((item) => `
    <a class="source-item" href="${item.href}" target="_blank" rel="noreferrer">
      <strong>${item.label}</strong>
      <span>${item.note}</span>
    </a>
  `).join('');
}

function renderLaws() {
  document.getElementById('electoralCollegeCard').innerHTML = `
    <h3>${ELECTORAL_COLLEGE_INFO.title}</h3>
    <p>${ELECTORAL_COLLEGE_INFO.text}</p>
    <ul>
      ${ELECTORAL_COLLEGE_INFO.points.map((point) => `<li>${point}</li>`).join('')}
    </ul>
  `;

  document.getElementById('lawsGrid').innerHTML = LAW_ITEMS.map((item) => `
    <article class="law-card">
      <h3>${item.title}</h3>
      <p>${item.body}</p>
    </article>
  `).join('');
}

function renderQuizCategories() {
  document.getElementById('catBar').innerHTML = QUIZ_CATEGORIES.map((category) => `
    <button class="cat-btn ${category === state.quiz.category ? 'selected' : ''}" data-category="${category}">
      ${category}
    </button>
  `).join('');
}

function resetQuizStart() {
  document.getElementById('quizStart').classList.remove('hidden');
  document.getElementById('quizCard').classList.add('hidden');
  document.getElementById('scoreboard').classList.add('hidden');
}

async function callModel(systemPrompt, messages, jsonMode = false) {
  const api = getApiConfig();
  if (!api.apiKey || !api.apiUrl) {
    return buildLocalModelResponse(messages, jsonMode);
  }

  if (api.provider === 'anthropic') {
    const response = await fetch(api.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': api.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: api.model,
        max_tokens: jsonMode ? 800 : 1000,
        system: systemPrompt,
        messages,
      }),
    });
    if (!response.ok) {
      throw new Error(`Anthropic API error ${response.status}`);
    }
    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  const url = new URL(api.apiUrl);
  url.searchParams.set('key', api.apiKey);
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: messages.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      })),
      generationConfig: {
        temperature: jsonMode ? 0.2 : 0.7,
        maxOutputTokens: jsonMode ? 800 : 1000,
        responseMimeType: jsonMode ? 'application/json' : 'text/plain',
      },
    }),
  });
  if (!response.ok) {
    if (response.status === 429) {
      setGeminiCooldown();
    }
    throw new Error(`Gemini API error ${response.status}`);
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function sendChat() {
  if (state.chat.loading) {
    return;
  }

  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) {
    return;
  }

  state.chat.loading = true;
  input.value = '';
  input.style.height = 'auto';
  document.getElementById('sendBtn').disabled = true;

  // Show startup suggestions only before the first user message.
  document.querySelector('.welcome-hero')?.remove();

  appendMessage('user', escapeHtml(text));
  state.chat.history.push({ role: 'user', content: text });
  showTyping();

  try {
    const raw = await callModel(CHAT_SYSTEM, state.chat.history, false);
    const { text: reply, followUps } = parseResponse(raw);
    hideTyping();
    state.chat.history.push({ role: 'assistant', content: raw });

    let html = buildLessonHtml(text);
    html += formatBubble(reply);
    if (followUps.length) {
      html += `<div class="follow-ups">${followUps.map((question) => `
        <span class="follow-up-chip" data-ask="${escapeHtml(question)}">${question}</span>
      `).join('')}</div>`;
    }
    appendMessage('assistant', html);
  } catch (error) {
    hideTyping();
    const message = isGeminiRateLimitError(error)
      ? 'Gemini is rate-limited right now. The app will use cached or fallback content until the cooldown expires.'
      : error.message;
    appendMessage('assistant', formatBubble(`I couldn't reach the model right now. ${message}`));
  } finally {
    state.chat.loading = false;
    document.getElementById('sendBtn').disabled = false;
    input.focus();
  }
}

async function startQuiz() {
  state.quiz.score = 0;
  state.quiz.total = 0;
  document.getElementById('quizStart').classList.add('hidden');
  document.getElementById('scoreboard').classList.add('hidden');
  await loadQuestion();
}

async function loadQuestion() {
  if (state.quiz.loading) {
    return;
  }
  state.quiz.loading = true;
  state.quiz.answered = false;

  const card = document.getElementById('quizCard');
  card.classList.remove('hidden');
  card.innerHTML = `<div class="quiz-loading"><div class="spin"></div><span>Generating a <em>${state.quiz.category}</em> question...</span></div>`;

  try {
    const prompt = `Category: ${state.quiz.category}. Make the question about Indian elections.`;
    const raw = await callModel(QUIZ_SYSTEM, [{ role: 'user', content: prompt }], true);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const question = JSON.parse(cleaned);
    state.quiz.current = question;
    state.quiz.total += 1;
    renderQuestion(question);
  } catch (error) {
    console.warn('Quiz generation failed, using fallback:', error.message);
    // Use fallback questions when API fails
    const fallback = QUIZ_FALLBACK[state.quiz.category];
    if (fallback && fallback.length > 0) {
      const question = fallback[Math.floor(Math.random() * fallback.length)];
      state.quiz.current = question;
      state.quiz.total += 1;
      renderQuestion(question);
    } else {
      card.innerHTML = `<div class="quiz-explanation"><strong>Quiz unavailable:</strong> Unable to load question. Please try again later.</div>`;
    }
  } finally {
    state.quiz.loading = false;
  }
}

function renderQuestion(question) {
  const letters = ['A', 'B', 'C', 'D'];
  document.getElementById('quizCard').innerHTML = `
    <div class="quiz-meta">
      <div class="quiz-score-badge">Score ${state.quiz.score}/${Math.max(state.quiz.total - 1, 0)}</div>
      <div class="quiz-q-count">Q${state.quiz.total} · ${state.quiz.category}</div>
    </div>
    <div class="quiz-question">${question.question}</div>
    <div class="quiz-options">
      ${question.options.map((option, index) => `
        <button class="quiz-opt" data-answer="${index}">
          <span class="opt-letter">${letters[index]}</span>
          ${option}
        </button>
      `).join('')}
    </div>
    <div id="quizExp"></div>
    <button class="quiz-next-btn" id="quizNext">Next Question</button>
  `;
}

function checkAnswer(index) {
  if (state.quiz.answered || !state.quiz.current) {
    return;
  }
  state.quiz.answered = true;
  const correct = state.quiz.current.correct;
  document.querySelectorAll('.quiz-opt').forEach((button, i) => {
    button.classList.add('disabled');
    if (i === correct) {
      button.classList.add('correct');
    } else if (i === index) {
      button.classList.add('wrong');
    }
  });

  if (index === correct) {
    state.quiz.score += 1;
  }

  document.getElementById('quizExp').innerHTML = `
    <div class="quiz-explanation">
      <strong>${index === correct ? 'Correct.' : 'Not quite.'}</strong> ${state.quiz.current.explanation}
    </div>
  `;
  document.getElementById('quizNext').classList.add('visible');
}

async function nextQuestion() {
  if (state.quiz.total >= 8) {
    showScoreboard();
    return;
  }
  await loadQuestion();
}

function showScoreboard() {
  document.getElementById('quizCard').classList.add('hidden');
  const scoreboard = document.getElementById('scoreboard');
  const percent = Math.round((state.quiz.score / state.quiz.total) * 100);
  scoreboard.innerHTML = `
    <div class="score-display">${state.quiz.score}<span style="font-size:2rem;color:var(--text-3)">/${state.quiz.total}</span></div>
    <div class="score-label">${percent >= 75 ? 'Strong election literacy.' : percent >= 50 ? 'Good base, keep going.' : 'A quick revision will help.'}</div>
    <p style="font-size:0.82rem;color:var(--text-3);margin-bottom:1.2rem">You scored ${percent}% in ${state.quiz.category}.</p>
    <button class="replay-btn" data-quiz-action="restart">Play Again</button>
    <button class="replay-btn" data-quiz-action="topics">Change Topic</button>
  `;
  scoreboard.classList.remove('hidden');
}

function askPrompt(prompt) {
  switchTab('assistant');
  const input = document.getElementById('chatInput');
  input.value = prompt;
  autoGrow(input);
  sendChat();
}

document.addEventListener('DOMContentLoaded', () => {
  renderWelcome();
  renderTopics();
  renderTimeline();
  renderTracker();
  renderLaws();
  renderQuizCategories();
  resetQuizStart();
  loadNewsTicker();
  window.setInterval(loadNewsTicker, NEWS_TICKER_CONFIG.refreshMs);

  const input = document.getElementById('chatInput');
  input.addEventListener('input', function onInput() {
    autoGrow(this);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendChat();
    }
  });

  document.getElementById('sendBtn').addEventListener('click', sendChat);

  document.body.addEventListener('click', (event) => {
    const tabButton = event.target.closest('.tab-btn');
    if (tabButton?.dataset.tab) {
      switchTab(tabButton.dataset.tab);
      return;
    }

    const askNode = event.target.closest('[data-ask]');
    if (askNode?.dataset.ask) {
      askPrompt(askNode.dataset.ask);
      return;
    }

    const categoryNode = event.target.closest('[data-category]');
    if (categoryNode?.dataset.category) {
      state.quiz.category = categoryNode.dataset.category;
      renderQuizCategories();
      return;
    }

    const electionCard = event.target.closest('[data-election-id]');
    if (electionCard?.dataset.electionId) {
      state.tracker.selectedId = electionCard.dataset.electionId;
      state.tracker.view = 'detail';
      renderTracker();
      return;
    }

    const refreshTrackerButton = event.target.closest('[data-refresh-election]');
    if (refreshTrackerButton?.dataset.refreshElection) {
      refreshTrackerData(refreshTrackerButton.dataset.refreshElection);
      return;
    }

    const trackerBackButton = event.target.closest('[data-tracker-back]');
    if (trackerBackButton) {
      state.tracker.view = 'list';
      renderTracker();
      return;
    }

    if (event.target.closest('.start-quiz-btn')) {
      startQuiz();
      return;
    }

    const answerButton = event.target.closest('[data-answer]');
    if (answerButton) {
      checkAnswer(Number(answerButton.dataset.answer));
      return;
    }

    if (event.target.id === 'quizNext') {
      nextQuestion();
      return;
    }

    const quizAction = event.target.closest('[data-quiz-action]');
    if (quizAction?.dataset.quizAction === 'restart') {
      startQuiz();
    } else if (quizAction?.dataset.quizAction === 'topics') {
      resetQuizStart();
    }
  });

  refreshTrackerData(state.tracker.selectedId);
});

