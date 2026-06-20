import { CalendarSpace } from './calendar-space';
import { CalendariusSpaceService } from './calendarius-space.service';
import { of } from 'rxjs';

describe('CalendarSpace', () => {
  it('should create', () => {
    const mockCalendariusSpaceService = {
      watchSpaceModuleRecord: vi.fn(() => of({ id: 'test', dbo: null })),
    } as unknown as CalendariusSpaceService;
    const calendarSpace = new CalendarSpace(
      'test-space',
      mockCalendariusSpaceService,
    );
    expect(calendarSpace).toBeTruthy();
    calendarSpace.destroy();
  });
});
