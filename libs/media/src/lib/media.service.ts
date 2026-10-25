import { Injectable, inject } from '@angular/core';
import { SneatApiService } from '@sneat/api-public';
import {
  IBeginMediaUploadResponse,
  IMediaAccessRequest,
  IMediaAccessResponse,
  ILinkMediaRequest,
  IMediaLinkResult,
  IMediaTarget,
  MediaAccess,
} from '@sneat/extension-media-contract';
import { firstValueFrom } from 'rxjs';

const sha256 = async (file: File): Promise<string> => {
  const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly api = inject(SneatApiService);

  async uploadAndLink(
    file: File,
    target: IMediaTarget,
    role: ILinkMediaRequest['role'],
    access: MediaAccess,
    crop?: ILinkMediaRequest['crop'],
    onProgress?: (percent: number) => void,
  ): Promise<IMediaLinkResult> {
    if (file.type !== 'image/jpeg' && file.type !== 'image/png')
      throw new Error('Choose a JPEG or PNG image.');
    const requestID = crypto.randomUUID();
    const upload = await firstValueFrom(
      this.api.post<IBeginMediaUploadResponse>('media/uploads', {
        requestID,
        contentType: file.type,
        size: file.size,
        originalFilename: file.name,
        access,
      }),
    );
    const initiate = await fetch(upload.uploadURL, {
      method: upload.uploadMethod,
      headers: upload.uploadHeaders,
    });
    if (!initiate.ok)
      throw new Error(`Unable to start upload (${initiate.status}).`);
    const sessionURL = initiate.headers.get('Location');
    if (!sessionURL)
      throw new Error('Upload service did not return a resumable session.');
    await this.uploadFile(sessionURL, file, onProgress);
    await firstValueFrom(
      this.api.post('media/uploads/finalize', {
        mediaID: upload.mediaID,
        sha256: await sha256(file),
      }),
    );
    return firstValueFrom(
      this.api.post<IMediaLinkResult>('media/links', {
        requestID,
        mediaID: upload.mediaID,
        target,
        role,
        crop,
        retention: 'retained',
      }),
    );
  }

  remove(
    mediaID: string,
    target: IMediaTarget,
    role: ILinkMediaRequest['role'],
  ): Promise<IMediaLinkResult> {
    return firstValueFrom(
      this.api.post<IMediaLinkResult>('media/links/remove', {
        mediaID,
        target,
        role,
      }),
    );
  }

  restore(
    mediaID: string,
    target: IMediaTarget,
    role: ILinkMediaRequest['role'],
  ): Promise<IMediaLinkResult> {
    return firstValueFrom(
      this.api.post<IMediaLinkResult>('media/links/restore', {
        mediaID,
        target,
        role,
      }),
    );
  }

  access(
    mediaID: string,
    target: IMediaTarget,
    role: ILinkMediaRequest['role'],
  ): Promise<IMediaAccessResponse> {
    const request: IMediaAccessRequest = { mediaID, target, role };
    return firstValueFrom(
      this.api.post<IMediaAccessResponse>('media/access', request),
    );
  }

  private uploadFile(
    sessionURL: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('PUT', sessionURL);
      request.setRequestHeader('Content-Type', file.type);
      request.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && event.total > 0) {
          onProgress?.(Math.round((event.loaded / event.total) * 100));
        }
      });
      request.addEventListener('load', () => {
        if (request.status >= 200 && request.status < 300) {
          onProgress?.(100);
          resolve();
        } else {
          reject(new Error(`Unable to upload image (${request.status}).`));
        }
      });
      request.addEventListener('error', () =>
        reject(new Error('Unable to upload image. Check your connection.')),
      );
      request.send(file);
    });
  }
}
