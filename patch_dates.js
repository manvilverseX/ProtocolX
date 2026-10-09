const fs = require('fs');

let content = fs.readFileSync('app.js', 'utf8');

// 1. Rewrite parseSortDate to not rely on new Date() fallback for text dates without years
const parseSortDateNew = `function parseSortDate(dStr, referenceDateMs = null) {
  if (!dStr) return 0;
  
  // Try DD/MM/YY
  const numMatch = dStr.match(/^(\\d{1,2})[\\/\\-\\.](\\d{1,2})[\\/\\-\\.](\\d{2,4})/);
  if (numMatch) {
    let d = parseInt(numMatch[1], 10);
    let m = parseInt(numMatch[2], 10);
    let y = parseInt(numMatch[3], 10);
    if (y < 100) y += 2000;
    return new Date(y, m - 1, d).getTime();
  }

  // Parse Textual Date (e.g., 14 November 2026, or 14 November)
  const monthNames = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
  const textMatch = dStr.toLowerCase().match(/(\\d{1,2})(?:st|nd|rd|th)?\\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\\s*,?\\s*(\\d{4}))?/i) ||
                    dStr.toLowerCase().match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*,?\\s*(\\d{4}))?/i);

  if (textMatch) {
    let d = parseInt(textMatch[1] || textMatch[2], 10);
    let mStr = (textMatch[2] && monthNames[textMatch[2].substring(0,3)]) !== undefined ? textMatch[2] : textMatch[1];
    let m = monthNames[mStr.substring(0, 3)];
    let y = textMatch[3] ? parseInt(textMatch[3], 10) : null;

    if (!y) {
       // If no year, infer from referenceDate or current year
       if (referenceDateMs) {
          y = new Date(referenceDateMs).getFullYear();
       } else {
          y = 2026; // Default to the dataset year
       }
    }
    
    let parsedDate = new Date(y, m, d);
    
    // Parse time if present
    const timeMatch = dStr.match(/(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm)?/i);
    if (timeMatch && !textMatch[0].includes(timeMatch[0])) { // Ensure we didn't just match the day/year
       let h = parseInt(timeMatch[1], 10);
       let min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
       if (timeMatch[3] && timeMatch[3].toLowerCase() === 'pm' && h < 12) h += 12;
       if (timeMatch[3] && timeMatch[3].toLowerCase() === 'am' && h === 12) h = 0;
       parsedDate.setHours(h, min, 0, 0);
    }
    
    return parsedDate.getTime();
  }

  return 0;
}`;

content = content.replace(/function parseSortDate[\s\S]*?return new Date\(dStr\).getTime\(\) \|\| 0;\n\}/, parseSortDateNew);

// 2. Rewrite resolveRelativeDate
const resolveRelativeDateNew = `function resolveRelativeDate(text, msgDateStr) {
  let baseMs = parseSortDate(msgDateStr);
  if (!baseMs) return null;
  let baseDate = new Date(baseMs);
  const lower = text.toLowerCase();
  
  let timeSet = false;
  // Parse explicit time like "11.00 AM" or "10:30"
  const timeMatch = text.match(/\\b(\\d{1,2})(?:[:\\.](\\d{2}))?\\s*(am|pm)\\b/i);
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
}`;

content = content.replace(/function resolveRelativeDate[\s\S]*?return baseDate.toDateString\(\);\n\}/, resolveRelativeDateNew);


// 3. Improve explicitDateRegex to include times
const regexReplacement = `const explicitDateRegex = /\\b(\\d{1,2}(st|nd|rd|th)?\\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(\\s+\\d{4})?|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\s+\\d{1,2}(st|nd|rd|th)?(\\s*,?\\s*\\d{4})?|\\d{1,2}[\\/\\-]\\d{1,2}([\\/\\-]\\d{2,4})?)(?:\\s*(?:at|,)?\\s*(\\d{1,2}(?:[:\\.]\\d{2})?\\s*(?:am|pm)?))?\\b/i;`;
content = content.replace(/const explicitDateRegex = .*/, regexReplacement);

// 4. Update the deadline extraction block in analyzeConversation to prioritize explicitly labeled deadlines
const newExtraction = `
    // Determine explicitly labeled deadlines over random event dates
    let deadline = null;
    let deadlineMatch = lowerContent.match(/\\b(?:deadline|by|before|last date|due)\\s*:?\\s*(.*?)(?=\\n|$|\\|)/i);
    if (deadlineMatch) {
       // Search for date inside the deadline phrase
       const dMatch = deadlineMatch[0].match(explicitDateRegex);
       if (dMatch) {
          deadline = dMatch[0].trim();
       }
    }
    
    // If no explicit deadline label, fallback to generic extracted explicit date or relative date
    if (!deadline) {
       deadline = resolveRelativeDate(lowerContent, msgDate) || extractedExplicitDateContent;
    }
`;
content = content.replace(/let deadline = extractedExplicitDateContent \|\| resolveRelativeDate\(lowerContent, msgDate\);/, newExtraction);


fs.writeFileSync('app.js', content);
