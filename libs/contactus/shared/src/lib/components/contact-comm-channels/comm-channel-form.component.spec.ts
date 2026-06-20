import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CONTACT_SERVICE } from '@sneat/extension-contactus-contract';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorLogger } from '@sneat/core';
import { ClassName } from '@sneat/ui';
import { of } from 'rxjs';

import { CommChannelFormComponent } from './comm-channel-form.component';

describe('CommChannelFormComponent', () => {
  let component: CommChannelFormComponent;
  let fixture: ComponentFixture<CommChannelFormComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [CommChannelFormComponent],
      providers: [
        { provide: ClassName, useValue: 'CommChannelFormComponent' },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        {
          provide: CONTACT_SERVICE,
          useValue: { addContactCommChannel: vi.fn() },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(CommChannelFormComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CommChannelFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$contact', {
      id: 'test',
      space: { id: 'test-space' },
    });
    fixture.componentRef.setInput('$channelType', 'email');
    fixture.componentRef.setInput('$placeholder', 'email@address');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;
  const stop = () =>
    ({ stopPropagation: vi.fn(), preventDefault: vi.fn() }) as unknown as Event;
  const svc = () =>
    TestBed.inject(CONTACT_SERVICE) as unknown as {
      addContactCommChannel: ReturnType<typeof vi.fn>;
    };

  it('onTypeChanged updates the type signal', () => {
    c().onTypeChanged('work');
    expect(c().$type()).toBe('work');
  });

  it('addNewChannel flags an error when the channel id is empty', () => {
    c().channelID.setValue('  ');
    c().addNewChannel(stop());
    expect(c().channelID.errors).toEqual({ required: true });
    expect(svc().addContactCommChannel).not.toHaveBeenCalled();
  });

  it('addNewChannel adds the channel when valid', () => {
    svc().addContactCommChannel.mockReturnValue(of(undefined));
    c().channelID.setValue('me@x.com');
    const close = vi.spyOn(component.closeForm, 'emit');
    c().addNewChannel(stop());
    expect(svc().addContactCommChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        contactID: 'test',
        channelType: 'email',
        channelID: 'me@x.com',
      }),
    );
    expect(close).toHaveBeenCalled();
  });
});
