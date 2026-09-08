import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaImageComponent } from './media-image.component';
import { MediaService } from './media.service';

describe('MediaImageComponent', () => {
  let fixture: ComponentFixture<MediaImageComponent>;
  const access = vi.fn();

  afterEach(() => vi.useRealTimers());

  it('waits for a private presentation token before rendering', async () => {
    access.mockResolvedValue({
      token: 'signed-token',
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
    await TestBed.configureTestingModule({
      imports: [MediaImageComponent],
      providers: [{ provide: MediaService, useValue: { access } }],
    }).compileComponents();
    fixture = TestBed.createComponent(MediaImageComponent);
    fixture.componentRef.setInput('mediaID', 'media1');
    fixture.componentRef.setInput('target', {
      scope: 'space',
      spaceID: 'space1',
      type: 'contact',
      id: 'contact1',
    });
    fixture.componentRef.setInput('role', 'avatar');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(access).toHaveBeenCalledWith(
      'media1',
      expect.objectContaining({ id: 'contact1' }),
      'avatar',
    );
    expect(fixture.nativeElement.querySelector('img').src).toContain(
      'token=signed-token',
    );
  });
});
