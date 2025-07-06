const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');
const app = require('../index');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const ACT_FILE = path.join(__dirname, '..', 'data', 'activities.json');

describe('activity detail view', () => {
  beforeAll(async () => {
    const users = [{ id: 'u1', username: 'Tester', password: 'x' }];
    await fs.writeFile(USERS_FILE, JSON.stringify(users));
    const acts = [{
      id: 'd1',
      title: 'Detail',
      date: '2025-06-01T00:00:00Z',
      image: '',
      description: 'Hello **World** [link](http://example.com)',
      participants: ['u1']
    }];
    await fs.writeFile(ACT_FILE, JSON.stringify(acts));
  });

  it('returns markdown rendered description and participant names', async () => {
    const res = await request(app)
      .get('/activities/d1/detail')
      .set('X-Forwarded-Proto', 'https');
    expect(res.statusCode).toBe(200);
    expect(res.body.descriptionHtml).toMatch('<strong>World</strong>');
    expect(res.body.descriptionHtml).toMatch('<a href="http://example.com"');
    expect(res.body.participants[0]).toEqual({ id: 'u1', username: 'Tester' });
  });
});
