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
  Images are resized to 512x512px, saved under `user-assets/<userid>/profile.jpg`
  and served statically. Tests with Jest/Supertest verify file handling and
  rejection of unsupported types.
* Test image data is embedded as a Base64 string to avoid storing binary files
  in the repository.
* Implemented `/login` route with session management. Session cookie is
  configured as secure, HttpOnly and SameSite=Lax with a 10-minute inactivity
  timeout and rolling refresh. Failed logins are tracked in memory and after
  three wrong attempts the account is blocked for five minutes. Added Jest tests
  verifying secure cookies, rate limiting and session refresh.

* Implemented responsive main layout served from `/`. Added global toolbar with "Kommt her" button and ready indicator. Palette variables exposed via `/static/styles.css`. Jest tests ensure toolbar and color palette are served.
* Added basic activities carousel: `/activities` API returns upcoming events sorted by date. Frontend fetches these and displays swipe-able cards with join/decline buttons. Sample data stored in `data/activities.json`. Jest test checks sorting.
