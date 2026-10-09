const fs = require('fs');
const js = fs.readFileSync('app.js', 'utf8');
const match = js.match(/function analyzeConversation[\s\S]*?\{([\s\S]*?)\/\/\s*Update UI/);
const body = match[1];

const scriptContent = `
function analyzeConversation(text) {
    ${body}
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
    console.error("Test " + (i+1) + " failed.\\nInput: " + t.input + "\\nResult: " + JSON.stringify(res, null, 2));
    failed++;
  } else {
    console.log("Test " + (i+1) + " passed.");
  }
});
if (failed > 0) process.exit(1);
console.log("All tests passed.");
`;

fs.writeFileSync('scratch/test.js', scriptContent);
