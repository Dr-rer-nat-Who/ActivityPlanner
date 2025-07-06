const fs = require('fs').promises;
const path = require('path');
const contrast = require('wcag-contrast');

describe('color contrast', () => {
  it('palette meets WCAG AA', async () => {
    const css = await fs.readFile(path.join(__dirname, '..', 'public', 'styles.css'), 'utf8');
    const pos = css.match(/--positive:\s*(#[0-9A-Fa-f]{6})/)[1];
    const neg = css.match(/--negative:\s*(#[0-9A-Fa-f]{6})/)[1];
    const posRatio = contrast.hex(pos, '#ffffff');
    const negRatio = contrast.hex(neg, '#ffffff');
    expect(posRatio).toBeGreaterThanOrEqual(4.5);
    expect(negRatio).toBeGreaterThanOrEqual(4.5);
  });
});
