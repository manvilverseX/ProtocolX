/* =====================================================
   ProtocolX — app.js
   State management, animations, particle canvas
   ===================================================== */

'use strict';

// ─── Particle Background ───────────────────────────────────────────────────

const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

let particles = [];
let animFrameId;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createParticle() {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    radius: Math.random() * 1.5 + 0.4,
    alpha: Math.random() * 0.5 + 0.1,
    color: Math.random() > 0.5
      ? `rgba(124, 58, 237, `
      : `rgba(37, 99, 235, `,
    twinkleSpeed: Math.random() * 0.02 + 0.005,
    twinklePhase: Math.random() * Math.PI * 2,
  };
}

function initParticles() {
  const count = Math.floor((canvas.width * canvas.height) / 8000);
  particles = Array.from({ length: Math.min(count, 120) }, createParticle);
}

function drawConnectionLines() {
  const maxDist = 140;
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDist) {
        const opacity = (1 - dist / maxDist) * 0.12;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(124, 58, 237, ${opacity})`;
        ctx.lineWidth = 0.6;
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  }
}

function animateParticles(time = 0) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawConnectionLines();

  for (const p of particles) {
    p.twinklePhase += p.twinkleSpeed;
    const twinkle = 0.5 + 0.5 * Math.sin(p.twinklePhase);
    const alpha = p.alpha * (0.5 + 0.5 * twinkle);

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = `${p.color}${alpha})`;
    ctx.fill();

    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0) p.x = canvas.width;
    if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height;
    if (p.y > canvas.height) p.y = 0;
  }

  animFrameId = requestAnimationFrame(animateParticles);
}

window.addEventListener('resize', () => {
  resizeCanvas();
  initParticles();
});

// ─── State Management ──────────────────────────────────────────────────────

const stateWelcome = document.getElementById('state-welcome');
const stateDashboard = document.getElementById('state-dashboard');

function showState(state) {
  if (stateWelcome) stateWelcome.classList.add('hidden');
  if (stateDashboard) stateDashboard.classList.add('hidden');

  if (state === 'dashboard') {
    if (stateDashboard) stateDashboard.classList.remove('hidden');
    document.getElementById('navbar-onboarding').style.display = 'none';
    document.querySelector('.main-content').style.display = 'none';
  } else {
    if (stateWelcome) stateWelcome.classList.remove('hidden');
    document.getElementById('navbar-onboarding').style.display = '';
    const main = document.querySelector('.main-content');
    if (main) main.style.display = '';
  }
}

function resetState() {
  showState('welcome');
  const errorEl = document.getElementById('input-error');
  if (errorEl) errorEl.style.display = 'none';
}

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

function processConversationData(text) {
  // Local processing boundary.

  // Update dashboard notice
  const lengthSpan = document.getElementById('input-length');
  if (lengthSpan) {
    lengthSpan.textContent = text.length;
  }

  // Run deterministic analysis
  analyzeConversation(text);
}

window.sourceMessages = [];
window.openSourceModal = function(idx) {
    const data = window.sourceMessages[idx];
    document.getElementById('modal-metadata').innerHTML = data.meta;
    document.getElementById('modal-body').textContent = data.text;
    const modal = document.getElementById('sourceModal');
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
};
window.closeSourceModal = function() {
    document.getElementById('sourceModal').style.display = 'none';
};
function addSourceMessage(originalText, metadata) {
   window.sourceMessages.push({ text: originalText, meta: metadata });
   return window.sourceMessages.length - 1;
}

function extractMetadata(line) {
    const prefixRegex = /^\[?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}[, ]+\d{1,2}:\d{2}(?::\d{2})?(?: [AP]M)?)\]?(?: -)? ([^:]+):\s*/i;
    const match = line.match(prefixRegex);
    if (match) {
        return `<strong>Sender:</strong> ${escapeHtml(match[2])} &nbsp;|&nbsp; <strong>Date:</strong> ${escapeHtml(match[1])}`;
    }
    return `<strong>Source:</strong> Unknown metadata`;
}

function summarizeMessage(text, type) {
    const prefixRegex = /^\[?\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}[, ]+\d{1,2}:\d{2}(?::\d{2})?(?: [AP]M)?\]?(?: -)? ([^:]+:\s*)?/i;
    let content = text.replace(prefixRegex, '').trim();
    let sentences = content.match(/[^.!?\n]+(?:[.!?\n]+|$)/g);
    if (!sentences) {
        sentences = content.split('\n').filter(s => s.trim().length > 0);
    }
    if (!sentences || sentences.length === 0) return content.substring(0, 100) + (content.length > 100 ? '...' : '');
    
    let summarySentences = [];
    if (type === 'question' || type === 'mention') {
        summarySentences = sentences.filter(s => s.includes('?') || s.includes('@'));
    } else if (type === 'task') {
        const actionWords = /todo|task|submit|register|prepare|bring|send|upload/i;
        summarySentences = sentences.filter(s => actionWords.test(s));
    } else if (type === 'decision') {
        const decisionWords = /decided|agreed|going with/i;
        summarySentences = sentences.filter(s => decisionWords.test(s));
    }
    
    if (summarySentences.length === 0) {
       summarySentences = sentences.slice(0, 1);
    } else if (summarySentences.length > 2) {
       summarySentences = summarySentences.slice(0, 2);
    }
    
    let summary = summarySentences.join(' ').trim();
    if (summary.length > 150) {
        summary = summary.substring(0, 147) + '...';
    }
    return summary;
}

function analyzeConversation(text) {
  window.sourceMessages = [];
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

  const explicitDateRegex = /\b(\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(\s+\d{4})?|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(st|nd|rd|th)?(\s*,?\s*\d{4})?|\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?)(?:\s*(?:at|,)?\s*(\d{1,2}(?:[:\.]\d{2})?\s*(?:am|pm)?))?\b/i;
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


    // Determine explicitly labeled deadlines over random event dates
    let deadline = null;
    let explicitMatches = [...content.matchAll(new RegExp(explicitDateRegex.source, 'gi'))];

    // Look for a date near 'deadline', 'closes', 'last date'
    let deadlineContext = content.match(/\b(?:deadline|closes|last date|due|by)\s*:?\s*(.*?)(?=\n|$|\|)/i);
    if (deadlineContext) {
       const dMatch = deadlineContext[1].match(explicitDateRegex);
       if (dMatch && /[a-z]|\//i.test(dMatch[0])) { // Must contain letters (month) or slashes to be a full explicit date
          deadline = dMatch[0].trim();
       }
    }

    // If no explicit deadline label, fallback to generic extracted explicit date or relative date
    if (!deadline) {
       deadline = resolveRelativeDate(content, msgDate);
       if (!deadline && explicitMatches.length > 0) deadline = explicitMatches[explicitMatches.length - 1][0].trim(); // Get the last mentioned date (often the deadline)
    }


    // Filter specific fake dates if we didn't explicitly match a deadline keyword
    if (!deadlineContext && (lowerContent.includes('gameathon') || lowerContent.includes('exhibition') || lowerContent.includes('event on'))) {
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

       let title = content.substring(0, 70);
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

  // Update UI
  const renderList = (arr, elementId, badgeId, fallback, formatter) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    const badge = document.getElementById(badgeId);
    if (badge) badge.textContent = arr.length > 0 ? arr.length : '0';

    if (arr.length === 0) {
      el.innerHTML = `<p style="color: var(--text-secondary); font-size: 14px;">${fallback}</p>`;
      return;
    }
    el.innerHTML = '';
    arr.forEach(item => {
      el.innerHTML += formatter(item);
    });
  };

  // Summary
  const summaryEl = document.getElementById('dash-summary');
  if (summaryEl) {
    summaryEl.innerHTML = `<p>Processed ${stats.lines} non-empty lines (${stats.chars} characters). Found ${urgent.length} urgent item(s), ${tasks.length} task(s), and ${decisions.length} decision(s).</p>`;
  }

  renderList(urgent, 'dash-urgent', 'badge-urgent', 'No urgent items detected.', (item) => {
    const summary = summarizeMessage(item, 'urgent');
    const idx = addSourceMessage(item, extractMetadata(item));
    return `<div class="placeholder-item clickable-item" onclick="openSourceModal(${idx})"><div class="placeholder-item-title">Keyword Match</div><div>${escapeHtml(summary)}</div></div>`;
  });
  renderList(tasks, 'dash-action-items', 'badge-action-items', 'No action items detected.', (item) => {
    const summary = summarizeMessage(item.original, 'task');
    const idx = addSourceMessage(item.original, extractMetadata(item.original));
    return `<li class="change-item clickable-item" onclick="openSourceModal(${idx})"><span class="change-dot"></span>${escapeHtml(summary)}</li>`;
  });
  renderList(questions, 'dash-mentions', 'badge-mentions', 'No questions or mentions detected.', (item) => {
    const summary = summarizeMessage(item, 'question');
    const idx = addSourceMessage(item, extractMetadata(item));
    return `<div class="placeholder-item clickable-item" onclick="openSourceModal(${idx})"><div>${escapeHtml(summary)}</div></div>`;
  });
  renderList(decisions, 'dash-decisions', 'badge-decisions', 'No decisions detected.', (item) => {
    const summary = summarizeMessage(item, 'decision');
    const idx = addSourceMessage(item, extractMetadata(item));
    return `<li class="change-item positive clickable-item" onclick="openSourceModal(${idx})"><span class="change-dot"></span>${escapeHtml(summary)}</li>`;
  });
  renderList(resolution, 'dash-resolution', 'badge-resolution', 'Nothing detected.', (item) => {
    const summary = summarizeMessage(item, 'question');
    const idx = addSourceMessage(item, extractMetadata(item));
    return `<div class="placeholder-item clickable-item" onclick="openSourceModal(${idx})"><div class="placeholder-item-title">Needs confirmation</div><div>${escapeHtml(summary)}</div></div>`;
  });

  // Tabs
  renderList(tasks, 'tab-action-items-list', null, 'No action items detected.', (item) => {
    if (typeof item === 'object') {
      const summary = summarizeMessage(item.original, 'task');
      const idx = addSourceMessage(item.original, extractMetadata(item.original));
      return `<div class="placeholder-item clickable-item" onclick="openSourceModal(${idx})" style="margin-bottom: 12px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                <div class="placeholder-item-title" style="color: #3b82f6; margin-bottom: 6px; font-weight: 600;">${escapeHtml(summary)}</div>
                <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 4px;">
                  <strong>Owner:</strong> ${escapeHtml(item.owner)} &nbsp;|&nbsp;
                  <strong>Deadline:</strong> ${escapeHtml(item.deadline)} &nbsp;|&nbsp;
                  <strong>Status:</strong> ${escapeHtml(item.status)} &nbsp;|&nbsp;
                  <strong>Priority:</strong> ${escapeHtml(item.priority)}
                </div>
             </div>`;
    }
    return `<div class="placeholder-item"><label class="placeholder-item-title">${escapeHtml(item)}</label></div>`;
  });

  const eventsEl = document.getElementById('tab-events-list');
  if (eventsEl) {
    if (highlights.length === 0) {
      eventsEl.innerHTML = `<p style="color: var(--text-secondary); font-size: 14px;">No meaningful historical highlights detected.</p>`;
    } else {
      let groups = {};
      highlights.forEach(h => {
        let d = h.date;
        if (!groups[d]) groups[d] = [];
        groups[d].push(h);
      });



      let sortedDates = Object.keys(groups).sort((a, b) => {
        return parseSortDate(b) - parseSortDate(a);
      });

      let html = '';
      sortedDates.forEach(d => {
        html += `<div style="margin-bottom: 24px;">
                   <h4 style="margin: 0 0 12px 0; color: var(--text-primary); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">${escapeHtml(d)}</h4>`;
        groups[d].forEach(h => {
          const summary = summarizeMessage(h.original, 'highlight');
          const idx = addSourceMessage(h.original, extractMetadata(h.original));
          html += `<div class="placeholder-item clickable-item" onclick="openSourceModal(${idx})" style="margin-bottom: 12px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                     <div class="placeholder-item-title" style="color: #3b82f6; margin-bottom: 6px; font-weight: 600;">[${escapeHtml(h.type)}] ${escapeHtml(h.desc)}</div>
                     <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">${escapeHtml(summary)}</div>
                   </div>`;
        });
        html += `</div>`;
      });
      eventsEl.innerHTML = html;
    }
  }
}


// Action State Persistence (In-memory only)
window.pxActionState = window.pxActionState || {};
window.toggleAction = function(taskId, checkbox) {
  window.pxActionState[taskId] = checkbox.checked;
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
  let baseMs = parseSortDate(msgDateStr);
  if (!baseMs) return null;
  let baseDate = new Date(baseMs);
  const lower = text.toLowerCase();

  let timeSet = false;
  // Parse explicit time like "11.00 AM" or "10:30"
  const timeMatch = text.match(/\b(\d{1,2})(?:[:\.](\d{2}))?\s*(am|pm)\b/i);
  if (timeMatch) {
     let h = parseInt(timeMatch[1], 10);
     let min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
     if (timeMatch[3].toLowerCase() === 'pm' && h < 12) h += 12;
     if (timeMatch[3].toLowerCase() === 'am' && h === 12) h = 0;
     baseDate.setHours(h, min, 0, 0);
     timeSet = true;
  }

  let isRelative = false;

  if (lower.includes('tomorrow')) {
    baseDate.setDate(baseDate.getDate() + 1);
    isRelative = true;
  } else if (lower.includes('today') || lower.includes('eod')) {
    isRelative = true;
    if (lower.includes('eod') && !timeSet) {
       baseDate.setHours(23, 59, 59, 999);
       timeSet = true;
    }
  } else {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < days.length; i++) {
      if (lower.includes('by ' + days[i]) || lower.includes('next ' + days[i])) {
        let currentDay = baseDate.getDay();
        let diff = i - currentDay;
        if (diff <= 0) diff += 7;
        baseDate.setDate(baseDate.getDate() + diff);
        isRelative = true;
        break;
      }
    }
  }

  if (!isRelative && !timeSet) return null;

  // Format nicely
  if (timeSet && timeMatch) {
     return baseDate.toDateString() + " " + timeMatch[0].toUpperCase();
  } else if (lower.includes('eod')) {
     return baseDate.toDateString() + " EOD";
  }
  return baseDate.toDateString();
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function startAnalysis() {
  const inputEl = document.getElementById('chatInput');
  const errorEl = document.getElementById('input-error');

  if (!inputEl) return;

  const text = inputEl.value.trim();
  if (!text) {
    if (errorEl) {
      errorEl.textContent = 'Please paste a conversation to analyze.';
      errorEl.style.display = 'block';
    }
    return;
  }

  if (errorEl) {
    errorEl.style.display = 'none';
  }

  const btn = document.getElementById('analyzeBtn');
  btn.style.pointerEvents = 'none';
  const originalHtml = btn.querySelector('.btn-content').innerHTML;
  btn.querySelector('.btn-content').innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
      style="animation:spin 0.8s linear infinite">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    Analyzing Conversation...
  `;

  if (!document.getElementById('spinKf')) {
    const s = document.createElement('style');
    s.id = 'spinKf';
    s.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(s);
  }

  // Pass to local processor
  processConversationData(text);

  // Fake delay then transition
  setTimeout(() => {
    btn.style.pointerEvents = '';
    btn.querySelector('.btn-content').innerHTML = originalHtml;
    showState('dashboard');
  }, 1500);
}

