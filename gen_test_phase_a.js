const fs = require('fs');
const js = fs.readFileSync('app.js', 'utf8').replace('function analyzeConversation(text) {', 'function analyzeConversation(text) { global.tasks = [];').replace('let tasks = [];', 'tasks = global.tasks;');

const domMock = `
const lsMock = {};
global.localStorage = {
  getItem: (k) => lsMock[k] || null,
  setItem: (k, v) => lsMock[k] = v
};
global.window = { addEventListener: () => {} };
global.document = {
  getElementById: () => ({ width: 800, height: 600, style: {}, classList: { add: ()=>{}, remove: ()=>{} }, getContext: ()=>({ clearRect: ()=>{} }), addEventListener: ()=>{} }),
  querySelector: () => ({ style: {}, classList: { add: ()=>{}, remove: ()=>{} } })
};
global.requestAnimationFrame = () => {};
global.renderList = () => {};
`;

fs.writeFileSync('scratch/test_phase_a.js', domMock + js + `
const tests = [
  {
    name: "June 15 EOD deadline",
    input: "15/06/26, 09:00 - Admin: submit your elective preferences by EOD today",
    assert: (r) => r.tasks.length === 1 && r.tasks[0].deadline === "Mon Jun 15 2026 EOD"
  },
  {
    name: "June 16 11:00 AM deadline",
    input: "16/06/26, 09:00 - Admin: submit the elective preference by 11.00 AM",
    assert: (r) => r.tasks.length === 1 && r.tasks[0].deadline.toLowerCase() === "tue jun 16 2026 11.00 am"
  },
  {
    name: "PALS registration deadline",
    input: "01/08/26, 09:00 - Admin: PALS event on 11 August, registration deadline 8 August",
    assert: (r) => r.tasks.length === 1 && r.tasks[0].deadline.toLowerCase().includes("8 august")
  },
  {
    name: "NCMC registration window",
    input: "21/09/26, 09:00 - Admin: NCMC registration opens 21 September 2026 at 10:30 AM and closes 22 September at 4:00 PM.",
    assert: (r) => r.tasks.length === 1 && r.tasks[0].deadline === "22 September at 4:00 PM"
  },
  {
    name: "VTU September 29 10:30 AM deadline",
    input: "28/09/26, 09:00 - Admin: complete VTU registration tomorrow at 10:30 AM",
    assert: (r) => r.tasks.length === 1 && r.tasks[0].deadline.toLowerCase() === "tue sep 29 2026 10:30 am"
  },
  {
    name: "Gameathon event dates",
    input: "01/10/26, 09:00 - Admin: Gameathon event on 23-24 October 2026",
    assert: (r) => r.tasks.length === 0
  }
];

let failed = 0;
tests.forEach((t, i) => {
  analyzeConversation(t.input);
  const res = { tasks: global.tasks };
  if (!t.assert(res)) {
    console.error("Test " + (i+1) + " (" + t.name + ") failed.\\nResult: " + JSON.stringify(res.tasks, null, 2));
    failed++;
  } else {
    console.log("Test " + (i+1) + " (" + t.name + ") passed.");
  }
});
if (failed > 0) process.exit(1);
console.log("Phase A tests passed successfully.");
`);
