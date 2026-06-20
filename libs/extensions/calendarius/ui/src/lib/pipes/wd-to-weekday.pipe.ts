import { Pipe, PipeTransform } from '@angular/core';
import {
  WeekdayCode2,
  wdCodeToWeekdayLongName,
} from '@sneat/extension-calendarius-contract';

@Pipe({
  name: 'wdToWeekday',
})
export class WdToWeekdayPipe implements PipeTransform {
  transform(wd?: WeekdayCode2): string {
    return wdCodeToWeekdayLongName(wd);
  }
}
