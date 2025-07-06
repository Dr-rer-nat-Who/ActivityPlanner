const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');
const app = require('../index');

const DATA_FILE = path.join(__dirname, '..', 'data', 'users.json');

describe('login and session management', () => {
  const agent = request.agent(app);
  beforeAll(async () => {
    await fs.writeFile(DATA_FILE, '[]');
    // register user
    const getRes = await agent.get('/register').set('X-Forwarded-Proto', 'https');
    const csrf = /name="_csrf" value="([^"]+)"/.exec(getRes.text)[1];
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/P+BKywAAAABJRU5ErkJggg==';
    await agent
      .post('/register')
      .set('X-Forwarded-Proto', 'https')
      .field('_csrf', csrf)
      .field('username', 'loginTester')
      .field('password', 'strongpassword')
      .attach('avatar', Buffer.from(pngBase64, 'base64'), {
        filename: 'test.png',
        contentType: 'image/png',
      });
  });

  it('sets secure session cookie on login', async () => {
    const getRes = await agent.get('/login').set('X-Forwarded-Proto', 'https');
    const csrf = /name="_csrf" value="([^"]+)"/.exec(getRes.text)[1];
    const res = await agent
      .post('/login')
      .set('X-Forwarded-Proto', 'https')
      .send(`username=loginTester&password=strongpassword&_csrf=${csrf}`);

    expect(res.statusCode).toBe(303);
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
  });

  it('rate limits after three failed attempts', async () => {
    const getRes = await agent.get('/login').set('X-Forwarded-Proto', 'https');
    const csrf = /name="_csrf" value="([^"]+)"/.exec(getRes.text)[1];

    for (let i = 0; i < 3; i++) {
      const res = await agent
        .post('/login')
        .set('X-Forwarded-Proto', 'https')
        .send(`username=loginTester&password=wrong&_csrf=${csrf}`);
      expect(res.statusCode).toBe(401);
    }

    const res4 = await agent
      .post('/login')
      .set('X-Forwarded-Proto', 'https')
      .send(`username=loginTester&password=wrong&_csrf=${csrf}`);
    expect(res4.statusCode).toBe(429);
  });

  it('refreshes cookie on activity', async () => {
    const getRes = await agent.get('/login').set('X-Forwarded-Proto', 'https');
    const csrf = /name="_csrf" value="([^"]+)"/.exec(getRes.text)[1];
    const loginRes = await agent
      .post('/login')
      .set('X-Forwarded-Proto', 'https')
      .send(`username=loginTester&password=strongpassword&_csrf=${csrf}`);
    const firstCookie = loginRes.headers['set-cookie'][0];

    const res = await agent
      .get('/')
      .set('X-Forwarded-Proto', 'https');
    const newCookie = res.headers['set-cookie'][0];
    expect(newCookie).toBeDefined();
  });
});
