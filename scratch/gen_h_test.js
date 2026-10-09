const fs = require('fs');
const js = fs.readFileSync('app.js', 'utf8');

// Extract parseSortDate
const sortMatch = js.match(/function parseSortDate[\s\S]*?\{([\s\S]*?)\n\}/);
const sortBody = sortMatch[1];

// Extract analyzeConversation
const match = js.match(/function analyzeConversation[\s\S]*?\{([\s\S]*?)\/\/\s*Update UI/);
const body = match[1];

const scriptContent = `
function parseSortDate(dStr) {
  ${sortBody}
}

function analyzeConversation(text) {
    ${body}
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
    console.error("Test " + (i+1) + " (" + t.name + ") failed.\\nResult: " + JSON.stringify(res.highlights, null, 2));
    failed++;
  } else {
    console.log("Test " + (i+1) + " (" + t.name + ") passed.");
  }
});
if (failed > 0) process.exit(1);
console.log("All tests passed successfully.");
`;

fs.writeFileSync('scratch/h_test.js', scriptContent);
