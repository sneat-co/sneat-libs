import { Injectable, NgModule, inject } from '@angular/core';
import { CalendariusSpaceService } from '../services/calendarius-space.service';
import { SpaceComponentBaseParams } from '@sneat/space-components';
import { HappeningService } from '../services/happening.service';

@Injectable()
export class HappeningComponentBaseParams {
  readonly spaceParams = inject(SpaceComponentBaseParams);
  readonly happeningService = inject(HappeningService);
  readonly calendariusSpaceService = inject(CalendariusSpaceService);
}

@NgModule({
  providers: [
    HappeningComponentBaseParams,
    SpaceComponentBaseParams,
    CalendariusSpaceService,
  ],
})
export class HappeningComponentBaseParamsModule {}
