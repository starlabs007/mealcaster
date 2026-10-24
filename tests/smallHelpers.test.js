import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isPhotoDataUrl } from '../src/lib/photoUrl.js';
import { ago } from '../src/lib/syncAgo.js';
import { isFirefox, isSafari } from '../src/lib/browserHints.js';
import { ownedKeys } from '../src/lib/localKeys.js';
import { DEFAULT_IMAGE_SCALE, IMAGE_SCALE, clampScale } from '../src/lib/printScale.js';

describe('isPhotoDataUrl', () => {
  it('jpeg, png and webp data URLs waiting to upload', () => {
    assert.equal(isPhotoDataUrl('data:image/jpeg;base64,AAAA'), true);
    assert.equal(isPhotoDataUrl('data:image/png;base64,AAAA'), true);
    assert.equal(isPhotoDataUrl('data:image/webp,AAAA'), true);
  });

  it('web links, other types, blank and missing values are not', () => {
    assert.equal(isPhotoDataUrl('https://example.com/a.jpg'), false);
    assert.equal(isPhotoDataUrl('data:image/gif;base64,AAAA'), false);
    assert.equal(isPhotoDataUrl('data:image/svg+xml;base64,AAAA'), false);
    assert.equal(isPhotoDataUrl(''), false);
    assert.equal(isPhotoDataUrl(undefined), false);
    assert.equal(isPhotoDataUrl(null), false);
  });
});

describe('ago', () => {
  const say = { justNow: 'now', minutesAgo: (n) => `${n}m`, hoursAgo: (n) => `${n}h` };
  const now = Date.parse('2026-10-24T12:00:00Z');
  const before = (ms) => new Date(now - ms).toISOString();
  const MIN = 60_000;

  it('under a minute is "just now", and so is a time in the future', () => {
    assert.equal(ago(before(30_000), now, say), 'now');
    assert.equal(ago(before(-5 * MIN), now, say), 'now');
  });

  it('minutes up to the hour', () => {
    assert.equal(ago(before(MIN), now, say), '1m');
    assert.equal(ago(before(59 * MIN + 59_000), now, say), '59m');
  });

  it('hours up to a day', () => {
    assert.equal(ago(before(60 * MIN), now, say), '1h');
    assert.equal(ago(before(150 * MIN), now, say), '2h');
    assert.equal(ago(before(23 * 60 * MIN + 59 * MIN), now, say), '23h');
  });

  it('a day or more shows the date', () => {
    const iso = before(24 * 60 * MIN);
    assert.equal(ago(iso, now, say), new Date(iso).toLocaleDateString());
  });
});

describe('browser hints', () => {
  const FIREFOX = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:130.0) Gecko/20100101 Firefox/130.0';
  const SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
  const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
  const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
  const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1';

  it('Firefox only', () => {
    assert.equal(isFirefox(FIREFOX), true);
    assert.equal(isFirefox(SAFARI), false);
    assert.equal(isFirefox(CHROME), false);
  });

  it('Safari on Mac, but not Chrome (which also says Safari) or Android', () => {
    assert.equal(isSafari(SAFARI), true);
    assert.equal(isSafari(CHROME), false);
    assert.equal(isSafari(ANDROID), false);
    assert.equal(isSafari(FIREFOX), false);
  });

  it('every iPhone browser, and the Home Screen app', () => {
    assert.equal(isSafari(IPHONE_CHROME), true);
    assert.equal(isSafari(CHROME, true), true);
    assert.equal(isSafari(CHROME, false), false);
  });
});

describe('ownedKeys', () => {
  it('keeps keys with the prefix, apart from the ones to keep, and ignores null', () => {
    const keys = ['mealcaster.weeklyPlan.v2', 'other.thing', 'mealcaster.devDataMode', null, 'mealcaster.grocery.v4'];
    assert.deepEqual(ownedKeys(keys, 'mealcaster.', new Set(['mealcaster.devDataMode'])), ['mealcaster.weeklyPlan.v2', 'mealcaster.grocery.v4']);
  });

  it('nothing stored, nothing to erase', () => {
    assert.deepEqual(ownedKeys([], 'mealcaster.', new Set()), []);
  });
});

describe('clampScale', () => {
  it('keeps a value in range, rounded to a whole number', () => {
    assert.equal(clampScale(50), 50);
    assert.equal(clampScale(12.4), 12);
    assert.equal(clampScale('40'), 40);
  });

  it('stops at the ends', () => {
    assert.equal(clampScale(5), IMAGE_SCALE.min);
    assert.equal(clampScale(500), IMAGE_SCALE.max);
  });

  it('anything that is not a usable number gives the default', () => {
    for (const bad of ['abc', undefined, null, NaN, 0, '']) assert.equal(clampScale(bad), DEFAULT_IMAGE_SCALE);
  });
});
