LockIn v1 Product Requirements Document (PRD)
Product Overview
LockIn is a desktop app designed to help users stay focused on their tasks by monitoring their screen activity and providing real-time feedback. With the slogan “Time to Lock In,” it empowers users to manually create a checklist of tasks and ensures they stay on track using AI-powered screenshot analysis. Version 1 simplifies the initial concept by focusing on user-defined tasks and leveraging AI solely for monitoring.
Purpose
Enable users to define and execute a task list in one sitting.

Use AI to analyze screenshots and detect if users are on track.

Deliver notifications to refocus users when they deviate.

Target Audience
Hackathon participants, students, professionals, or anyone needing focus for short-term tasks.

Goals
Hackathon Deliverable: Build a functional prototype with a clean UI and core monitoring features.

User Experience: Simple task entry, clear progress tracking, and non-intrusive notifications.

Security: Keep API keys secure via a backend server.

Features
1. Task Checklist Creation
Description: Users manually input a list of tasks they plan to complete.

UI:
Text input field to add tasks one-by-one.

Button to add each task to a checklist.

Display tasks as a checklist with checkboxes.

Behavior:
Tasks are stored locally in memory (no persistence needed for v1).

User can start monitoring once satisfied with the list.

2. Task Approval and Start
Description: Users review and confirm their checklist to begin monitoring.

UI:
“Start” button appears after at least one task is added.

Displays the first task as the “current task” once started.

Behavior:
Locks the checklist (no edits after starting).

Initiates screenshot monitoring.

3. Screenshot Monitoring with AI Analysis
Description: Periodically captures screenshots and analyzes them via OpenAI (through your server) to check if the user is on track.

Technical Details:
Uses Electron’s desktopCapturer to capture screenshots every 5 minutes.

Sends base64-encoded screenshots and the current task to your server (POST /analyze).

Server uses OpenAI’s vision API (e.g., GPT-4 with vision) to return:
Description (e.g., “User is on google.com”).

On-track status (true/false).

Notification text if off-track (e.g., “Focus on ‘Finish report’!”).

Behavior:
Runs in the background after starting.

Stores only analysis results, not screenshots.

4. Off-Track Notifications
Description: Alerts users when they’re not working on the current task.

UI:
Pop-up notification or inline alert with custom message from the server.

Styled with Bootstrap’s alert-warning.

Behavior:
Appears only when off-track; hides when on-track.

5. Task Progress Tracking
Description: Users mark tasks complete and move to the next one.

UI:
Checkboxes next to each task become active after starting.

Current task highlighted or displayed prominently.

Behavior:
Checking a task marks it done and shifts focus to the next task.

Stops monitoring and shows a completion message when all tasks are done.

Tech Stack
Frontend:
Electron: Cross-platform desktop app framework.

Bootstrap: Quick, polished UI styling.

Axios: HTTP client for server communication.

Backend (Your Server):
Node.js / Express: Handles API requests.

OpenAI API: Vision analysis for screenshots.

dotenv: Secures API keys in environment variables.

Development:
dotenv: Local environment variable management (e.g., server URL).

Why This Stack?
Electron provides screenshot capabilities and desktop functionality.

Bootstrap speeds up UI design.

Your Node.js/Express server keeps OpenAI keys secure.

Axios simplifies server requests.

Architecture
Renderer Process (Frontend):
Manages UI, screenshot capture, and server communication.

Uses desktopCapturer for screenshots and Axios for requests.

Main Process:
Launches the app and manages the window.

Backend Server (Yours):
Endpoint: POST /analyze accepts { image: "base64", currentTask: "text" }, returns { description: "text", onTrack: boolean, notification: "text|null" }.

Processes screenshots with OpenAI’s vision API.

User Flow
Enter Tasks:
User adds tasks (e.g., “Search for report data,” “Write report”).

Reviews checklist and clicks “Start.”

Monitoring Begins:
App captures a screenshot every 5 minutes.

Sends it to the server with the current task.

Analysis and Feedback:
Server returns analysis; if off-track, a notification appears (e.g., “Focus on ‘Write report’!”).

Progress:
User checks off tasks; app moves to the next one.

Ends with a “Done!” message when all tasks are complete.

Requirements
Functional
Task checklist creation with manual input.

Screenshot capture and server-side AI analysis.

Real-time notifications for off-track behavior.

Task completion tracking.

Non-Functional
Performance: Screenshot capture every 5 minutes to balance monitoring and resource use.

Security: API keys secured on your server; no local storage of screenshots.

Compatibility: Works on macOS and Windows (test on your dev machine).

Development Plan
1. Set Up Electron
Clone electron-quick-start or run:
bash

