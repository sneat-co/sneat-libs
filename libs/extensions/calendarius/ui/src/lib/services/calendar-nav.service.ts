import { inject, Injectable, NgModule } from '@angular/core';
import { ErrorLogger } from '@sneat/core';
import { ISlotUIEvent } from '@sneat/extension-calendarius-contract';
import { IHappeningContext } from '@sneat/extension-calendarius-contract';
import { SpaceNavService } from '@sneat/space-services';

@Injectable()
export class CalendarNavService {
  private readonly errorLogger = inject(ErrorLogger);
  private readonly spaceNavService = inject(SpaceNavService);

  public navigateToHappeningPage(args: ISlotUIEvent): void {
    const happening: IHappeningContext = args.slot.happening;
    const page = `happening/${happening.id}`;
    this.spaceNavService
      .navigateForwardToSpacePage(happening.space, page, {
        state: { happening },
      })
      .catch(
        this.errorLogger.logErrorHandler(
          'failed to navigate to recurring happening page',
        ),
      );
  }
}

@NgModule({
  providers: [CalendarNavService],
})
export class CalendarNavServicesModule {}
