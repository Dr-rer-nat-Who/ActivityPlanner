# Penetration Test Checklist

- [ ] Verify CSRF protections on all state-changing routes
- [ ] Validate and sanitize all user input (ESAPI)
- [ ] Ensure prepared statements are used for database access
- [ ] Review HTTP security headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options)
- [ ] Run dependency scans (`npm audit`) regularly
