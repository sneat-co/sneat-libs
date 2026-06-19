import {
  IHappeningContext,
  IHappeningSlot,
  ICalendariusSpaceContext,
  ISlotUIContext,
  RecurringSlots,
  WeekdayCode2,
  IHappeningBrief,
} from '@sneat/extension-calendarius-core';
import { zipMapBriefsWithIDs } from '@sneat/space-models';

export type ISpaceRecurrings = {
  readonly spaceID: string;
  readonly recurringHappenings: Readonly<Record<string, IHappeningBrief>>;
};

export type RecurringsByWeekday = {
  [wd in WeekdayCode2]: ISlotUIContext[];
};

export const emptyRecurringsByWeekday = (): RecurringsByWeekday =>
  (['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'] as WeekdayCode2[]).reduce(
    (o, wd) => {
      o[wd] = [];
      return o;
    },
    {} as RecurringsByWeekday,
  );

export const groupRecurringSlotsByWeekday = (
  calendariusSpace?: ICalendariusSpaceContext,
): RecurringSlots => {
  const slots: RecurringSlots = {
    byWeekday: {},
  };
  if (!calendariusSpace?.dbo?.recurringHappenings) {
    // console.log(logPrefix + ', no slots for team:', calendariusSpace);
    return slots;
  }
  zipMapBriefsWithIDs(calendariusSpace.dbo.recurringHappenings).forEach(
    (rh) => {
      Object.entries(rh.brief.slots || {})?.forEach(([slotID, rs]) => {
        const happening: IHappeningContext = {
          id: rh.id,
          brief: rh.brief,
          space: calendariusSpace.space,
        };
        const slotItems = slotUIContextsFromRecurringSlot(
          happening,
          slotID,
          rs,
        );
        slotItems.forEach((si) => {
          if (si.wd) {
            let weekday = slots.byWeekday[si.wd];
            if (!weekday) {
              weekday = [];
              slots.byWeekday[si.wd] = weekday;
            }
            weekday.push(si);
          }
        });
      });
    },
  );
  // console.log(logPrefix + ', slots:', slots);
  return slots;
};

const slotUIContextsFromRecurringSlot = (
  r: IHappeningContext,
  slotID: string,
  rs: IHappeningSlot,
): ISlotUIContext[] => {
  const si = {
    // date: rs.start.date,
    slot: { ...rs, id: slotID },
    happening: r,
    title: r.brief?.title || r.id,
    levels: r.brief?.levels,
    repeats: rs.repeats,
    timing: { start: rs.start, end: rs.end },
  };
  if (rs.weekdays?.length) {
    return rs.weekdays.map((wd) => ({ ...si, wd }));
  }
  return [si];
};