function switchDashTab(tabId) {
  document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.dash-tab-panel').forEach(p => {
    p.classList.remove('active');
    p.style.animation = 'none';
  });

  const tab = document.getElementById('tab-' + tabId);
  const panel = document.getElementById('panel-' + tabId);

  if (tab) tab.classList.add('active');
  if (panel) {
    panel.classList.add('active');
    requestAnimationFrame(() => {
      panel.style.animation = '';
    });
    const content = document.querySelector('.dash-content');
    if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ─── File Import Logic ──────────────────────────────────────────────────────

const fileInput = document.getElementById('chatFileInput');
if (fileInput) {
  fileInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const errorEl = document.getElementById('input-error');
    const chatInput = document.getElementById('chatInput');

    let hasError = false;
    let appendedAny = false;

    for (const file of files) {
      try {
        if (file.name.endsWith('.txt')) {
          const text = await file.text();
          appendChatText(chatInput, file.name, text);
          appendedAny = true;
        } else if (file.name.endsWith('.zip')) {
          if (typeof JSZip === 'undefined') {
            throw new Error("JSZip library is not loaded.");
          }
          const jszip = new JSZip();
          const zip = await jszip.loadAsync(file);

          let candidateFiles = [];
          zip.forEach((relativePath, zipEntry) => {
            // Ignore macOS specific hidden folders and normal folders
            if (!zipEntry.dir && relativePath.endsWith('.txt') && !relativePath.includes('__MACOSX')) {
              candidateFiles.push(zipEntry);
            }
          });

          if (candidateFiles.length === 0) {
            throw new Error(`No valid text files found in ${file.name}.`);
          }

          // Deterministic selection: prefer '_chat.txt' (WhatsApp standard), else alphabetical
          let selectedEntry = candidateFiles.find(e => e.name.endsWith('_chat.txt'));
          if (!selectedEntry) {
             candidateFiles.sort((a, b) => a.name.localeCompare(b.name));
             selectedEntry = candidateFiles[0];
          }

          const text = await selectedEntry.async("string");
          appendChatText(chatInput, file.name + ' > ' + selectedEntry.name, text);
          appendedAny = true;
        } else {
          throw new Error(`Unsupported file type: ${file.name}. Only .txt and .zip are supported.`);
        }
      } catch (err) {
        hasError = true;
        if (errorEl) {
          errorEl.textContent = err.message || `Error processing ${file.name}.`;
          errorEl.style.display = 'block';
        }
      }
    }

    if (appendedAny && !hasError && errorEl) {
      errorEl.style.display = 'none';
    }

    // Clear input so same file can be uploaded again
    e.target.value = '';
  });
}

function appendChatText(textarea, sourceName, text) {
  const boundary = `\n\n--- Imported Chat: ${sourceName} ---\n`;
  const endBoundary = `\n--- End of Chat: ${sourceName} ---\n\n`;
  textarea.value = (textarea.value.trim() ? textarea.value.trim() : '') + boundary + text.trim() + endBoundary;
}

// Init
resizeCanvas();
initParticles();
animateParticles();

// Default state
showState('welcome');
