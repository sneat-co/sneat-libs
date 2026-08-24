import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IAvatar } from '@sneat/auth-models';

@Component({
  selector: 'sneat-avatar',
  templateUrl: './avatar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarComponent {
  readonly avatar = input.required<IAvatar | undefined>();
}
