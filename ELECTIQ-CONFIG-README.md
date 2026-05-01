// README for ElectIQ configuration

# ElectIQ Configuration

- Edit `config.js` to set your preferred AI provider and add your API keys.
- Supported providers: `anthropic` (Claude) and `gemini` (Google Gemini).
- Example:

```
window.ELECTIQ_CONFIG = {
  provider: 'gemini', // or 'anthropic'
  anthropic: {
    apiKey: '', // Your Anthropic API key
    apiUrl: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514'
  },
  gemini: {
    apiKey: '', // Your Gemini API key
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    model: 'gemini-pro'
  }
};
```

- After editing, reload your app for changes to take effect.
- If you have issues, check the browser console for errors.
