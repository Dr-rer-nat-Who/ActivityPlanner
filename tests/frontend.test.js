/**
 * @jest-environment jsdom
 */
function setup(pref) {
  document.body.innerHTML = `
    <button id="dark-toggle"></button>
    <div id="ready-indicator"></div>
    <div id="ready-bar"></div>
  `;
  global.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  localStorage.clear();
  if (pref) localStorage.setItem('theme', pref);
  jest.resetModules();
  return require('../public/app.js');
}

test('dark mode toggle updates body class and localStorage', () => {
  setup('dark');
  const toggle = document.getElementById('dark-toggle');
  expect(document.body.classList.contains('dark')).toBe(true);
  toggle.click();
  expect(document.body.classList.contains('dark')).toBe(false);
  expect(localStorage.getItem('theme')).toBe('light');
});

test('updateReadyBar renders ready icons', () => {
  const { updateReadyBar } = setup();
  updateReadyBar([{ id: 'x' }, { id: 'y' }]);
  const imgs = document.querySelectorAll('#ready-bar img');
  expect(imgs).toHaveLength(2);
  expect(imgs[0].src).toContain('/assets/x/profile');
  expect(imgs[1].src).toContain('/assets/y/profile');
});
