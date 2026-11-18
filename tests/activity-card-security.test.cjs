const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('activity API text cannot inject HTML or break out of data attributes', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/static/app.js'), 'utf8');
  const helper = source.slice(0, source.indexOf('\n}\n') + 3);
  const start = source.indexOf('  function renderActivityCard(');
  const renderer = source.slice(start, source.indexOf('\n  // Event listeners for search', start));
  for (const currentUser of [null, { username: 'teacher' }]) {
    let card;
    const payload = '\"><img src=x onerror=alert(1)><script>alert(1)</script>';
    const context = {
      document: { createElement() { return { querySelectorAll() { return [] }, querySelector() { return { addEventListener() {} } } } } },
      currentUser, activityTypes: { other: { color: '#fff', textColor: '#000', label: 'Activity' } },
      getActivityType() { return 'other' }, formatSchedule() { return payload },
      window: { location: { href: 'https://school.example/' } },
      activitiesList: { appendChild(value) { card = value } }, handleUnregister() {},
      payload,
    };
    vm.runInNewContext(`${helper}\n${renderer}\nrenderActivityCard(payload, { description: payload, difficulty: payload, participants: [payload], max_participants: 10 });`, context);
    assert.ok(card);
    assert.doesNotMatch(card.innerHTML, /<(?:img|script)\b/i);
    assert.ok(card.innerHTML.includes('&lt;img'));
    if (currentUser) {
      assert.ok(card.innerHTML.includes('data-activity="&quot;&gt;&lt;img'));
      assert.ok(card.innerHTML.includes('data-email="&quot;&gt;&lt;img'));
    }
  }
});
