import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SpaceMemberPageComponent } from './space-member-page.component';
import { provideContactusMocks } from '../../../testing/test-utils';
import { ContactService } from '../../../services';
import { NavController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';

interface ITestable {
  removeMember(): void;
  memberContext?: unknown;
  $spaceRef: { set(v: unknown): void };
}

describe('SpaceMemberPageComponent', () => {
  let component: SpaceMemberPageComponent;
  let testable: ITestable;
  let fixture: ComponentFixture<SpaceMemberPageComponent>;
  let contactService: { removeSpaceMember: ReturnType<typeof vi.fn> };
  let navController: { pop: ReturnType<typeof vi.fn> };

  beforeEach(waitForAsync(async () => {
    contactService = { removeSpaceMember: vi.fn(() => of(undefined)) };
    navController = { pop: vi.fn(() => Promise.resolve(true)) };
    await TestBed.configureTestingModule({
      imports: [SpaceMemberPageComponent],
      providers: [
        provideContactusMocks(),
        { provide: ContactService, useValue: contactService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(SpaceMemberPageComponent, {
        set: {
          imports: [],
          template: '',
          providers: [
            { provide: ContactService, useValue: contactService },
            { provide: NavController, useValue: navController },
          ],
        },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SpaceMemberPageComponent);
    component = fixture.componentInstance;
    testable = component as unknown as ITestable;
    testable.$spaceRef.set({ id: 'space1' });
    testable.memberContext = { id: 'm1', brief: { title: 'Bob' } };
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('removeMember', () => {
    it('aborts when the confirm dialog is declined', () => {
      vi.stubGlobal('confirm', vi.fn(() => false));
      testable.removeMember();
      expect(contactService.removeSpaceMember).not.toHaveBeenCalled();
    });

    it('removes the member and pops the nav stack when confirmed', () => {
      vi.stubGlobal('confirm', vi.fn(() => true));
      testable.removeMember();
      expect(contactService.removeSpaceMember).toHaveBeenCalledWith({
        spaceID: 'space1',
        contactID: 'm1',
      });
      expect(navController.pop).toHaveBeenCalled();
    });

    it('aborts when the member has no id', () => {
      testable.memberContext = { brief: { title: 'Bob' } };
      vi.stubGlobal('confirm', vi.fn(() => true));
      testable.removeMember();
      expect(contactService.removeSpaceMember).not.toHaveBeenCalled();
    });

    it('does not pop when removal fails', () => {
      contactService.removeSpaceMember.mockReturnValue(
        throwError(() => new Error('boom')),
      );
      vi.stubGlobal('confirm', vi.fn(() => true));
      testable.removeMember();
      expect(navController.pop).not.toHaveBeenCalled();
    });
  });
});
