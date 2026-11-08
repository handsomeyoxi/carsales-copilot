import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectKeywords, mergeKeywords } from '../src/vocab.js';

const has = (list, category, value) => list.some((k) => k.category === category && k.value === value);

test('抓出硬需求與情緒價值關鍵字', () => {
  const k = detectKeywords('我太太快生了，預算400萬左右，想看BMW X5，要有ADAS，白色，可以分期嗎？舊車也想估車');
  assert.ok(has(k, '車款', 'BMW'));
  assert.ok(has(k, '車款', 'X5'));
  assert.ok(has(k, '預算', '400萬左右'));
  assert.ok(has(k, '配備', 'ADAS'));
  assert.ok(has(k, '顏色', '白色'));
  assert.ok(has(k, '付款方式', '分期'));
  assert.ok(has(k, '舊車換購', '估車'));
  assert.ok(k.find((x) => x.value === '太太' && x.group === 'emotionalValues' && x.category === '家庭'));
});

test('英文車款不會吃到別的字的一半', () => {
  assert.equal(detectKeywords('這個 Mix 的音樂').length, 0);
  assert.ok(!has(detectKeywords('BMW iX1'), '車款', 'X1'));
});

test('「陳先生」不算家庭關鍵字', () => {
  assert.ok(!detectKeywords('陳先生您好').some((k) => k.category === '家庭'));
});

test('中文數字預算、決策者', () => {
  const k = detectKeywords('這要問我老婆，預算大概一百二十萬');
  assert.ok(has(k, '預算', '一百二十萬'));
  assert.ok(has(k, '決策者', '要問我老婆'));
});

test('mergeKeywords 去重複', () => {
  const merged = mergeKeywords([detectKeywords('BMW 白色'), detectKeywords('bmw 黑色')]);
  assert.equal(merged.filter((k) => k.category === '車款').length, 1);
  assert.equal(merged.filter((k) => k.category === '顏色').length, 2);
});
