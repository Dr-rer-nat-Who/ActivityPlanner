const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');
const app = require('../index');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const ACT_FILE = path.join(__dirname, '..', 'data', 'activities.json');
const ASSET_DIR = path.join(__dirname, '..', 'user-assets');

describe('quick action', () => {
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
      .field('username', 'quickuser')
      .field('password', 'strongpassword')
      .attach('avatar', Buffer.from(png, 'base64'), { filename: 't.png', contentType: 'image/png' });
    const users = JSON.parse(await fs.readFile(USERS_FILE));
    userId = users[0].id;
    const logRes = await agent.get('/login').set('X-Forwarded-Proto', 'https');
    const lcsrf = /name="_csrf" value="([^"]+)"/.exec(logRes.text)[1];
    await agent
      .post('/login')
      .set('X-Forwarded-Proto', 'https')
      .send(`username=quickuser&password=strongpassword&_csrf=${lcsrf}`);
  });

  it('creates quick action and filters expired ones', async () => {
    await agent
      .post('/quick-action')
      .set('X-Forwarded-Proto', 'https')
      .send('title=A&description=desc&expiresIn=10000');
    await agent
      .post('/quick-action')
      .set('X-Forwarded-Proto', 'https')
      .send('title=Expired&description=x&expiresIn=-1');

    const res = await agent.get('/activities').set('X-Forwarded-Proto', 'https');
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('A');

    const stored = JSON.parse(await fs.readFile(ACT_FILE));
    const expired = stored.find((a) => a.title === 'Expired');
    expect(expired.past).toBe(true);
  });
});
