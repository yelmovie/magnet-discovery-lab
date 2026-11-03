const assert = require('node:assert/strict');

// Use the learner's real assembly buttons; no fixed coordinates or saved flags.
async function assembleMailbox(page) {
  let previous = 0;
  for (let count = 0; count < 6; count++) {
    const button = page.locator('[data-mission="fit-part"]');
    if (!await button.count()) return;
    const label = (await button.textContent()).trim();
    assert.match(label, /^[1-6]\./, 'assembly button names its current step');
    const step = Number.parseInt(label, 10);
    if (previous) assert.equal(step, previous + 1, 'assembly advances one part at a time');
    previous = step;
    await button.click();
    await page.waitForFunction(before => {
      const next = document.querySelector('[data-mission="fit-part"]');
      return !next || next.textContent.trim() !== before;
    }, label);
  }
  assert.equal(await page.locator('[data-mission="fit-part"]').count(), 0, 'six parts finish the assembly');
}

module.exports = { assembleMailbox };
