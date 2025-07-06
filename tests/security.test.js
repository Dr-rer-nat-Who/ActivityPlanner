const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');
const app = require('../index');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const ACT_FILE = path.join(__dirname, '..', 'data', 'activities.json');
const ASSET_DIR = path.join(__dirname, '..', 'user-assets');

describe('security hardening', () => {
  const agent = request.agent(app);
  beforeAll(async () => {
    await fs.rm(ASSET_DIR, { recursive: true, force: true });
    await fs.writeFile(USERS_FILE, '[]');
    await fs.writeFile(ACT_FILE, '[]');
  });

  it('sets secure headers', async () => {
    const res = await agent.get('/').set('X-Forwarded-Proto', 'https');
    expect(res.headers['content-security-policy']).toMatch(/default-src 'self'/);
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('sanitizes quick action input', async () => {
    // register and login
    const reg = await agent.get('/register').set('X-Forwarded-Proto', 'https');
    const csrf = /name="_csrf" value="([^"]+)"/.exec(reg.text)[1];
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/P+BKywAAAABJRU5ErkJggg==';
    await agent
      .post('/register')
      .set('X-Forwarded-Proto', 'https')
      .field('_csrf', csrf)
      .field('username', 'secuser')
      .field('password', 'strongpassword')
      .attach('avatar', Buffer.from(png, 'base64'), { filename: 'a.png', contentType: 'image/png' });
    const log = await agent.get('/login').set('X-Forwarded-Proto', 'https');
    const lcsrf = /name="_csrf" value="([^"]+)"/.exec(log.text)[1];
    await agent.post('/login').set('X-Forwarded-Proto', 'https').send(`username=secuser&password=strongpassword&_csrf=${lcsrf}`);

    await agent
      .post('/quick-action')
      .set('X-Forwarded-Proto', 'https')
      .send('title=<b>X</b>&description=<script>alert(1)</script>');

    const stored = JSON.parse(await fs.readFile(ACT_FILE));
    expect(stored[0].title).toBe('&lt;b&gt;X&lt;&#x2f;b&gt;');
    expect(stored[0].description).toBe('&lt;script&gt;alert&#x28;1&#x29;&lt;&#x2f;script&gt;');
  });

  it('uses parameter binding to prevent SQL injection', async () => {
    const res = await agent
      .get('/usernames')
      .query({ prefix: "' OR '1'='1" })
      .set('X-Forwarded-Proto', 'https');
    expect(res.body).toEqual([]);
  });
});
