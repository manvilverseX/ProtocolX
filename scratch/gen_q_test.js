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
    name: "Exact duplicate lines",
    input: "Are you there?\\nAre you there?",
    assert: (r) => r.questions.length === 1 && r.questions[0] === "Are you there?"
  },
  {
    name: "Legitimate repeated messages with different timestamps",
    input: "[12:00] Alice: Are you there?\\n[12:01] Alice: Are you there?",
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
    console.error("Test " + (i+1) + " (" + t.name + ") failed.\\nResult: " + JSON.stringify(res.questions, null, 2));
    failed++;
  } else {
    console.log("Test " + (i+1) + " (" + t.name + ") passed.");
  }
});
if (failed > 0) process.exit(1);
console.log("All tests passed successfully.");
`;

fs.writeFileSync('scratch/q_test.js', scriptContent);
