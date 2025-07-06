const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');
const app = require('../index');

const ASSET_DIR = path.join(__dirname, '..', 'user-assets');

describe('registration with profile image', () => {
  const agent = request.agent(app);
  beforeAll(async () => {
    await fs.rm(ASSET_DIR, { recursive: true, force: true });
    await fs.writeFile(path.join(__dirname, '..', 'data', 'users.json'), '[]');
  });

  it('accepts jpeg/png upload and saves profile', async () => {
    const getRes = await agent.get('/register').set('X-Forwarded-Proto', 'https');
    const match = /name="_csrf" value="([^"]+)"/.exec(getRes.text);
    const csrf = match[1];

    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/P+BKywAAAABJRU5ErkJggg==';
    const res = await agent
      .post('/register')
      .set('X-Forwarded-Proto', 'https')
      .field('_csrf', csrf)
      .field('username', 'tester')
      .field('password', 'strongpassword')
      .attach('avatar', Buffer.from(pngBase64, 'base64'), {
        filename: 'test.png',
        contentType: 'image/png',
      });

    expect(res.statusCode).toBe(303);
    const users = JSON.parse(
      await fs.readFile(path.join(__dirname, '..', 'data', 'users.json'))
    );
    expect(users[0]).toHaveProperty('id');
    const imgPath = path.join(ASSET_DIR, users[0].id, 'profile.webp');
    await fs.access(imgPath);

    const imgRes = await agent
      .get(`/assets/${users[0].id}/profile`)
      .set('X-Forwarded-Proto', 'https');
    expect(imgRes.headers['cache-control']).toMatch(/max-age=31536000/);
  });

  it('rejects unsupported file type', async () => {
    const getRes = await agent.get('/register').set('X-Forwarded-Proto', 'https');
    const match = /name="_csrf" value="([^"]+)"/.exec(getRes.text);
    const csrf = match[1];

    const res = await agent
      .post('/register')
      .set('X-Forwarded-Proto', 'https')
      .field('_csrf', csrf)
      .field('username', 'tester2')
      .field('password', 'strongpassword')
      .attach('avatar', path.join(__dirname, 'fixtures', 'test.txt'));

    expect(res.statusCode).toBe(400);
  });
});
