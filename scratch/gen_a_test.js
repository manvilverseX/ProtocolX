const fs = require('fs');
const js = fs.readFileSync('app.js', 'utf8');

// Extract all needed functions
const sortMatch = js.match(/function parseSortDate[\s\S]*?\{([\s\S]*?)\n\}/);
const resolveDateMatch = js.match(/function resolveRelativeDate[\s\S]*?\{([\s\S]*?)\n\}/);
const analyzeMatch = js.match(/function analyzeConversation[\s\S]*?\{([\s\S]*?)\/\/\s*Update UI/);

const scriptContent = `
const lsMock = {};
global.localStorage = {
  getItem: (k) => lsMock[k] || null,
  setItem: (k, v) => lsMock[k] = v
};
global.window = {};

function parseSortDate(dStr) {
  ${sortMatch[1]}
}
function resolveRelativeDate(text, msgDateStr) {
  ${resolveDateMatch[1]}
}

function analyzeConversation(text) {
    ${analyzeMatch[1]}
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
    input: "18/06/26, 09:00 - Admin: Submit IDP report\\n19/06/26, 12:00 - Admin: Submit IDP report immediately",
    assert: (r) => r.tasks.length === 1 && r.tasks[0].original.includes("\\n")
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
    console.error("Test " + (i+1) + " (" + t.name + ") failed.\\nResult: " + JSON.stringify(res.tasks, null, 2));
    failed++;
  } else {
    console.log("Test " + (i+1) + " (" + t.name + ") passed.");
  }
});
if (failed > 0) process.exit(1);
console.log("All tasks tests passed successfully.");
`;

fs.writeFileSync('scratch/a_test.js', scriptContent);
