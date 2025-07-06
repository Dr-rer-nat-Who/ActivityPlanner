const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');
const app = require('../index');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const ACT_FILE = path.join(__dirname, '..', 'data', 'activities.json');
const ASSET_DIR = path.join(__dirname, '..', 'user-assets');

describe('calendar view and export', () => {
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
      .field('username', 'caluser')
      .field('password', 'strongpassword')
      .attach('avatar', Buffer.from(png, 'base64'), { filename: 't.png', contentType: 'image/png' });
    const users = JSON.parse(await fs.readFile(USERS_FILE));
    userId = users[0].id;
    const logRes = await agent.get('/login').set('X-Forwarded-Proto', 'https');
    const lcsrf = /name="_csrf" value="([^"]+)"/.exec(logRes.text)[1];
    await agent
      .post('/login')
      .set('X-Forwarded-Proto', 'https')
      .send(`username=caluser&password=strongpassword&_csrf=${lcsrf}`);

    const acts = [
      { id: 'a1', title: 'First', date: '2035-01-01T12:00:00Z', image: '', participants: [userId], description: 'Ort: Park' },
      { id: 'a2', title: 'Second', date: '2035-01-02T12:00:00Z', image: '', participants: [], description: '' },
      { id: 'a3', title: 'Third', date: '2035-01-03T08:00:00Z', image: '', participants: [userId], description: 'Location: Home' }
    ];
    await fs.writeFile(ACT_FILE, JSON.stringify(acts));
  });

  it('lists accepted activities sorted with export link', async () => {
    const res = await agent.get('/calendar').set('X-Forwarded-Proto', 'https');
    expect(res.statusCode).toBe(200);
    const firstPos = res.text.indexOf('First');
    const thirdPos = res.text.indexOf('Third');
    expect(firstPos).toBeLessThan(thirdPos);
    expect(res.text).toContain('Park');
    expect(res.text).toContain('Home');
    expect(res.text).toContain('/calendar.ics');
    expect(res.text).not.toContain('Second');
  });

  it('exports ics of accepted activities', async () => {
    const res = await agent.get('/calendar.ics').set('X-Forwarded-Proto', 'https');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('BEGIN:VCALENDAR');
    expect(res.text).toContain('SUMMARY:First');
    expect(res.text).toContain('SUMMARY:Third');
    expect(res.text).not.toContain('SUMMARY:Second');
  });
});
