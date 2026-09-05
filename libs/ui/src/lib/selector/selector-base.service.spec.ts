import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { ErrorLogger } from '@sneat/core';
import type { ComponentProps, ComponentRef } from '@ionic/core';
import { SelectorBaseService } from './selector-base.service';

class TestSelectorService extends SelectorBaseService<{ id: string }> {
  constructor() {
    super(class TestSelectorComponent {} as ComponentRef);
  }

  select() {
    return this.selectMultipleInModal({});
  }
}

describe('SelectorBaseService', () => {
  it('returns selected items when dismissal resolves before its promise settles', async () => {
    let componentProps: ComponentProps<unknown> | undefined;
    let resolveDidDismiss!: () => void;
    let resolveDismiss!: () => void;
    const didDismiss = new Promise<void>((resolve) => (resolveDidDismiss = resolve));
    const dismiss = new Promise<void>((resolve) => (resolveDismiss = resolve));
    const modalController = {
      create: vi.fn(async (options: { componentProps?: ComponentProps<unknown> }) => {
        componentProps = options.componentProps;
        return {
          present: vi.fn(async () => undefined),
          onDidDismiss: vi.fn(() => didDismiss),
        };
      }),
      dismiss: vi.fn(() => {
        resolveDidDismiss();
        return dismiss;
      }),
    };
    TestBed.configureTestingModule({
      providers: [
        TestSelectorService,
        { provide: ModalController, useValue: modalController },
        { provide: ErrorLogger, useValue: {} },
      ],
    });
    const service = TestBed.inject(TestSelectorService);
    const selection = service.select();
    await vi.waitFor(() => expect(componentProps).toBeDefined());
    const selectedItems = [{ id: 'alice' }, { id: 'bob' }];

    const callback = (
      componentProps as { onSelected: (items: { id: string }[]) => Promise<void> }
    ).onSelected(selectedItems);

    await expect(selection).resolves.toEqual(selectedItems);
    resolveDismiss();
    await callback;
  });
});
