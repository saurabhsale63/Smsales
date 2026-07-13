# Smsales

Research guide AI agent for education use-cases.

## Features
- Audience-aware research guide generation
- Source retrieval + credibility ranking
- Citation-first structured output (summary, insights, action plan, sources)
- Follow-up Q&A over saved session history
- Basic rate limiting and retry behavior

## Tech Stack
- Node.js HTTP server
- Pluggable search/retrieval function
- File-based session storage (`/home/runner/work/Smsales/Smsales/data/sessions.json`)

## Run
```bash
npm install
npm start
```

Server starts on `http://localhost:3000`.

## API
### Create research guide
`POST /guide`
```json
{
  "topic": "AI applications in education",
  "audience": "students"
}
```

### Follow-up question
`POST /followup`
```json
{
  "sessionId": "<session-id>",
  "question": "Which sources are best to start with?"
}
```

### Get session
`GET /session/<session-id>`

## Test
```bash
npm test
```
