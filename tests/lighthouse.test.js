const {execSync} = require('child_process');

describe('lighthouse setup', () => {
  it('config passes healthcheck', () => {
    execSync('./node_modules/.bin/lhci healthcheck --config=lighthouserc.js --quiet', {stdio: 'inherit'});
  });
});
