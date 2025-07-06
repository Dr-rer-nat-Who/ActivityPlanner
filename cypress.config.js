const { defineConfig } = require('cypress');
const fs = require('fs').promises;
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      on('task', {
        async resetData() {
          const root = __dirname;
          await fs.writeFile(path.join(root, 'data', 'users.json'), '[]');
          await fs.writeFile(path.join(root, 'data', 'activities.json'), '[]');
          await fs.rm(path.join(root, 'user-assets'), { recursive: true, force: true });
          return null;
        },
        async readActivities() {
          const data = await fs.readFile(path.join(__dirname, 'data', 'activities.json'), 'utf8');
          return JSON.parse(data);
        },
        async register({ username, password, image }) {
          const regGet = await fetch('http://localhost:3000/register');
          const html = await regGet.text();
          const token = /name="_csrf" value="([^"]+)"/.exec(html)[1];
          const cookie = regGet.headers.get('set-cookie') || '';
          const form = new FormData();
          form.append('_csrf', token);
          form.append('username', username);
          form.append('password', password);
          form.append('avatar', Buffer.from(image, 'base64'), { filename: 't.png', contentType: 'image/png' });
          const headers = form.getHeaders();
          headers.Cookie = cookie;
          const res = await fetch('http://localhost:3000/register', { method: 'POST', body: form, headers });
          const text = await res.text();
          const idMatch = /\/assets\/(.+?)\/profile/.exec(text);
          const cookies = [cookie];
          const newCookie = res.headers.get('set-cookie');
          if (newCookie) cookies.push(newCookie);
          return { id: idMatch ? idMatch[1] : null, cookies };
        },
        async login({ username, password, cookies }) {
          const logGet = await fetch('http://localhost:3000/login', { headers: { Cookie: cookies.join(';') } });
          const html = await logGet.text();
          const token = /name="_csrf" value="([^"]+)"/.exec(html)[1];
          const res = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookies.join(';') },
            body: `username=${username}&password=${password}&_csrf=${token}`
          });
          const newCookie = res.headers.get('set-cookie');
          if (newCookie) cookies.push(newCookie);
          return cookies;
        },
        async quick({ title, description, cookies }) {
          const res = await fetch('http://localhost:3000/quick-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookies.join(';') },
            body: JSON.stringify({ title, description })
          });
          const data = await res.json();
          return data.id;
        },
        async join({ id, cookies }) {
          await fetch(`http://localhost:3000/activities/${id}/join`, { method: 'POST', headers: { Cookie: cookies.join(';') } });
          const data = await fs.readFile(path.join(__dirname, 'data', 'activities.json'), 'utf8');
          const acts = JSON.parse(data);
          return acts.find(a => a.id === id);
        }
      });
    }
  }
});
