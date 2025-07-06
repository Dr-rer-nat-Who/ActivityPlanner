const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');
const app = require('../index');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const ACT_FILE = path.join(__dirname, '..', 'data', 'activities.json');
const ASSET_DIR = path.join(__dirname, '..', 'user-assets');

describe('rejected activities restore', () => {
  const agent = request.agent(app);
  let userId;
  beforeAll(async () => {
    await fs.rm(ASSET_DIR, { recursive: true, force: true });
    await fs.writeFile(USERS_FILE, '[]');
    const acts = [
      { id: 'r1', title: 'Rejectable', date: '2025-01-01T00:00:00Z', image: '', creator: 'u1', participants: [] }
    ];
    await fs.writeFile(ACT_FILE, JSON.stringify(acts));
    const getRes = await agent.get('/register').set('X-Forwarded-Proto', 'https');
    const csrf = /name="_csrf" value="([^"]+)"/.exec(getRes.text)[1];
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/P+BKywAAAABJRU5ErkJggg==';
    await agent
      .post('/register')
      .set('X-Forwarded-Proto', 'https')
      .field('_csrf', csrf)
      .field('username', 'rejecter')
      .field('password', 'strongpassword')
      .attach('avatar', Buffer.from(png, 'base64'), { filename: 't.png', contentType: 'image/png' });
    const users = JSON.parse(await fs.readFile(USERS_FILE));
    userId = users[0].id;
    const logRes = await agent.get('/login').set('X-Forwarded-Proto', 'https');
    const lcsrf = /name="_csrf" value="([^"]+)"/.exec(logRes.text)[1];
    await agent
      .post('/login')
      .set('X-Forwarded-Proto', 'https')
      .send(`username=rejecter&password=strongpassword&_csrf=${lcsrf}`);
  });

  it('hides declined activities and allows restoring them', async () => {
    await agent.post('/activities/r1/decline').set('X-Forwarded-Proto', 'https');
    let acts = JSON.parse(await fs.readFile(ACT_FILE));
    expect(acts[0].declined).toContain(userId);

    let res = await agent.get('/activities').set('X-Forwarded-Proto', 'https');
    expect(res.body.length).toBe(0);

    const rejRes = await agent.get('/rejected').set('X-Forwarded-Proto', 'https');
    expect(rejRes.text).toContain('Rejectable');

    await agent.post('/activities/r1/restore').set('X-Forwarded-Proto', 'https');
    acts = JSON.parse(await fs.readFile(ACT_FILE));
    expect((acts[0].declined || []).includes(userId)).toBe(false);
    expect(acts[0].participants).not.toContain(userId);

    res = await agent.get('/activities').set('X-Forwarded-Proto', 'https');
    expect(res.body.length).toBe(1);
  });
});

