import { TestBed } from '@angular/core/testing';
import { SneatApiService } from '@sneat/api-public';
import { IMediaTarget } from '@sneat/extension-media-contract';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaService } from './media.service';

const target: IMediaTarget = {
  scope: 'space',
  spaceID: 'space1',
  type: 'contact',
  id: 'contact1',
};

describe('MediaService', () => {
  const post = vi.fn();
  let service: MediaService;

  beforeEach(() => {
    post.mockReset();
    TestBed.configureTestingModule({
      providers: [
        MediaService,
        { provide: SneatApiService, useValue: { post } },
      ],
    });
    service = TestBed.inject(MediaService);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('uploads, verifies and links an image through the shared endpoints', async () => {
    const progress: number[] = [];
    post.mockImplementation((endpoint: string) => {
      if (endpoint === 'media/uploads') {
        return of({
          mediaID: 'media1',
          uploadURL: 'https://storage.example/start',
          uploadMethod: 'POST',
          uploadHeaders: { 'x-goog-resumable': 'start' },
          expiresAt: '2026-09-08T12:00:00Z',
        });
      }
      if (endpoint === 'media/links') {
        return of({
          mediaID: 'media1',
          linkID: 'link1',
          refCount: 1,
          durableRefCount: 1,
          status: 'active',
        });
      }
      return of({});
    });
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(undefined, {
        status: 201,
        headers: { Location: 'https://storage.example/session' },
      }),
    );
    class UploadRequest {
      static latest: UploadRequest;
      readonly open = vi.fn();
      readonly setRequestHeader = vi.fn();
      readonly upload = {
        addEventListener: (
          _type: string,
          listener: (event: ProgressEvent) => void,
        ) => {
          this.progressListener = listener;
        },
      };
      readonly status = 200;
      private progressListener?: (event: ProgressEvent) => void;
      private loadListener?: () => void;
      constructor() {
        UploadRequest.latest = this;
      }
      addEventListener(type: string, listener: () => void): void {
        if (type === 'load') this.loadListener = listener;
      }
      send(): void {
        this.progressListener?.({
          lengthComputable: true,
          loaded: 1,
          total: 2,
        } as ProgressEvent);
        this.loadListener?.();
      }
    }
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('XMLHttpRequest', UploadRequest);

    const result = await service.uploadAndLink(
      new File([new Uint8Array([1, 2, 3])], 'avatar.png', {
        type: 'image/png',
      }),
      target,
      'avatar',
      'private',
      undefined,
      (percent) => progress.push(percent),
    );

    expect(result.mediaID).toBe('media1');
    expect(UploadRequest.latest.open).toHaveBeenCalledWith(
      'PUT',
      'https://storage.example/session',
    );
    expect(progress).toEqual([50, 100]);
    expect(post.mock.calls.map(([endpoint]) => endpoint)).toEqual([
      'media/uploads',
      'media/uploads/finalize',
      'media/links',
    ]);
  });

  it('rejects non-image files before creating an upload', async () => {
    await expect(
      service.uploadAndLink(
        new File(['text'], 'note.txt', { type: 'text/plain' }),
        target,
        'avatar',
        'private',
      ),
    ).rejects.toThrow('Choose a JPEG or PNG image.');
    expect(post).not.toHaveBeenCalled();
  });

  it('removes and restores the same target link', async () => {
    post.mockReturnValue(
      of({
        mediaID: 'media1',
        linkID: 'link1',
        refCount: 0,
        durableRefCount: 1,
        status: 'deleted',
      }),
    );
    await service.remove('media1', target, 'avatar');
    await service.restore('media1', target, 'avatar');
    expect(post).toHaveBeenNthCalledWith(1, 'media/links/remove', {
      mediaID: 'media1',
      target,
      role: 'avatar',
    });
    expect(post).toHaveBeenNthCalledWith(2, 'media/links/restore', {
      mediaID: 'media1',
      target,
      role: 'avatar',
    });
  });

  it('requests a short-lived presentation token for a linked target', async () => {
    post.mockReturnValue(
      of({ token: 'signed-token', expiresAt: '2026-09-08T12:15:00Z' }),
    );

    await expect(service.access('media1', target, 'avatar')).resolves.toEqual({
      token: 'signed-token',
      expiresAt: '2026-09-08T12:15:00Z',
    });
    expect(post).toHaveBeenCalledWith('media/access', {
      mediaID: 'media1',
      target,
      role: 'avatar',
    });
  });
});
