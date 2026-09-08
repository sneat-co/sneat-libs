import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  ILinkMediaRequest,
  IMediaCrop,
  IMediaTarget,
  mediaURL,
  MediaVariant,
} from '@sneat/extension-media-contract';
import { MediaService } from './media.service';

@Component({
  selector: 'sneat-media-image',
  standalone: true,
  template: `
    @if (ready()) {
      <img
        [src]="src()"
        [alt]="alt()"
        [class]="imageClass()"
        [style.object-position]="objectPosition()"
        [style.transform]="transform()"
        loading="lazy"
        decoding="async"
      />
    }
  `,
  styles: `
    :host {
      display: inline-block;
      overflow: hidden;
    }
    img {
      display: block;
      transform-origin: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaImageComponent {
  private readonly service = inject(MediaService);
  private readonly fetchedToken = signal<string | undefined>(undefined);
  private readonly refresh = signal(0);

  readonly mediaID = input.required<string>();
  readonly variant = input<MediaVariant>('thumbnail');
  readonly token = input<string>();
  readonly crop = input<IMediaCrop>();
  readonly target = input<IMediaTarget>();
  readonly role = input<ILinkMediaRequest['role']>();
  readonly alt = input('');
  readonly imageClass = input('');
  readonly ready = computed(
    () =>
      !!this.mediaID() &&
      (!!this.token() ||
        !this.target() ||
        !this.role() ||
        !!this.fetchedToken()),
  );
  readonly src = computed(() =>
    mediaURL(
      this.mediaID(),
      this.variant(),
      this.token() ?? this.fetchedToken(),
    ),
  );
  readonly objectPosition = computed(() => {
    const crop = this.crop();
    return crop ? `${crop.centerX * 100}% ${crop.centerY * 100}%` : '50% 50%';
  });
  readonly transform = computed(() =>
    this.crop() ? `scale(${this.crop()?.zoom ?? 1})` : undefined,
  );

  constructor() {
    effect((onCleanup) => {
      this.refresh();
      const mediaID = this.mediaID();
      const target = this.target();
      const role = this.role();
      if (!mediaID || this.token() || !target || !role) {
        this.fetchedToken.set(undefined);
        return;
      }

      let cancelled = false;
      let refreshTimer: ReturnType<typeof setTimeout> | undefined;
      this.fetchedToken.set(undefined);
      void this.service
        .access(mediaID, target, role)
        .then(({ token, expiresAt }) => {
          if (cancelled) return;
          this.fetchedToken.set(token);
          const delay = Math.max(
            5_000,
            new Date(expiresAt).getTime() - Date.now() - 30_000,
          );
          refreshTimer = setTimeout(
            () => this.refresh.update((value) => value + 1),
            delay,
          );
        })
        .catch(() => {
          if (!cancelled) this.fetchedToken.set(undefined);
        });
      onCleanup(() => {
        cancelled = true;
        if (refreshTimer) clearTimeout(refreshTimer);
      });
    });
  }
}
