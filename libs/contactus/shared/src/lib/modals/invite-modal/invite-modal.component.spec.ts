import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorLogger } from '@sneat/core';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { InviteService } from '@sneat/contactus-services';

import { InviteModalComponent } from './invite-modal.component';
import { of } from 'rxjs';

describe('InviteModalComponent', () => {
  let component: InviteModalComponent;
  let fixture: ComponentFixture<InviteModalComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [InviteModalComponent],
      providers: [
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        {
          provide: ModalController,
          useValue: { dismiss: vi.fn(), create: vi.fn() },
        },
        { provide: ToastController, useValue: { create: vi.fn() } },
        {
          provide: InviteService,
          useValue: {
            createInviteForMember: vi.fn(),
            getInviteLinkForMember: vi.fn(),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(InviteModalComponent, {
        set: { imports: [], template: '', providers: [] },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InviteModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;
  const inviteSvc = () =>
    TestBed.inject(InviteService) as unknown as {
      createInviteForMember: ReturnType<typeof vi.fn>;
    };
  const modalCtrl = () =>
    TestBed.inject(ModalController) as unknown as {
      dismiss: ReturnType<typeof vi.fn>;
    };

  it('close dismisses the modal', async () => {
    await component.close();
    expect(modalCtrl().dismiss).toHaveBeenCalled();
  });

  it('getInviteText throws without a member', () => {
    expect(() => component.getInviteText({ id: 'i1' })).toThrow('!this.member');
  });

  it('getInviteText includes the receiver and invite id', () => {
    component.member = {
      id: 'm1',
      brief: { names: { fullName: 'Bob' } },
      space: { id: 's1' },
    } as never;
    const text = component.getInviteText({ id: 'i1', pin: '1234' });
    expect(text).toContain('i1');
    expect(text).toContain('1234');
  });

  describe('createInvite', () => {
    it('errors without a space', () => {
      const onErr = vi.fn();
      component.createInvite({ channel: 'email' }).subscribe({
        next: vi.fn(),
        error: onErr,
      });
      expect(onErr).toHaveBeenCalled();
    });

    it('calls the service when space and member are set', () => {
      inviteSvc().createInviteForMember.mockReturnValue(of({ invite: {} }));
      component.space = { id: 's1' };
      component.member = { id: 'm1', space: { id: 's1' } } as never;
      component.createInvite({ channel: 'email', address: 'a@b.com' }).subscribe();
      expect(inviteSvc().createInviteForMember).toHaveBeenCalledWith(
        expect.objectContaining({ spaceID: 's1' }),
      );
    });
  });

  describe('sendInvite', () => {
    it('aborts without a space', () => {
      component.sendInvite();
      expect(inviteSvc().createInviteForMember).not.toHaveBeenCalled();
    });

    it('reports a validation error for an empty email', () => {
      component.space = { id: 's1' };
      component.member = { id: 'm1', space: { id: 's1' } } as never;
      component.tab.set('email');
      component.sendInvite();
      expect(c().error()).toBe('Email address is required');
      expect(inviteSvc().createInviteForMember).not.toHaveBeenCalled();
    });

    it('creates an invite for a valid email', () => {
      inviteSvc().createInviteForMember.mockReturnValue(of({ invite: {} }));
      component.space = { id: 's1' };
      component.member = { id: 'm1', space: { id: 's1' } } as never;
      component.tab.set('email');
      component.email.setValue('a@b.com');
      component.sendInvite();
      expect(inviteSvc().createInviteForMember).toHaveBeenCalledWith(
        expect.objectContaining({
          to: expect.objectContaining({ channel: 'email', send: true }),
        }),
      );
    });
  });

  it('copyLinkToClipboard is a no-op when there is no link', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await component.copyLinkToClipboard();
    expect(writeText).not.toHaveBeenCalled();
  });
});
