// config.example.js
// TEMPLATE: Copy this file to config.js and add your actual API keys.
// IMPORTANT: config.js is in .gitignore and should NEVER be committed.

window.ELECTIQ_CONFIG = {
  provider: 'gemini', // 'anthropic' or 'gemini'
  anthropic: {
    apiKey: 'sk-your-anthropic-key-here', // Replace with your actual key
    apiUrl: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514'
  },
  gemini: {
    apiKey: 'AIzaSy_your_gemini_key_here', // Replace with your actual key
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
    model: 'gemini-flash-latest'
  },
  newsapi: {
    apiKey: 'your-newsapi-key-here', // Replace with your actual key
    baseUrl: 'https://newsapi.org/v2/everything'
  },
  newsdataio: {
    apiKey: 'pub_your-newsdataio-key-here', // Replace with your actual key
    baseUrl: 'https://newsdata.io/api/1/news'
  }
};
