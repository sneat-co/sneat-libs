import { TestBed } from '@angular/core/testing';
import {
  parseSneatBlockedOperations,
  SNEAT_URL_HASH,
  SneatUrlOperationBlocker,
} from './url-operation-blocker';

describe('SneatUrlOperationBlocker', () => {
  it('parses comma-separated and repeated block parameters', () => {
    expect(
      parseSneatBlockedOperations(
        '#block=auth,server-requests&block=auth&block=unknown',
      ),
    ).toEqual(new Set(['auth', 'server-requests']));
  });

  it('ignores unrelated fragments and unsupported operations', () => {
    expect(parseSneatBlockedOperations('#members')).toEqual(new Set());
    expect(parseSneatBlockedOperations('#block=unknown')).toEqual(new Set());
  });

  it('reads the URL hash once and exposes exact operation checks', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: SNEAT_URL_HASH, useValue: '#block=auth,server-requests' },
      ],
    });

    const blocker = TestBed.inject(SneatUrlOperationBlocker);

    expect(blocker.isBlocked('auth')).toBe(true);
    expect(blocker.isBlocked('server-requests')).toBe(true);
  });
});
