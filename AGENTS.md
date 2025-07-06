# AGENTS Instructions

This repository hosts the **ActivityPlanner** project. The README contains the full German project description.

## Project summary
- Private planning web app for small friend groups.
- Core features: username+password registration, profile pictures, Tinder-like activity carousel with join/decline buttons, detailed activity views, end-looped sorted carousel, support for spontaneous actions ("Kommt her"), ready status indicator, and extra profile views (rejected items, past activities, calendar).
- Technical requirements: can be hosted locally on Mac or Windows, optional low-cost cloud (<10 €/month), low memory usage, standard resolution images, push/browser notifications, and strong security against CSRF/XSS/SQL injection.
- UX requirements: modern look with smooth animations, consistent color coding (green = positive, red = negative).

## Development guidelines
- Keep the implementation lightweight and focused on browser-based delivery.
- Aim for responsive design.
- Use ChatGPT Codex for code generation during development.

There are currently no tests or code style rules defined.

## Recent Updates
* Added a basic Express server with a `/register` route for username/password
  registration. Data is stored in `data/users.json` and passwords are hashed with
  Argon2id. CSRF protection via `csurf` middleware is enabled. Inputs are
  sanitized using the `validator` package. Future agents should keep these
  security measures intact when extending authentication or user management.
* Added profile picture upload during registration using `multer` and `sharp`.
  Images are resized to 512x512px and stored under `user-assets/<userid>/profile.jpg`
  or `profile.webp`. They are served via `/assets/<id>/profile`. Tests with
  Jest/Supertest verify file handling and rejection of unsupported types.
* Test image data is embedded as a Base64 string to avoid storing binary files
  in the repository.
* Implemented `/login` route with session management. Session cookie is
  configured as secure, HttpOnly and SameSite=Lax with a 10-minute inactivity
  timeout and rolling refresh. Failed logins are tracked in memory and after
  three wrong attempts the account is blocked for five minutes. Added Jest tests
  verifying secure cookies, rate limiting and session refresh.

* Implemented responsive main layout served from `/`. Added global toolbar with "Kommt her" button and ready indicator. Palette variables exposed via `/static/styles.css`. Jest tests ensure toolbar and color palette are served.
* Added basic activities carousel: `/activities` API returns upcoming events sorted by date. Frontend fetches these and displays swipe-able cards with join/decline buttons. Sample data stored in `data/activities.json`. Jest test checks sorting.
* Implemented join/decline backend with WebSocket broadcasting. Clients update participant icons in real time and activity creators receive browser notifications. Added routes `/activities/:id/join` and `/activities/:id/decline`, WebSocket server using `ws`, and front-end logic with Notification API. Jest tests cover joining and declining activities.
* Added "Abgelehnt" view. Declined activities are stored per user and hidden from `/activities`. Route `/rejected` lists them with restore buttons using `/activities/:id/restore`. Main page has dropdown link under the profile picture. Jest tests cover restoration workflow.
* Implemented activity detail view. Clicking an activity image fetches `/activities/:id/detail` and opens a modal showing Markdown-rendered descriptions, the full participant list with names and profile icons and a "Status ändern" button. ESC or clicking the backdrop closes the modal. Jest test ensures Markdown rendering and participant names work.
* Added "Kommt her" quick action. Clicking the toolbar button opens a dialog for title and description. Submitted actions are inserted as first carousel card with glowing green border, broadcast via WebSocket and expire after six hours. Expired items move to `/past`. Jest tests verify creation and expiry logic.
* Implemented ready status bar. `/ready` toggles a user's two-hour ready flag and broadcasts current ready users via WebSocket. Frontend displays their icons next to "Kommt her". Tests cover toggling and expiry.
* Added past activities view at `/history`. Dropdown link "Vergangene Aktivitäten" in the profile menu opens a table listing completed events chronologically with a ✔/✖ column showing user's participation. Pagination shows 20 items per page via `?page=` parameter. Older activities are automatically marked as past when their date is in the past.
  * Implemented calendar view `/calendar` listing accepted upcoming activities with date, time, title and parsed location. Includes `/calendar.ics` export of these events. Added responsive layout styles and menu link "Kalender". Jest tests verify listing order, location extraction and ICS generation.
* Optimized uploaded images: JPEGs are compressed to 80% quality and PNGs converted to WebP. Files are served via `/assets/<id>/profile` with long-term caching headers and a cache-first service worker caches static assets. Tests cover image conversion and cache headers.
* Added push notification support using the Web Push API. VAPID keys are generated on first start and the public key is injected into the main page. Clients can POST `/subscribe` to store their subscription which is kept per user in `data/subscriptions.json`. When a user joins an activity, the creator receives a push message. "Kommt her" actions push a notification to all other subscribers. Route `/vapid-key` exposes the public key and `/ping/:id` triggers a mention notification. Frontend asks once after login whether push notifications should be enabled and registers the service worker for push events.
* Implemented security hardening with Helmet (CSP, HSTS, X-Content-Type-Options, X-Frame-Options) and ESAPI-based input sanitizing. Added /usernames route using SQLite prepared statements to demonstrate parameter binding. Nightly npm audit via GitHub Actions and penetration test checklist.
