import { NgModule } from '@angular/core';
import { HappeningSlotModalService } from '../components/happening-slot-form/happening-slot-modal.service';
import { CalendariusSpaceService } from './calendarius-space.service';

@NgModule({
  providers: [CalendariusSpaceService, HappeningSlotModalService],
})
export class CalendariusServicesModule {}
