const request = require('supertest');
const app = require('../index');

describe('main layout', () => {
  it('serves toolbar with come button and profile area', async () => {
    const res = await request(app).get('/').set('X-Forwarded-Proto', 'https');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Kommt her');
    expect(res.text).toContain('dark-toggle');
    expect(res.text).toContain('ready-indicator');
    expect(res.text).toContain('ready-bar');
  });

  it('exposes color palette variables', async () => {
    const res = await request(app).get('/static/styles.css').set('X-Forwarded-Proto', 'https');
    expect(res.text).toContain('--positive: #1E8449');
    expect(res.text).toContain('--negative: #C0392B');
  });
});
