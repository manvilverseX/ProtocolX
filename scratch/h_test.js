
function parseSortDate(dStr) {
  
  const match = dStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (match) {
    let d = parseInt(match[1], 10);
    let m = parseInt(match[2], 10);
    let y = parseInt(match[3], 10);
    if (y < 100) y += 2000;
    return new Date(y, m - 1, d).getTime();
  }
  return new Date(dStr).getTime() || 0;
}

function analyzeConversation(text) {
    
  const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const lines = [];
  const whatsappTimestampRegex = /^\[?\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}[, ]+\d{1,2}:\d{2}(?::\d{2})?(?: [AP]M)?\]?(?: -)? /i;

  for (let i = 0; i < rawLines.length; i++) {
    if (whatsappTimestampRegex.test(rawLines[i]) || lines.length === 0) {
      lines.push(rawLines[i]);
    } else {
      lines[lines.length - 1] += ' ' + rawLines[i];
    }
  }

  let stats = { chars: text.length, lines: lines.length };
  let urgent = [];
  let tasks = [];
  let questions = [];
  let decisions = [];
  let resolution = [];
  let highlights = [];

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
    const edMatch = lowerLine.match(explicitDateRegex);
    const extractedExplicitDate = edMatch ? edMatch[0].trim() : null;

    if (hasAmbiguousDate || hasExplicitDate) {
      if (hasAmbiguousDate && !hasExplicitDate) {
        if (!resolution.includes(line)) resolution.push(line);
      }
    }

    // Past Highlights Logic
    let msgDateMatch = line.match(/^\[?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
    let msgDate = msgDateMatch ? msgDateMatch[1] : 'Unknown Date';
    let eventDate = msgDate;

    const prefixRegex = /^\[?\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}[, ]+\d{1,2}:\d{2}(?::\d{2})?(?: [AP]M)?\]?(?: -)? [^:]+:\s*/i;
    let content = line.replace(prefixRegex, '');
    let lowerContent = content.toLowerCase().replace(/['’‘`]/g, "'");

    let highlightType = null;
    let description = '';

    const edMatchContent = content.match(explicitDateRegex);
    const extractedExplicitDateContent = edMatchContent ? edMatchContent[0].trim() : null;

    const isQuestionNode = lowerContent.includes('?');
    const isUncertain = /\b(not sure|maybe|guess|probably|might|going with the flow|not decided|undecided)\b/i.test(lowerContent);
    const isNegatedNode = lowerContent.includes('decided not') || lowerContent.includes('agreed not') || lowerContent.includes('will not go') || lowerContent.includes("won't go");

    // Decisions
    const isDecision = decisionKeywords.some(kw => lowerContent.includes(kw)) && !isQuestionNode && !isNegatedNode && !isUncertain;

    // Completed Action
    const isCompletedVerb = /\b(done with|done it|done that|done testing)\b/i.test(lowerContent) || /\b(is|are|was|were|have|has|i've|we've|you've|i|we|they|he|she)\s+(\w+\s+)?(finished|completed|resolved|done)\b/i.test(lowerContent) || /\b(task|it|this|that|work|all|project|module)\s+(\w+\s+)?(finished|completed|resolved|done)\b/i.test(lowerContent) || /^(finished|completed|resolved)\b/i.test(lowerContent.trim()) || /(^|update:\s*|status:\s*|fyi:\s*)(finished|completed|resolved)\b/i.test(lowerContent.trim());
    const isCompletedNegated = /\b(will|going to|plan to|should|not|isn't|aren't|wasn't|weren't|haven't|hasn't|can't|cannot|needs to|need to|have to|has to|want to|wanna|hope to|to be|having)\s+(\w+\s+)?(finish|complete|resolve|done|finished|completed|resolved)\b/i.test(lowerContent) || /\b(not finished|not completed|not done|not resolved)\b/i.test(lowerContent);
    const isPartialProgress = /\b(for now|partially|almost|half|some of|part of|not fully|not entirely)\b/i.test(lowerContent);
    const isCompleted = isCompletedVerb && !isCompletedNegated && !isPartialProgress && !isQuestionNode && !isUncertain;

    // Significant Update
    const isUpdate = /(update:|status:|fyi\b|heads up|just so you know)/i.test(lowerContent) && lowerContent.length > 15 && (!isUncertain || isCompletedVerb);

    // Important Event
    const isImportantEvent = /\b(meeting|deadline|milestone|launch|release|presentation|event|appointment)\b/i.test(lowerContent) && extractedExplicitDateContent && !isQuestionNode && !isUncertain;

    if (isDecision) {
       highlightType = 'Explicit Decision';
       description = 'Decision made or confirmed';
       if (extractedExplicitDateContent) eventDate = extractedExplicitDateContent;
    } else if (isCompleted) {
       highlightType = 'Completed Action';
       description = 'Task or commitment reported as completed';
       if (extractedExplicitDateContent) eventDate = extractedExplicitDateContent;
    } else if (isImportantEvent) {
       highlightType = 'Important Event';
       description = 'Historical event or milestone';
       eventDate = extractedExplicitDateContent;
    } else if (isUpdate) {
       highlightType = 'Significant Update';
       description = 'Context update shared';
       if (extractedExplicitDateContent) eventDate = extractedExplicitDateContent;
    }

    if (highlightType && !lowerContent.includes('<media omitted>')) {
       // Also exclude basic greetings and single-word empty messages
       const strippedContent = lowerContent.replace(/[^\w\s]/g, '').trim();
       if (!/^(hello|hi|hey|thanks|thank you|ok|okay|sure|yes|no|yep|yup|nah)$/i.test(strippedContent) && strippedContent.length > 0) {
           highlights.push({ date: eventDate, msgDate, desc: description, type: highlightType, original: line });
       }
    }
  }

  
    return { urgent, tasks, questions, decisions, resolution, highlights };
}

const tests = [
  {
    name: "Chronological Ordering Array Helper",
    input: "N/A",
    assert: () => {
      let dates = ['26/03/26', '12/06/26', '18/07/26', '15 Oct 2026', '15 Oct 2025'];
      dates.sort((a, b) => parseSortDate(b) - parseSortDate(a));
      const expected = ['15 Oct 2026', '18/07/26', '12/06/26', '26/03/26', '15 Oct 2025'];
      return JSON.stringify(dates) === JSON.stringify(expected);
    }
  },
  {
    name: "Bug 4 - Ambiguous I'm done",
    input: "24/03/26, 21:32 - Veda: Yes I'm done why can't he clear everything at once",
    assert: (r) => r.highlights.length === 0
  },
  {
    name: "Valid Completed Action 1 (Finished module)",
    input: "25/03/26, 12:00 - User: Finished module 5",
    assert: (r) => r.highlights.some(h => h.type === "Completed Action")
  },
  {
    name: "Valid Completed Action 2 (Update finished)",
    input: "26/03/26, 21:29 - Manvil: Update: i finished it today",
    assert: (r) => r.highlights.some(h => h.type === "Completed Action")
  },
  {
    name: "Valid Completed Action 3 (Done with report)",
    input: "25/03/26, 12:00 - User: I am done with the report.",
    assert: (r) => r.highlights.some(h => h.type === "Completed Action")
  },
  {
    name: "Issue 1 - Forwarded form (Adjective completed)",
    input: "10/08/26, 12:00 - Admin: Please submit completed forms",
    assert: (r) => r.highlights.length === 0
  },
  {
    name: "Issue 2 - Haven't completed (Curly quote)",
    input: "10/08/26, 12:00 - Admin: These students haven’t completed VTU registration",
    assert: (r) => r.highlights.length === 0
  },
  {
    name: "Issue 3 - Once completed (Conditional)",
    input: "10/08/26, 12:00 - Admin: Once completed, DM proof of registration",
    assert: (r) => r.highlights.length === 0
  },
  {
    name: "Issue 4 & 5 - Case preservation",
    input: "07/08/26, 12:00 - Admin: enrollment deadline is 10 August 2026",
    assert: (r) => r.highlights.some(h => h.date === "10 August 2026")
  },
  {
    name: "Valid Completed Action 4 (Consultancy project completed)",
    input: "25/03/26, 12:00 - User: Consultancy project completed and handed over",
    assert: (r) => r.highlights.some(h => h.type === "Completed Action")
  }
];

let failed = 0;
tests.forEach((t, i) => {
  if (t.input === "N/A") {
    if (!t.assert()) {
      console.error("Test " + (i+1) + " (" + t.name + ") failed.");
      failed++;
    } else {
      console.log("Test " + (i+1) + " (" + t.name + ") passed.");
    }
    return;
  }

  const res = analyzeConversation(t.input);
  if (!t.assert(res)) {
    console.error("Test " + (i+1) + " (" + t.name + ") failed.\nResult: " + JSON.stringify(res.highlights, null, 2));
    failed++;
  } else {
    console.log("Test " + (i+1) + " (" + t.name + ") passed.");
  }
});
if (failed > 0) process.exit(1);
console.log("All tests passed successfully.");
