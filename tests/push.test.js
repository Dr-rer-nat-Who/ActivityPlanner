const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');

jest.mock('web-push', () => {
  const actual = jest.requireActual('web-push');
  return {
    ...actual,
    sendNotification: jest.fn().mockResolvedValue(),
  };
});

const webpush = require('web-push');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const ACT_FILE = path.join(__dirname, '..', 'data', 'activities.json');
const SUB_FILE = path.join(__dirname, '..', 'data', 'subscriptions.json');
const ASSET_DIR = path.join(__dirname, '..', 'user-assets');

const app = require('../index');

describe('web push subscriptions', () => {
  const a1 = request.agent(app);
  const a2 = request.agent(app);
  let id1;

  beforeAll(async () => {
    await fs.rm(ASSET_DIR, { recursive: true, force: true });
    await fs.writeFile(USERS_FILE, '[]');
    await fs.writeFile(ACT_FILE, '[]');
    await fs.writeFile(SUB_FILE, '{}');

    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/P+BKywAAAABJRU5ErkJggg==';

    const r1 = await a1.get('/register').set('X-Forwarded-Proto', 'https');
    const c1 = /name="_csrf" value="([^"]+)"/.exec(r1.text)[1];
    await a1
      .post('/register')
      .set('X-Forwarded-Proto', 'https')
      .field('_csrf', c1)
      .field('username', 'push1')
      .field('password', 'strongpassword')
      .attach('avatar', Buffer.from(png, 'base64'), { filename: 'a.png', contentType: 'image/png' });
    let users = JSON.parse(await fs.readFile(USERS_FILE));
    id1 = users[0].id;
    const l1 = await a1.get('/login').set('X-Forwarded-Proto', 'https');
    const lc1 = /name="_csrf" value="([^"]+)"/.exec(l1.text)[1];
    await a1.post('/login').set('X-Forwarded-Proto', 'https').send(`username=push1&password=strongpassword&_csrf=${lc1}`);
    await a1.post('/subscribe').set('X-Forwarded-Proto', 'https').send({ endpoint: 'https://e', keys: { p256dh: 'k', auth: 'a' } });

    const r2 = await a2.get('/register').set('X-Forwarded-Proto', 'https');
    const c2 = /name="_csrf" value="([^"]+)"/.exec(r2.text)[1];
    await a2
      .post('/register')
      .set('X-Forwarded-Proto', 'https')
      .field('_csrf', c2)
      .field('username', 'push2')
      .field('password', 'strongpassword')
      .attach('avatar', Buffer.from(png, 'base64'), { filename: 'b.png', contentType: 'image/png' });
    users = JSON.parse(await fs.readFile(USERS_FILE));
    const id2 = users.find((u) => u.username === 'push2').id;
    const l2 = await a2.get('/login').set('X-Forwarded-Proto', 'https');
    const lc2 = /name="_csrf" value="([^"]+)"/.exec(l2.text)[1];
    await a2.post('/login').set('X-Forwarded-Proto', 'https').send(`username=push2&password=strongpassword&_csrf=${lc2}`);

    await fs.writeFile(
      ACT_FILE,
      JSON.stringify([{ id: 'x1', title: 'Act', date: '2035-01-01T00:00:00Z', image: '', creator: id1, participants: [] }])
    );
  });

  it('saves subscription', async () => {
    const subs = JSON.parse(await fs.readFile(SUB_FILE));
    expect(subs[id1]).toBeDefined();
  });

  it('sends push to creator when joined', async () => {
    await a2.post('/activities/x1/join').set('X-Forwarded-Proto', 'https');
    expect(webpush.sendNotification).toHaveBeenCalled();
  });
});
