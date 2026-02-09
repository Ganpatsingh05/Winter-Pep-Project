# Smart Study Planner

Simple Smart Study Planner — Vanilla HTML/CSS/JS using LocalStorage.

Overview
- Organize subjects
- Plan weekly schedule (assign subjects to hourly slots)
- Manage tasks (assignment/exam) with deadlines and status
- Progress analytics (per-subject completion)
- Settings: theme toggle, export data, reset

Tech
- HTML5, CSS3, Vanilla JavaScript
- No frameworks or external JS libraries

Project structure
- index.html — main app shell and views
- css/style.css — responsive styles and dark theme
- js/app.js — application logic, LocalStorage handling

Data structures (LocalStorage keys)
- `ss_subjects` — array of subjects {id, name, priority, color}
- `ss_tasks` — array of tasks {id, title, type, subjectId, deadline, status, created}
- `ss_schedule` — array of schedule entries {day (0-6), hour (6-22), subjectId}
- `ss_prefs` — preferences object, e.g. {theme:'light'}

How LocalStorage is used
- All user data is kept under the keys above and persisted across reloads and browser restarts.
- On first run, defaults are created if missing.
- Export feature bundles these keys into a JSON file.

How to run locally
1. Open `index.html` in a modern browser (Chrome, Edge, Firefox).
2. No build steps — purely static. Works on Vercel or any static host.

Vercel deployment
1. Create a new project on Vercel and point to this repository or upload files.
2. It will automatically serve `index.html` as a static site. No configuration required.

Notes on implementation choices
- No external chart libraries used; analytics use CSS progress bars and computed metrics.
- Schedule is a simple hourly grid (6:00–22:00) that stores assignments in `ss_schedule`.
- Progress is calculated from task completion per subject (completed/total tasks).
