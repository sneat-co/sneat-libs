import { Pipe, PipeTransform } from '@angular/core';
import {
  IContactBrief,
  IContactWithBriefAndSpace,
} from '@sneat/extension-contactus-contract';

@Pipe({ name: 'selectedContacts' })
export class SelectedContactsPipe implements PipeTransform {
  transform(
    selectedIDs: readonly string[],
    contactBriefs?: Record<string, IContactBrief>,
  ): IContactWithBriefAndSpace[] {
    // 'SelectedContactsPipe',
    // selectedIDs?.length,
    // `selectedIDs=${selectedIDs?.join(',')}`,
    // 'contactBriefs:',
    // contactBriefs,
    return selectedIDs.map((id) => {
      const brief = contactBriefs ? contactBriefs[id] : undefined;
      return { id, brief };
    }) as IContactWithBriefAndSpace[];
  }
}
