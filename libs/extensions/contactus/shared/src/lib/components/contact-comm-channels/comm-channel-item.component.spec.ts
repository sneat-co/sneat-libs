import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CONTACT_SERVICE } from '@sneat/extension-contactus-contract';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorLogger } from '@sneat/core';
import { ClassName } from '@sneat/ui';

import { CommChannelItemComponent } from './comm-channel-item.component';
import { of } from 'rxjs';

describe('CommChannelItemComponent', () => {
  let component: CommChannelItemComponent;
  let fixture: ComponentFixture<CommChannelItemComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [CommChannelItemComponent],
      providers: [
        { provide: ClassName, useValue: 'CommChannelItemComponent' },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        {
          provide: CONTACT_SERVICE,
          useValue: {
            deleteContactCommChannel: vi.fn(),
            updateContactCommChannel: vi.fn(),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(CommChannelItemComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CommChannelItemComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$channelType', 'email');
    fixture.componentRef.setInput('$channel', { id: 'test@test.com' });
    fixture.componentRef.setInput('$contactID', 'test-contact');
    fixture.componentRef.setInput('$spaceID', 'test-space');
    fixture.componentRef.setInput('$lines', 'full');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;
  const svc = () =>
    TestBed.inject(CONTACT_SERVICE) as unknown as {
      deleteContactCommChannel: ReturnType<typeof vi.fn>;
      updateContactCommChannel: ReturnType<typeof vi.fn>;
    };

  describe('deleteChannel', () => {
    it('aborts when the confirm dialog is declined', () => {
      vi.stubGlobal('confirm', vi.fn(() => false));
      c().deleteChannel();
      expect(svc().deleteContactCommChannel).not.toHaveBeenCalled();
    });

    it('deletes the channel when confirmed', () => {
      svc().deleteContactCommChannel.mockReturnValue(of(undefined));
      vi.stubGlobal('confirm', vi.fn(() => true));
      c().deleteChannel();
      expect(svc().deleteContactCommChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceID: 'test-space',
          contactID: 'test-contact',
          channelID: 'test@test.com',
        }),
      );
    });
  });

  describe('saveChanges', () => {
    it('flags an error when the channel id is empty', () => {
      c().channelID.setValue('  ');
      c().saveChanges();
      expect(c().channelID.errors).toEqual({ required: true });
      expect(svc().updateContactCommChannel).not.toHaveBeenCalled();
    });

    it('updates the channel with a new id', () => {
      svc().updateContactCommChannel.mockReturnValue(of(undefined));
      c().channelID.setValue('new@test.com');
      c().saveChanges();
      expect(svc().updateContactCommChannel).toHaveBeenCalledWith(
        expect.objectContaining({ newChannelID: 'new@test.com' }),
      );
    });
  });

  it('onTypeChanged updates the channel type', () => {
    svc().updateContactCommChannel.mockReturnValue(of(undefined));
    c().onTypeChanged({ detail: { value: 'work' } });
    expect(svc().updateContactCommChannel).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'work' }),
    );
  });
});
