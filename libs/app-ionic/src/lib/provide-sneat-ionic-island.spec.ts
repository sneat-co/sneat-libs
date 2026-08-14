import { TestBed } from '@angular/core/testing';
import {
  provideSneatIonicIsland,
  provideSneatIonicShell,
  SneatIonicIslandHostComponent,
} from './provide-sneat-ionic-island';

describe('provideSneatIonicIsland', () => {
  it('is opt-in and the host is standalone for a lazy specialist route', () => {
    TestBed.configureTestingModule({ providers: [provideSneatIonicIsland()] });
    expect(provideSneatIonicShell()).toBeTruthy();
    const fixture = TestBed.createComponent(SneatIonicIslandHostComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
