
function analyzeConversation(text) {
    
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let stats = { chars: text.length, lines: lines.length };
  let urgent = [];
  let tasks = [];
  let questions = [];
  let decisions = [];
  let resolution = [];
  let events = [];

  const explicitDateRegex = /\b(\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(\s+\d{4})?|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(st|nd|rd|th)?(\s*,?\s*\d{4})?|\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?)\b/i;
  const taskRegex = /\b(todo|action item|task:|need to|will do|assign to|(the|this|my|your|our)(\s+\w+){0,2}\s+task)\b/i;

  const urgentKeywords = ['urgent', 'asap', 'blocker', 'critical', 'emergency'];
  const decisionKeywords = ['decided', 'agreed', 'decision:', 'going with', 'we will go with'];
  const dateKeywords = ['tomorrow', 'next week', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'weekend', 'eod', 'today'];
  const resolutionKeywords = ['maybe', 'not sure', 'confused', 'conflict', 'wait', 'hold off'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    // Urgent
    if (urgentKeywords.some(kw => lowerLine.includes(kw))) {
      urgent.push(line);
    }

    // Tasks
    if (taskRegex.test(lowerLine)) {
      tasks.push(line);
    }

    // Questions / Mentions
    const textWithoutUrls = line.replace(/https?:\/\/[^\s]+/gi, '');
    const isQuestion = textWithoutUrls.includes('?');
    if (isQuestion || textWithoutUrls.includes('@')) {
      if (!questions.includes(line)) questions.push(line);
    }

    // Decisions
    if (decisionKeywords.some(kw => lowerLine.includes(kw))) {
      const isNegated = lowerLine.includes('decided not') || lowerLine.includes('agreed not') || lowerLine.includes('will not go') || lowerLine.includes("won't go");
      if (isQuestion || isNegated) {
        if (!resolution.includes(line)) resolution.push(line); // flag for review
      } else {
        decisions.push(line);
      }
    }

    // Needs resolution / uncertainty
    if (resolutionKeywords.some(kw => lowerLine.includes(kw))) {
      if (!resolution.includes(line)) resolution.push(line);
    }

    // Dates/Events
    const hasAmbiguousDate = dateKeywords.some(kw => lowerLine.includes(kw));
    const hasExplicitDate = explicitDateRegex.test(lowerLine);

    if (hasAmbiguousDate || hasExplicitDate) {
      events.push(line);
      if (hasAmbiguousDate && !hasExplicitDate) {
        if (!resolution.includes(line)) resolution.push(line);
      }
    }
  }

  
    return { urgent, tasks, questions, decisions, resolution, events };
}

const tests = [
  {
    name: "Exact duplicate lines",
    input: "Are you there?\nAre you there?",
    assert: (r) => r.questions.length === 1 && r.questions[0] === "Are you there?"
  },
  {
    name: "Legitimate repeated messages with different timestamps",
    input: "[12:00] Alice: Are you there?\n[12:01] Alice: Are you there?",
    assert: (r) => r.questions.length === 2 && r.questions[0] === "[12:00] Alice: Are you there?" && r.questions[1] === "[12:01] Alice: Are you there?"
  },
  {
    name: "Standalone URLs",
    input: "Check out this link: https://instagram.com/reel/xyz?igshid=123",
    assert: (r) => r.questions.length === 0
  },
  {
    name: "Questions containing URLs",
    input: "Did you see this? https://instagram.com/reel/xyz?igshid=123",
    assert: (r) => r.questions.length === 1 && r.questions[0] === "Did you see this? https://instagram.com/reel/xyz?igshid=123"
  }
];

let failed = 0;
tests.forEach((t, i) => {
  const res = analyzeConversation(t.input);
  if (!t.assert(res)) {
    console.error("Test " + (i+1) + " (" + t.name + ") failed.\nResult: " + JSON.stringify(res.questions, null, 2));
    failed++;
  } else {
    console.log("Test " + (i+1) + " (" + t.name + ") passed.");
  }
});
if (failed > 0) process.exit(1);
console.log("All tests passed successfully.");
