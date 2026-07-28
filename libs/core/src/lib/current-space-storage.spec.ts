import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearCurrentSpace,
  currentSpacePath,
  readCurrentSpace,
  writeCurrentSpace,
} from './current-space-storage';

const storage = new Map<string, string>();

vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  removeItem: (key: string) => storage.delete(key),
  setItem: (key: string, value: string) => storage.set(key, value),
});

describe('current space storage', () => {
  afterEach(() => {
    storage.clear();
  });

  it('round-trips a group space', () => {
    writeCurrentSpace({ id: 'circle-1', type: 'group' });

    expect(readCurrentSpace()).toEqual({ id: 'circle-1', type: 'group' });
    expect(currentSpacePath()).toBe('/space/group/circle-1');
  });

  it.each([
    [
      'unsupported space type',
      JSON.stringify({ id: 'circle-1', type: 'friends' }),
    ],
    ['legacy sentinel', JSON.stringify({ id: 'circle-1', type: 'unknown' })],
    ['missing type', JSON.stringify({ id: 'circle-1' })],
    ['non-string id', JSON.stringify({ id: 1, type: 'group' })],
    ['non-object data', JSON.stringify('group')],
    ['malformed JSON', '{not-json'],
  ])('rejects persisted %s', (_description, value) => {
    storage.set('sneat.currentSpace', value);

    expect(readCurrentSpace()).toBeUndefined();
    expect(currentSpacePath()).toBeUndefined();
  });

  it('clears the current space', () => {
    writeCurrentSpace({ id: 'circle-1', type: 'group' });
    clearCurrentSpace();

    expect(readCurrentSpace()).toBeUndefined();
  });
});
