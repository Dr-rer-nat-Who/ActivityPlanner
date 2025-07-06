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

