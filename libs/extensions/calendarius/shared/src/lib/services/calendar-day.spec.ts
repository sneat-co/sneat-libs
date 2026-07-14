import { signal, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IErrorLogger } from '@sneat/core';
import { CalendarDay, ICalendarDayInput } from './calendar-day';
import { HappeningService } from './happening.service';
import { CalendarDayService } from './calendar-day.service';
import { NEVER, of, Subject } from 'rxjs';

describe('CalendarDay', () => {
  it('should create', () => {
    const date = new Date(2024, 5, 15);
    const injector = TestBed.inject(Injector);
    const $inputs = signal<readonly ICalendarDayInput[]>([]);
    const mockErrorLogger = {
      logError: vi.fn(),
      logErrorHandler: () => vi.fn(),
    } as unknown as IErrorLogger;
    const mockHappeningService = {
      watchSinglesOnSpecificDay: vi.fn(() => of([])),
    } as unknown as HappeningService;
    const mockCalendarDayService = {
      watchSpaceDay: vi.fn(() => of({ id: 'test', dbo: null })),
    } as unknown as CalendarDayService;

    const day = new CalendarDay(
      date,
      injector,
      $inputs,
      mockErrorLogger,
      mockHappeningService,
      mockCalendarDayService,
    );
    expect(day).toBeTruthy();
    expect(day.dateID).toBeTruthy();
    day.destroy();
  });

  it('unsubscribes Firestore listeners when the space inputs are cleared', () => {
    const date = new Date(2024, 5, 15);
    const injector = TestBed.inject(Injector);
    const singles$ = new Subject<never[]>();
    const spaceDay$ = new Subject<{ id: string; dbo: null }>();
    const $inputs = signal<readonly ICalendarDayInput[]>([
      {
        spaceID: 'space-1',
        $recurringSlots: signal(undefined),
        recurringSlots$: NEVER,
      },
    ]);
    const mockErrorLogger = {
      logError: vi.fn(),
      logErrorHandler: () => vi.fn(),
    } as unknown as IErrorLogger;
    const mockHappeningService = {
      watchSinglesOnSpecificDay: vi.fn(() => singles$),
    } as unknown as HappeningService;
    const mockCalendarDayService = {
      watchSpaceDay: vi.fn(() => spaceDay$),
    } as unknown as CalendarDayService;

    const day = new CalendarDay(
      date,
      injector,
      $inputs,
      mockErrorLogger,
      mockHappeningService,
      mockCalendarDayService,
    );
    TestBed.flushEffects();

    expect(singles$.observed).toBe(true);
    expect(spaceDay$.observed).toBe(true);

    $inputs.set([]);
    TestBed.flushEffects();

    expect(singles$.observed).toBe(false);
    expect(spaceDay$.observed).toBe(false);
    day.destroy();
  });
});
