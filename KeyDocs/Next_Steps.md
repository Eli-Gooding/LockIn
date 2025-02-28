LockIn App: Screenshot Analysis and Response Plan
Overview
This plan details how to enhance the LockIn app by:
Capturing screenshots every 3 minutes.

Storing session data in a local SQLite database.

Splitting AI analysis between OpenAI’s GPT-4o (image description) and GPT-4o-mini (response generation).

1. Screenshot Capture
Frequency: Every 3 minutes (180 seconds).

Method: Use Electron’s desktopCapturer to capture the screen as a base64-encoded image.

Implementation:
Set a timer in the renderer process to trigger captures.

Send the base64 image to the main process via IPC.

2. SQLite Database
Purpose: Store screenshot analysis and responses locally.

Schema:
sql

