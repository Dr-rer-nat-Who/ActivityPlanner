const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');
const app = require('../index');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const ASSET_DIR = path.join(__dirname, '..', 'user-assets');

describe('ready status', () => {
  const agent = request.agent(app);
  let userId;
  beforeAll(async () => {
    await fs.rm(ASSET_DIR, { recursive: true, force: true });
    await fs.writeFile(USERS_FILE, '[]');
    const getRes = await agent.get('/register').set('X-Forwarded-Proto', 'https');
    const csrf = /name="_csrf" value="([^"]+)"/.exec(getRes.text)[1];
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/P+BKywAAAABJRU5ErkJggg==';
    await agent
      .post('/register')
      .set('X-Forwarded-Proto', 'https')
      .field('_csrf', csrf)
      .field('username', 'readyuser')
      .field('password', 'strongpassword')
      .attach('avatar', Buffer.from(png, 'base64'), { filename: 't.png', contentType: 'image/png' });
    const users = JSON.parse(await fs.readFile(USERS_FILE));
    userId = users[0].id;
    const logRes = await agent.get('/login').set('X-Forwarded-Proto', 'https');
    const lcsrf = /name="_csrf" value="([^"]+)"/.exec(logRes.text)[1];
    await agent
      .post('/login')
      .set('X-Forwarded-Proto', 'https')
      .send(`username=readyuser&password=strongpassword&_csrf=${lcsrf}`);
  });

  it('sets ready state and expires', async () => {
    let res = await agent.post('/ready').set('X-Forwarded-Proto', 'https').send('expiresIn=10000');
    expect(res.body.ready).toBe(true);
    res = await agent.get('/ready').set('X-Forwarded-Proto', 'https');
    expect(res.body.find((u) => u.id === userId)).toBeDefined();
    await agent.post('/ready').set('X-Forwarded-Proto', 'https').send('expiresIn=-1');
    res = await agent.get('/ready').set('X-Forwarded-Proto', 'https');
    expect(res.body.find((u) => u.id === userId)).toBeUndefined();
  });
});
