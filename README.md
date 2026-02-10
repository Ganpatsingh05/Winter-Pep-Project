# Smart Study Planner

Smart Study Planner — Vanilla HTML/CSS/JS with Firebase Realtime Database for cloud persistence.

## Overview
- Organize subjects with priority and color coding
- Plan weekly schedule (assign subjects to hourly slots)
- Manage tasks (assignment/exam/project/reading) with deadlines and status
- Progress analytics (per-subject completion, insights)
- Settings: theme toggle, export data, reset
- **Real-time cloud sync** via Firebase Realtime Database

## Tech
- HTML5, CSS3, Vanilla JavaScript
- Firebase Realtime Database (cloud storage & real-time sync)
- No frameworks or external JS libraries (apart from Firebase SDK)

## Project Structure
- `index.html` — main app shell and views
- `style.css` — responsive styles and dark theme
- `app.js` — application logic, localStorage caching, Firebase sync

## Data Storage

### Firebase Realtime Database
All data is synced to Firebase Realtime Database at:
```
https://smart-study-planner-142f4-default-rtdb.asia-southeast1.firebasedatabase.app/
```

Firebase paths:
- `subjects` — array of subjects `{id, name, priority, color}`
- `tasks` — array of tasks `{id, title, type, subjectId, deadline, status, created}`
- `schedule` — array of schedule entries `{day (0-6), hour (6-22), subjectId}`
- `prefs` — preferences object, e.g. `{theme:'light'}`

### LocalStorage (offline cache)
LocalStorage is used as a synchronous cache for instant rendering. Data is kept under these keys:
- `ss_subjects`, `ss_tasks`, `ss_schedule`, `ss_prefs`

### How sync works
1. On startup, the app loads cached data from LocalStorage for instant display.
2. It then pulls the latest data from Firebase and updates the local cache.
3. Real-time listeners keep the app in sync — changes from other devices or tabs appear automatically.
4. Every write operation saves to both LocalStorage and Firebase simultaneously.
5. If Firebase is unreachable, the app continues to work with local data.

## How to Run Locally
1. Open `index.html` in a modern browser (Chrome, Edge, Firefox).
2. No build steps — purely static. Works on Vercel or any static host.
3. An internet connection is needed for Firebase sync; the app works offline using cached local data.

## Vercel Deployment
1. Create a new project on Vercel and point to this repository or upload files.
2. It will automatically serve `index.html` as a static site. No configuration required.

## Notes on Implementation
- No external chart libraries used; analytics use CSS progress bars and computed metrics.
- Schedule is a simple hourly grid (6:00–22:00) that stores assignments in Firebase.
- Progress is calculated from task completion per subject (completed/total tasks).
- Firebase SDK is loaded via CDN (v10.12.0 compat build).
- No authentication is configured — the database is accessed directly.
