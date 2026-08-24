import { Component, ChangeDetectionStrategy, input } from '@angular/core';

interface IItem {
  id: string;
}

@Component({
  selector: 'sneat-test',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `Today's item: {{ item() }}`,
})
export class TestComponent {
  readonly item = input<IItem | null>();
}

@Component({
  selector: 'sneat-consumer',
  imports: [TestComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <sneat-test [item]="myItem('test')" />`,
})
export class ConsumerComponent {
  protected myItem(id: string): IItem | undefined {
    return id ? { id } : undefined;
  }
}
