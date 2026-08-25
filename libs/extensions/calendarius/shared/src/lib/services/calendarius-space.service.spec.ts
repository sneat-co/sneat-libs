import { TestBed } from '@angular/core/testing';
import { Firestore } from 'firebase/firestore';
import { CalendariusSpaceService } from './calendarius-space.service';

vi.mock('firebase/firestore');

describe('CalendariusSpaceService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CalendariusSpaceService,
        {
          provide: Firestore,
          useValue: { type: 'Firestore', toJSON: () => ({}) },
        },
      ],
    });
  });

  it('should be created', () => {
    expect(TestBed.inject(CalendariusSpaceService)).toBeTruthy();
  });
});
