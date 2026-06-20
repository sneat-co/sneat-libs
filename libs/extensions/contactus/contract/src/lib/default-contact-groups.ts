import { IIdAndDbo } from '@sneat/core';
import {
  IContactGroupDbo,
  IContactRoleWithIdAndBrief,
} from './dto';

const contactTypeFamilyMember: IContactRoleWithIdAndBrief = {
    id: 'member',
    brief: {
      title: 'Family member',
      titlePlural: 'Members',
      emoji: '👪',
    },
  },
  contactTypePet: IContactRoleWithIdAndBrief = {
    id: 'pet',
    hideInNewContactForm: true,
    brief: {
      title: 'Family Pet',
      titlePlural: 'Pets',
      emoji: '👪',
    },
  },
  contactTypeRelative: IContactRoleWithIdAndBrief = {
    id: 'relative',
    brief: {
      title: 'Relative',
      titlePlural: 'Relatives',
      emoji: '👪',
    },
  },
  contactTypeTeacher: IContactRoleWithIdAndBrief = {
    id: 'teacher',
    brief: {
      title: 'Teacher',
      titlePlural: 'Teachers',
      emoji: '👩‍🏫',
    },
  },
  contactTypeBabysitter: IContactRoleWithIdAndBrief = {
    id: 'babysitter',
    brief: {
      title: 'Babysitter',
      titlePlural: 'Babysitters',
      emoji: '👧',
      finder: 'babysitters.express',
    },
  },
  contactTypeFriendOfKid: IContactRoleWithIdAndBrief = {
    id: 'friend',
    brief: {
      title: 'Friend',
      titlePlural: 'Friends',
      emoji: '🚸',
    },
  },
  // contactTypeGP: IContactRoleBrief = { id: 'gp', title: 'Family doctor', emoji: '👩‍⚕️', finder: 'gpconnect.app' },
  contactTypePlumber: IContactRoleWithIdAndBrief = {
    id: 'plumber',
    brief: {
      title: 'Plumber',
      titlePlural: 'Plumbers',
      emoji: '🚽',
      finder: 'plumbers.express',
    },
  },
  contactTypeElectrician: IContactRoleWithIdAndBrief = {
    id: 'electrician',
    brief: {
      title: 'Electrician',
      titlePlural: 'Electricians',
      emoji: '🔌',
      finder: 'electricians.express',
    },
  },
  contactTypeHandyman: IContactRoleWithIdAndBrief = {
    id: 'handyman',
    brief: {
      title: 'Handyman',
      titlePlural: 'Handymen',
      emoji: '🔨',
    },
  },
  contactTypeGardener: IContactRoleWithIdAndBrief = {
    id: 'gardener',
    brief: {
      title: 'Gardener',
      titlePlural: 'Gardeners',
      emoji: '👨‍🌾',
      finder: 'gardeners.express',
    },
  },
  contactTypeInsurer: IContactRoleWithIdAndBrief = {
    id: 'insurer',
    brief: {
      title: 'Insurer',
      titlePlural: 'Insurers',
      emoji: '🧾',
    },
  },
  contactTypeMechanic: IContactRoleWithIdAndBrief = {
    id: 'mechanic',
    brief: {
      title: 'Mechanic',
      titlePlural: 'Mechanics',
      emoji: '👨‍🔧',
    },
  };

export const defaultFamilyContactGroupDTOs: readonly IIdAndDbo<IContactGroupDbo>[] =
  [
    {
      id: 'family',
      dbo: {
        emoji: '👪',
        title: 'Family',
        roles: [
          contactTypeFamilyMember,
          contactTypePet,
          contactTypeRelative,
          contactTypeFriendOfKid,
        ],
      },
    },
    {
      id: 'kid',
      dbo: {
        emoji: '🚸',
        title: 'Kids',
        roles: [
          contactTypeTeacher,
          contactTypeBabysitter,
          contactTypeFriendOfKid,
        ],
      },
    },
    {
      id: 'house',
      dbo: {
        emoji: '🏠',
        title: 'House',
        roles: [
          contactTypeHandyman,
          contactTypePlumber,
          contactTypeElectrician,
          contactTypeGardener,
          contactTypeInsurer,
        ],
      },
    },
    {
      id: 'med',
      dbo: {
        emoji: '⚕️',
        title: 'Medical',
        roles: [
          { id: 'gp', brief: { title: 'GP / Family doctor', emoji: '🩺' } },
          {
            id: 'med_specialist',
            brief: { title: 'Medical specialist', emoji: '🥼' },
          },
        ],
      },
    },
    {
      id: 'vehicle',
      dbo: {
        emoji: '🚗',
        title: 'Vehicle',
        roles: [contactTypeMechanic, contactTypeInsurer],
      },
    },
  ];

export const defaultFamilyContactGroups: readonly IIdAndDbo<IContactGroupDbo>[] =
  defaultFamilyContactGroupDTOs.map((cg) => ({ ...cg, brief: cg.dbo }));
