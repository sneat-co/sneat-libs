import { Injectable, inject } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { UserRequiredFieldsModalComponent } from './user-required-fields-modal.component';

// providedIn:'root' so every consumer resolves it without a local provider.
// SpacesListComponent injects it, and that component is embedded in
// SpacesCardComponent (used on app landing pages) — without root provision,
// rendering the card on a route that doesn't provide it throws NG0201.
@Injectable({ providedIn: 'root' })
export class UserRequiredFieldsService {
  private readonly modalController = inject(ModalController);

  public async open(): Promise<boolean> {
    const modal = await this.modalController.create({
      component: UserRequiredFieldsModalComponent,
    });
    await modal.present();
    return new Promise((resolve, reject) => {
      modal
        .onDidDismiss()
        .then((value) => {
          resolve(!!value);
        })
        .catch(reject);
    });
  }
}
