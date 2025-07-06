const request = require('supertest');
const app = require('../index');

describe('static caching', () => {
  it('serves service worker with cache header', async () => {
    const res = await request(app)
      .get('/static/sw.js')
      .set('X-Forwarded-Proto', 'https');
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toMatch(/max-age=3600/);
    expect(res.text).toContain('caches.open');
  });
});

