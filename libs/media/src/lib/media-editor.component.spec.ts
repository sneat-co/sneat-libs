import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaEditorComponent } from './media-editor.component';
import { MediaService } from './media.service';

describe('MediaEditorComponent', () => {
  let fixture: ComponentFixture<MediaEditorComponent>;
  const uploadAndLink = vi.fn();

  afterEach(() => vi.restoreAllMocks());

  it('previews and uploads an avatar with normalized crop and progress', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    uploadAndLink.mockImplementation(
      async (
        _file: File,
        _target: unknown,
        _role: string,
        _access: string,
        _crop: unknown,
        onProgress: (percent: number) => void,
      ) => {
        onProgress(60);
        return { mediaID: 'media1' };
      },
    );
    await TestBed.configureTestingModule({
      imports: [MediaEditorComponent],
      providers: [{ provide: MediaService, useValue: { uploadAndLink } }],
    })
      .overrideComponent(MediaEditorComponent, { set: { template: '' } })
      .compileComponents();
    fixture = TestBed.createComponent(MediaEditorComponent);
    fixture.componentRef.setInput('target', {
      scope: 'root',
      type: 'user',
      id: 'user1',
    });
    fixture.componentRef.setInput('role', 'avatar');
    const file = new File(['image'], 'avatar.png', { type: 'image/png' });

    await fixture.componentInstance.selected({
      target: { files: [file], value: 'selected' },
    } as unknown as Event);
    fixture.componentInstance.crop.set({ centerX: 0.3, centerY: 0.7, zoom: 2 });
    await fixture.componentInstance.upload();

    expect(uploadAndLink).toHaveBeenCalledWith(
      file,
      expect.objectContaining({ id: 'user1' }),
      'avatar',
      'private',
      { centerX: 0.3, centerY: 0.7, zoom: 2 },
      expect.any(Function),
    );
    expect(fixture.componentInstance.progress()).toBe(60);
    expect(fixture.componentInstance.previewURL()).toBeUndefined();
  });
});
