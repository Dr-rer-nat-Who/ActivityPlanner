const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');
const app = require('../index');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const ACT_FILE = path.join(__dirname, '..', 'data', 'activities.json');
const ASSET_DIR = path.join(__dirname, '..', 'user-assets');

describe('past activities list', () => {
  const agent = request.agent(app);
  let userId;
  beforeAll(async () => {
    await fs.rm(ASSET_DIR, { recursive: true, force: true });
    await fs.writeFile(USERS_FILE, '[]');
    await fs.writeFile(ACT_FILE, '[]');

    const getRes = await agent.get('/register').set('X-Forwarded-Proto', 'https');
    const csrf = /name="_csrf" value="([^"]+)"/.exec(getRes.text)[1];
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/P+BKywAAAABJRU5ErkJggg==';
    await agent
      .post('/register')
      .set('X-Forwarded-Proto', 'https')
      .field('_csrf', csrf)
      .field('username', 'historyuser')
      .field('password', 'strongpassword')
      .attach('avatar', Buffer.from(png, 'base64'), { filename: 't.png', contentType: 'image/png' });
    const users = JSON.parse(await fs.readFile(USERS_FILE));
    userId = users[0].id;
    const logRes = await agent.get('/login').set('X-Forwarded-Proto', 'https');
    const lcsrf = /name="_csrf" value="([^"]+)"/.exec(logRes.text)[1];
    await agent
      .post('/login')
      .set('X-Forwarded-Proto', 'https')
      .send(`username=historyuser&password=strongpassword&_csrf=${lcsrf}`);

    const acts = [];
    for (let i = 0; i < 25; i++) {
      acts.push({
        id: `a${i}`,
        title: `E${i}`,
        date: '2020-01-01T00:00:00Z',
        image: '',
        past: true,
        participants: i % 2 ? [userId] : []
      });
    }
    await fs.writeFile(ACT_FILE, JSON.stringify(acts));
  });

  it('lists first page with 20 entries and pagination', async () => {
    const res = await agent.get('/history').set('X-Forwarded-Proto', 'https');
    expect(res.statusCode).toBe(200);
    const rows = res.text.match(/<tr>/g) || [];
    expect(rows.length).toBe(21); // header + 20
    expect(res.text).toContain('✔');
    expect(res.text).toContain('✖');
    expect(res.text).toContain('?page=1');
  });

  it('shows remaining entries on second page', async () => {
    const res = await agent.get('/history?page=1').set('X-Forwarded-Proto', 'https');
    expect(res.statusCode).toBe(200);
    const rows = res.text.match(/<tr>/g) || [];
    expect(rows.length).toBe(6); // header + 5
  });
});
