# ProtocolX

**“The Unread Problem — What Did I Miss?”**

## 📖 Project Overview

**ProtocolX** tackles the modern challenge of catching up on lengthy, unread, or complex conversations across various messaging platforms and email threads. Our goal is to quickly surface summaries, urgent items, action items, mentions, decisions, and upcoming events so you don't have to scroll through endless chat history.

**Current State:**
ProtocolX is currently a **UI prototype**. The existing build showcases the planned layout, interface, and user journey, but it does not yet contain the backend logic to parse, process, or analyze real conversation data.

## ✨ Features

### Currently Implemented (UI Prototype)
- **Responsive Welcome Screen:** A polished, dark-mode landing page welcoming the user.
- **Conversation Input Scaffold:** A large text area for pasting chat logs and a non-functional file selection control.
- **Simulated Analysis Transition:** Clicking "Analyze Conversation" triggers a simulated loading state (1.5 seconds) before transitioning to the dashboard.
- **Sample Dashboard:** A "Bento Box" style grid layout populated with static, fictional placeholder data.
- **Dashboard Tabs:** Functional UI-level navigation between "Overview", "Action Items", and "History & Context".
- **Back Navigation:** Allows the user to return to the welcome screen from the dashboard.
- **Visual Design Elements:** Utilizes a custom particle canvas background, glassmorphic cards, glowing accents, and a responsive grid layout.

### Planned for Future Phases
- **Real Conversation Parsing:** Genuine processing of pasted text or uploaded chat logs.
- **Genuine Summary Generation:** AI-driven summaries of the provided context.
- **Information Extraction:** Automatic identification of urgent messages, action items, unanswered questions, events, and decisions.
- **Conflict Detection:** Identifying conflicting timelines or unresolved discussions within the text.
- **Functional File Import:** Actual file parsing (e.g., JSON, CSV, TXT) for chat logs.

## ⚙️ How It Works (Current Flow)
1. The user opens the application and is presented with the "What Did I Miss?" welcome screen.
2. The user can type or paste text into the conversation text area.
3. Upon clicking **"Analyze Conversation"**, the UI enters a simulated loading state for 1.5 seconds.
4. **Note:** The text entered is *not* actually analyzed, read, or transmitted.
5. The application then reveals the Dashboard, which displays static, fictional placeholder data to demonstrate how a processed conversation will eventually look.

## 🛠️ Technology Stack
Based strictly on the current implementation, ProtocolX uses:
- **HTML5:** For semantic structure and accessibility.
- **Vanilla JavaScript (ES6):** For state toggling, tab switching, and the canvas particle animation.
- **CSS3:** For all styling, layout (Flexbox/Grid), responsive design, and CSS variables.
- **External Assets:** Google Fonts (Inter and JetBrains Mono).

*Note: There are currently no frontend frameworks (like React or Vue), backend services, APIs, databases, or AI models integrated into this application.*

## 🚀 Run Locally
The current prototype is entirely static and client-side.
To run ProtocolX locally:
1. Clone or download the repository to your local machine.
2. Navigate to the project folder.
3. Open the `index.html` file directly in any modern web browser (e.g., Chrome, Firefox, Edge).
*A local development server is not required.*

## 🔒 Privacy
**ProtocolX is designed with a privacy-first approach.**
As confirmed by the source code, the current prototype does not make any network requests (e.g., `fetch` or `XMLHttpRequest`) to transmit your pasted conversation text, nor does it include any analytics or tracking scripts. The only external network requests made are standard CDN calls to load Google Fonts.

*Disclaimer: Since this is a UI prototype, no real conversation analysis is currently performed locally or remotely.*

## 🤖 GenAI Development Disclosure
This project's development was assisted by Generative AI tools:
- **ChatGPT** and **Antigravity** were utilized strictly as development assistants to help scaffold the HTML structure, adapt CSS styling, and write the vanilla JavaScript for UI interactions.
- These AI tools were used for coding assistance and are *not* integrated into the application's runtime features.

## 🚧 Limitations and Roadmap
**Current Limitations:**
- The application is a static frontend shell. It cannot process, save, or analyze data.
- The "Select File" button does not process uploaded files.

**Roadmap:**
- **Phase 2:** Integrate a local, browser-based natural language processing engine to extract entities and summarize text without sending data to the cloud.
- **Phase 3:** Enable functional file parsing for standard chat export formats (e.g., Slack, Discord, WhatsApp).
- **Phase 4:** Implement real-time dashboard generation based on the parsed and analyzed data.
