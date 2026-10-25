import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  ILinkMediaRequest,
  IMediaCrop,
  IMediaTarget,
  MediaAccess,
} from '@sneat/extension-media-contract';
import { IonButton, IonIcon, IonNote, IonProgressBar } from '@ionic/angular';
import { MediaService } from './media.service';

@Component({
  selector: 'sneat-media-editor',
  standalone: true,
  imports: [IonButton, IonIcon, IonNote, IonProgressBar],
  template: `
    <input
      #picker
      hidden
      type="file"
      accept="image/jpeg,image/png"
      capture="environment"
      (change)="selected($event)"
    />
    <ion-button
      size="small"
      fill="outline"
      [disabled]="busy()"
      (click)="picker.click()"
      ><ion-icon slot="start" name="camera-outline" />{{
        mediaID() ? 'Replace image' : 'Add image'
      }}</ion-button
    >
    @if (mediaID()) {
      <ion-button
        size="small"
        fill="clear"
        color="danger"
        [disabled]="busy()"
        (click)="remove()"
        >Remove</ion-button
      >
    }
    @if (undoMediaID()) {
      <ion-button size="small" fill="clear" [disabled]="busy()" (click)="undo()"
        >Undo</ion-button
      >
    }
    @if (previewURL(); as preview) {
      <section
        class="media-editor"
        aria-label="Image preview and crop controls"
      >
        <div class="media-editor-preview" [class.avatar]="role() === 'avatar'">
          <img
            [src]="preview"
            alt="Selected image preview"
            [style.object-position]="objectPosition()"
            [style.transform]="transform()"
          />
        </div>
        @if (role() === 'avatar') {
          <label
            >Pan left or right
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              [value]="crop().centerX"
              (input)="setCrop('centerX', $event)"
          /></label>
          <label
            >Pan up or down
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              [value]="crop().centerY"
              (input)="setCrop('centerY', $event)"
          /></label>
          <label
            >Zoom
            <input
              type="range"
              min="1"
              max="8"
              step="0.05"
              [value]="crop().zoom"
              (input)="setCrop('zoom', $event)"
          /></label>
        }
        <div>
          <ion-button size="small" [disabled]="busy()" (click)="upload()"
            >Use image</ion-button
          >
          <ion-button
            size="small"
            fill="clear"
            [disabled]="busy()"
            (click)="cancelSelection()"
            >Cancel</ion-button
          >
        </div>
      </section>
    }
    @if (busy()) {
      <ion-progress-bar [value]="progress() / 100" />
    }
    @if (error()) {
      <ion-note color="danger">{{ error() }}</ion-note>
    }
  `,
  styles: `
    .media-editor {
      display: grid;
      gap: 0.5rem;
      max-width: 22rem;
      margin-top: 0.5rem;
    }
    .media-editor-preview {
      width: 12rem;
      height: 12rem;
      overflow: hidden;
      background: var(--ion-color-light);
    }
    .media-editor-preview.avatar {
      border-radius: 50%;
    }
    .media-editor-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform-origin: center;
    }
    label {
      display: grid;
      gap: 0.125rem;
      font-size: 0.875rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaEditorComponent implements OnDestroy {
  private readonly service = inject(MediaService);
  readonly target = input.required<IMediaTarget>();
  readonly role = input.required<ILinkMediaRequest['role']>();
  readonly access = input<MediaAccess>('private');
  readonly mediaID = input<string>();
  readonly changed = output<string | undefined>();
  readonly busy = signal(false);
  readonly progress = signal(0);
  readonly error = signal<string | undefined>(undefined);
  readonly undoMediaID = signal<string | undefined>(undefined);
  readonly pendingFile = signal<File | undefined>(undefined);
  readonly previewURL = signal<string | undefined>(undefined);
  readonly crop = signal<IMediaCrop>({ centerX: 0.5, centerY: 0.5, zoom: 1 });
  readonly objectPosition = computed(
    () => `${this.crop().centerX * 100}% ${this.crop().centerY * 100}%`,
  );
  readonly transform = computed(() => `scale(${this.crop().zoom})`);

  async selected(event: Event): Promise<void> {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];
    inputElement.value = '';
    if (!file) return;
    this.cancelSelection();
    this.pendingFile.set(file);
    this.previewURL.set(URL.createObjectURL(file));
    this.crop.set({ centerX: 0.5, centerY: 0.5, zoom: 1 });
  }

  async upload(): Promise<void> {
    const file = this.pendingFile();
    if (!file) return;
    await this.run(async () => {
      const result = await this.service.uploadAndLink(
        file,
        this.target(),
        this.role(),
        this.access(),
        this.role() === 'avatar' ? this.crop() : undefined,
        (percent) => this.progress.set(percent),
      );
      this.cancelSelection();
      this.changed.emit(result.mediaID);
    });
  }

  setCrop(field: keyof IMediaCrop, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.crop.update((crop) => ({ ...crop, [field]: value }));
  }

  cancelSelection(): void {
    const previewURL = this.previewURL();
    if (previewURL) URL.revokeObjectURL(previewURL);
    this.previewURL.set(undefined);
    this.pendingFile.set(undefined);
  }

  async remove(): Promise<void> {
    const mediaID = this.mediaID();
    if (!mediaID) return;
    await this.run(async () => {
      await this.service.remove(mediaID, this.target(), this.role());
      this.undoMediaID.set(mediaID);
      this.changed.emit(undefined);
    });
  }

  async undo(): Promise<void> {
    const mediaID = this.undoMediaID();
    if (!mediaID) return;
    await this.run(async () => {
      await this.service.restore(mediaID, this.target(), this.role());
      this.undoMediaID.set(undefined);
      this.changed.emit(mediaID);
    });
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.progress.set(0);
    this.error.set(undefined);
    try {
      await action();
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Image update failed.',
      );
    } finally {
      this.busy.set(false);
    }
  }

  ngOnDestroy(): void {
    this.cancelSelection();
  }
}
