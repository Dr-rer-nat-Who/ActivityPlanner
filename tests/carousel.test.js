const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');
const app = require('../index');

const ACT_FILE = path.join(__dirname, '..', 'data', 'activities.json');

describe('activities carousel', () => {
  beforeAll(async () => {
    const data = [
      { id: 'b', title: 'B', date: '2035-05-01T00:00:00Z', image: '', participants: [] },
      { id: 'a', title: 'A', date: '2035-04-01T00:00:00Z', image: '', participants: [] }
    ];
    await fs.writeFile(ACT_FILE, JSON.stringify(data));
  });

  it('returns activities sorted by date ascending', async () => {
    const res = await request(app).get('/activities').set('X-Forwarded-Proto', 'https');
    expect(res.statusCode).toBe(200);
    expect(res.body[0].id).toBe('a');
    expect(res.body[1].id).toBe('b');
  });
});
