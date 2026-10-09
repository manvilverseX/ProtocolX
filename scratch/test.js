
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
    const isQuestion = line.includes('?');
    if (isQuestion || line.includes('@')) {
      questions.push(line);
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
    input: "Is this urgent task decided yet tomorrow?",
    assert: (r) => r.urgent.length === 1 && r.tasks.length === 1 && r.questions.length === 1 && r.decisions.length === 0 && r.resolution.length === 2 && r.events.length === 1
  },
  {
    input: "We decided NOT to use Redis.",
    assert: (r) => r.decisions.length === 0 && r.resolution.length === 1
  },
  {
    input: "We decided to use Redis.",
    assert: (r) => r.decisions.length === 1 && r.resolution.length === 0
  },
  {
    input: "The task is to finish testing.",
    assert: (r) => r.tasks.length === 1
  },
  {
    input: "I have a task in my notes.",
    assert: (r) => r.tasks.length === 0
  },
  {
    input: "The meeting is tomorrow.",
    assert: (r) => r.events.length === 1 && r.resolution.length === 1
  },
  {
    input: "The meeting is on 15 October 2026.",
    assert: (r) => r.events.length === 1 && r.resolution.length === 0
  }
];

let failed = 0;
tests.forEach((t, i) => {
  const res = analyzeConversation(t.input);
  if (!t.assert(res)) {
    console.error("Test " + (i+1) + " failed.\nInput: " + t.input + "\nResult: " + JSON.stringify(res, null, 2));
    failed++;
  } else {
    console.log("Test " + (i+1) + " passed.");
  }
});
if (failed > 0) process.exit(1);
console.log("All tests passed.");
