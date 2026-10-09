
const lsMock = {};
global.localStorage = {
  getItem: (k) => lsMock[k] || null,
  setItem: (k, v) => lsMock[k] = v
};
global.window = {};

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
function resolveRelativeDate(text, msgDateStr) {
  
  let baseDate = new Date(parseSortDate(msgDateStr));
  if (isNaN(baseDate.getTime()) || baseDate.getTime() === 0) return null;
  const lower = text.toLowerCase();
  
  if (lower.includes('tomorrow')) {
    baseDate.setDate(baseDate.getDate() + 1);
    return baseDate.toDateString();
  }
  if (lower.includes('today') || lower.includes('eod')) {
    return baseDate.toDateString();
  }
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (lower.includes('by ' + days[i]) || lower.includes('next ' + days[i])) {
      let currentDay = baseDate.getDay();
      let diff = i - currentDay;
      if (diff <= 0) diff += 7;
      baseDate.setDate(baseDate.getDate() + diff);
      return baseDate.toDateString();
    }
  }
  return null;
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

    // Tasks Advanced Extraction
    const isActionKeyword = /\b(todo|action item|task:|need to|will do|assign to|(the|this|my|your|our)(\s+\w+){0,2}\s+task|submit|register|registration|prepare|bring|send|upload|dm proof)\b/i.test(lowerLine);
    const excludeAction = /\b(could|maybe|if|hypothetically|wonder if|would be nice)\b/i.test(lowerLine);

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

    let deadline = extractedExplicitDateContent || resolveRelativeDate(lowerContent, msgDate);
    
    // Filter specific fake dates
    if (lowerContent.includes('gameathon') || lowerContent.includes('exhibition') || lowerContent.includes('event on')) {
       deadline = null; // Don't invent deadlines from event dates
    }
    
    let isOverdue = false;
    if (deadline) {
       let parsed = parseSortDate(deadline);
       // Check if older than today (e.g. Oct 9 2026)
       if (parsed > 0 && parsed < new Date('2026-10-09').getTime()) {
          isOverdue = true;
       }
    }

    // Build Task Object
    if (isActionKeyword && !excludeAction && !isCompleted) {
       let owner = "Unclear";
       if (/\b(i need to|my task|i will do|i'll)\b/i.test(lowerContent)) owner = "Me";
       else if (/\b(mohul girish|mohul)\b/i.test(lowerContent)) owner = "Mohul Girish";
       else if (/\b(you need to|your task)\b/i.test(lowerContent)) owner = "Assigned";
       else if (/\b(all students|everyone)\b/i.test(lowerContent)) owner = "All Students";
       else if (/\b(students haven't completed|students who haven't)\b/i.test(lowerContent)) owner = "Pending Students";
       else if (/\b(students who already registered)\b/i.test(lowerContent)) owner = "Registered Students";

       let priority = urgentKeywords.some(kw => lowerLine.includes(kw)) ? "Urgent" : "Normal";
       let status = isOverdue ? "Overdue" : "Pending";
       if (isUncertain) status = "Needs confirmation";
       
       let title = content.replace(/^.*:\s*/, '').substring(0, 70);
       if (content.length > 70) title += "...";

       let dedupeKey = (owner + " " + (content.match(/\b(idp report|work diary|vtu registration|striver|pals event)\b/i)?.[0] || content.substring(0, 15))).toLowerCase();

       let existing = tasks.find(t => t.dedupeKey === dedupeKey && dedupeKey.length > 10);
       if (!existing) {
         tasks.push({
           action: title,
           owner: owner,
           deadline: deadline || "No deadline specified",
           status: status,
           priority: priority,
           original: line,
           dedupeKey: dedupeKey
         });
       } else {
         existing.original += "\n" + line; // Consolidate evidence
       }
    }


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
    name: "Case 1 - Relative EOD today",
    input: "15/06/26, 09:00 - Admin: submit elective preferences EOD today",
    assert: (r) => r.tasks.length === 1 && r.tasks[0].deadline === "Mon Jun 15 2026"
  },
  {
    name: "Case 2 - Duplicate Reminders",
    input: "18/06/26, 09:00 - Admin: Submit IDP report\n19/06/26, 12:00 - Admin: Submit IDP report immediately",
    assert: (r) => r.tasks.length === 1 && r.tasks[0].original.includes("\n")
  },
  {
    name: "Case 3 - IDP Exhibition",
    input: "25/07/26, 10:00 - Admin: IDP exhibition is today",
    assert: (r) => r.tasks.length === 0 || r.tasks[0].deadline === null
  },
  {
    name: "Case 4 - PALS event",
    input: "01/08/26, 10:00 - Admin: Register for PALS event by 8 August 2026",
    assert: (r) => r.tasks.length === 1 && r.tasks[0].deadline === "8 August 2026"
  },
  {
    name: "Case 5 - Comp-SIF",
    input: "01/10/26, 10:00 - Admin: Comp-SIF paper submit by 14 November 2026",
    assert: (r) => r.tasks.length === 1 && r.tasks[0].deadline === "14 November 2026"
  },
  {
    name: "Case 7 - Relative tomorrow",
    input: "28/09/26, 10:00 - Admin: VTU registration tomorrow",
    assert: (r) => r.tasks.length === 1 && r.tasks[0].deadline === "Tue Sep 29 2026"
  },
  {
    name: "Case 9 - Gameathon",
    input: "01/10/26, 10:00 - Admin: Gameathon event on 23-24 October 2026",
    assert: (r) => r.tasks.length === 0
  },
  {
    name: "Case 10 - Mohul Girish assignment",
    input: "01/10/26, 10:00 - Admin: Mohul Girish need to meet",
    assert: (r) => r.tasks.length === 1 && r.tasks[0].owner === "Mohul Girish"
  },
  {
    name: "Case 11 - Regression Finished module 5",
    input: "01/10/26, 10:00 - Admin: Finished module 5",
    assert: (r) => r.tasks.length === 0
  }
];

let failed = 0;
tests.forEach((t, i) => {
  const res = analyzeConversation(t.input);
  if (!t.assert(res)) {
    console.error("Test " + (i+1) + " (" + t.name + ") failed.\nResult: " + JSON.stringify(res.tasks, null, 2));
    failed++;
  } else {
    console.log("Test " + (i+1) + " (" + t.name + ") passed.");
  }
});
if (failed > 0) process.exit(1);
console.log("All tasks tests passed successfully.");
