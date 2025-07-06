const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');
const app = require('../index');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const ACT_FILE = path.join(__dirname, '..', 'data', 'activities.json');
const ASSET_DIR = path.join(__dirname, '..', 'user-assets');

describe('join and decline activities', () => {
  const agent = request.agent(app);
  let userId;

  beforeAll(async () => {
    await fs.rm(ASSET_DIR, { recursive: true, force: true });
    await fs.writeFile(USERS_FILE, '[]');
    const activities = [
      { id: 'x1', title: 'Test', date: '2025-01-01T00:00:00Z', image: '', creator: 'u1', participants: [] }
    ];
    await fs.writeFile(ACT_FILE, JSON.stringify(activities));

    const getRes = await agent.get('/register').set('X-Forwarded-Proto', 'https');
    const csrf = /name="_csrf" value="([^"]+)"/.exec(getRes.text)[1];
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/P+BKywAAAABJRU5ErkJggg==';
    await agent
      .post('/register')
      .set('X-Forwarded-Proto', 'https')
      .field('_csrf', csrf)
      .field('username', 'joiner')
      .field('password', 'strongpassword')
      .attach('avatar', Buffer.from(pngBase64, 'base64'), {
        filename: 'test.png',
        contentType: 'image/png'
      });
    const users = JSON.parse(await fs.readFile(USERS_FILE));
    userId = users[0].id;

    const logRes = await agent.get('/login').set('X-Forwarded-Proto', 'https');
    const lcsrf = /name="_csrf" value="([^"]+)"/.exec(logRes.text)[1];
    await agent
      .post('/login')
      .set('X-Forwarded-Proto', 'https')
      .send(`username=joiner&password=strongpassword&_csrf=${lcsrf}`);
  });

  it('adds user to participants on join', async () => {
    const res = await agent.post('/activities/x1/join').set('X-Forwarded-Proto', 'https');
    expect(res.statusCode).toBe(200);
    const activities = JSON.parse(await fs.readFile(ACT_FILE));
    expect(activities[0].participants).toContain(userId);
  });

  it('removes user from participants on decline', async () => {
    const res = await agent.post('/activities/x1/decline').set('X-Forwarded-Proto', 'https');
    expect(res.statusCode).toBe(200);
    const activities = JSON.parse(await fs.readFile(ACT_FILE));
    expect(activities[0].participants).not.toContain(userId);
  });

  it('requires login to join', async () => {
    const other = request(app);
    const res = await other.post('/activities/x1/join').set('X-Forwarded-Proto', 'https');
    expect(res.statusCode).toBe(401);
  });
});
