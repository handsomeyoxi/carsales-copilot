// stt-server 和 functions 的標籤類別必須是同一套
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as stt from '../src/tagCategories.js';
import { detectKeywords } from '../src/vocab.js';
import { MOCK_CONVERSATIONS, segmentRawText } from '../src/mock/index.js';

const require = createRequire(import.meta.url);
const fn = require('../../functions/src/tagCategories.js');

test('兩邊的類別清單一模一樣', () => {
  assert.deepEqual(stt.HARD_NEED_CATEGORIES, fn.HARD_NEED_CATEGORIES);
  assert.deepEqual(stt.EMOTIONAL_VALUE_CATEGORIES, fn.EMOTIONAL_VALUE_CATEGORIES);
  assert.deepEqual(stt.SINGLE_VALUE_CATEGORIES, fn.SINGLE_VALUE_CATEGORIES);
  assert.deepEqual(stt.TAG_TEXT_FIELDS, fn.TAG_TEXT_FIELDS);
});

test('即時關鍵字的類別都在清單裡', () => {
  const allowed = { hardNeeds: stt.HARD_NEED_CATEGORIES, emotionalValues: stt.EMOTIONAL_VALUE_CATEGORIES };
  for (const conv of MOCK_CONVERSATIONS) {
    for (const seg of conv.segments) {
      for (const k of detectKeywords(segmentRawText(seg))) {
        assert.ok(allowed[k.group]?.includes(k.category), `${k.group}/${k.category} 不在清單裡`);
      }
    }
  }
});
