const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');

// 1. Add global toggle function and CSS classes at the top of app.js, and local storage state
content = content.replace("function escapeHtml(unsafe) {", `
// Action State Persistence
window.pxActionState = JSON.parse(localStorage.getItem('px-action-state') || '{}');
window.toggleAction = function(taskId, checkbox) {
  window.pxActionState[taskId] = checkbox.checked;
  localStorage.setItem('px-action-state', JSON.stringify(window.pxActionState));
  const card = document.getElementById('task-card-' + taskId);
  const statusEl = document.getElementById('task-status-' + taskId);
  if (checkbox.checked) {
    card.style.opacity = '0.6';
    statusEl.innerHTML = '<span style="color:#10b981;font-weight:bold;">Completed (Manual)</span>';
  } else {
    card.style.opacity = '1';
    statusEl.innerHTML = card.dataset.originalStatus;
  }
};
window.toggleEvidence = function(taskId) {
  const el = document.getElementById('task-evidence-' + taskId);
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

function generateTaskId(task) {
  let str = task.action + task.owner;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; 
  }
  return 't' + Math.abs(hash);
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

function escapeHtml(unsafe) {`);


// 2. Replace the task extraction logic inside analyzeConversation
const newExtraction = `
    // Check Overdue & Deadlines
    let deadline = extractedExplicitDateContent || resolveRelativeDate(lowerContent, msgDate);
    
    // Filter specific fake dates
    if (lowerContent.includes('gameathon') || lowerContent.includes('exhibition') || lowerContent.includes('event on') || lowerContent.includes('comp-sif')) {
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
       if (/\\b(i need to|my task|i will do|i'll)\\b/i.test(lowerContent)) owner = "Me";
       else if (/\\b(mohul girish|mohul)\\b/i.test(lowerContent)) owner = "Mohul Girish";
       else if (/\\b(you need to|your task)\\b/i.test(lowerContent)) owner = "Assigned";
       else if (/\\b(all students|everyone)\\b/i.test(lowerContent)) owner = "All Students";
       else if (/\\b(students haven't completed|students who haven't)\\b/i.test(lowerContent)) owner = "Pending Students";
       else if (/\\b(students who already registered)\\b/i.test(lowerContent)) owner = "Registered Students";

       let priority = urgentKeywords.some(kw => lowerLine.includes(kw)) ? "Urgent" : "Normal";
       let status = isOverdue ? "Overdue" : "Pending";
       if (isUncertain) status = "Needs confirmation";
       
       let title = content.replace(/^.*:\\s*/, '').substring(0, 70);
       if (content.length > 70) title += "...";

       let dedupeKey = (owner + " " + (content.match(/\\b(idp report|work diary|vtu registration|striver|pals event)\\b/i)?.[0] || content.substring(0, 15))).toLowerCase();

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
         existing.original += "\\n" + line; // Consolidate evidence
       }
    }
`;

content = content.replace(/let isOverdue = false;[\s\S]*?tasks\.push\(\{[\s\S]*?\}\);\s*\}/, newExtraction);

// 3. Update the UI renderList for tab-action-items-list
const newRender = `
  renderList(tasks, 'tab-action-items-list', null, 'No action items detected.', (item) => {
    if (typeof item === 'object') {
      const taskId = generateTaskId(item);
      const isChecked = window.pxActionState && window.pxActionState[taskId] ? 'checked' : '';
      const opacity = isChecked ? '0.6' : '1';
      const statusDisplay = isChecked ? '<span style="color:#10b981;font-weight:bold;">Completed (Manual)</span>' : escapeHtml(item.status);
      
      return \`<div id="task-card-\${taskId}" data-original-status="\${escapeHtml(item.status)}" class="placeholder-item" style="margin-bottom: 12px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); opacity: \${opacity}; transition: opacity 0.2s;">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                  <input type="checkbox" \${isChecked} onchange="toggleAction('\${taskId}', this)" style="margin-top: 4px; transform: scale(1.2); cursor: pointer;" />
                  <div style="flex: 1;">
                    <div class="placeholder-item-title" style="color: #3b82f6; margin-bottom: 6px; font-weight: 600;">\${escapeHtml(item.action)}</div>
                    <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 4px;">
                      <strong>Owner:</strong> \${escapeHtml(item.owner)} &nbsp;|&nbsp;
                      <strong>Deadline:</strong> \${escapeHtml(item.deadline)} &nbsp;|&nbsp;
                      <strong>Status:</strong> <span id="task-status-\${taskId}">\${statusDisplay}</span> &nbsp;|&nbsp;
                      <strong>Priority:</strong> \${escapeHtml(item.priority)}
                    </div>
                    <button onclick="toggleEvidence('\${taskId}')" style="background: none; border: none; color: #8b5cf6; font-size: 12px; cursor: pointer; padding: 0; text-decoration: underline;">Why is this shown?</button>
                    <div id="task-evidence-\${taskId}" style="display: none; font-size: 12px; color: rgba(255,255,255,0.4); border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 6px; margin-top: 6px; white-space: pre-wrap;">Source: \${escapeHtml(item.original)}</div>
                  </div>
                </div>
             </div>\`;
    }
    return \`<div class="placeholder-item"><label class="placeholder-item-title">\${escapeHtml(item)}</label></div>\`;
  });
`;

content = content.replace(/renderList\(tasks, 'tab-action-items-list'[\s\S]*?\}\);\s*\}\);/, newRender.trim());

fs.writeFileSync('app.js', content);
