import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SneatAuthStateService } from '@sneat/auth-core';
import { ErrorLogger } from '@sneat/core';
import { BehaviorSubject } from 'rxjs';
import { UserAuthAProviderStatusComponent } from './user-auth-provider-status';

describe('UserAuthAProviderStatusComponent', () => {
  let fixture: ComponentFixture<UserAuthAProviderStatusComponent>;
  let component: UserAuthAProviderStatusComponent;
  const authUser = new BehaviorSubject(null);
  const authState = {
    authUser,
    linkWith: vi.fn().mockResolvedValue(undefined),
    unlinkAuthProvider: vi.fn().mockResolvedValue(undefined),
  };
  const errorLogger = { logError: vi.fn() };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserAuthAProviderStatusComponent],
      providers: [
        { provide: SneatAuthStateService, useValue: authState },
        { provide: ErrorLogger, useValue: errorLogger },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(UserAuthAProviderStatusComponent, {
        set: { template: '', imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(UserAuthAProviderStatusComponent);
    fixture.componentRef.setInput('providerID', 'google.com');
    fixture.componentRef.setInput('signingInWith', undefined);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('describes providers and signing state', () => {
    const view = component as unknown as {
      provider: () => { title: string; icon: string };
      isSigningIn: () => boolean;
      isDisabled: () => boolean;
    };
    expect(view.provider()).toMatchObject({
      title: 'Google',
      icon: 'logo-google',
    });
    expect(view.isSigningIn()).toBe(false);
    expect(view.isDisabled()).toBe(false);
    fixture.componentRef.setInput('signingInWith', 'google.com');
    expect(view.isSigningIn()).toBe(true);
    expect(view.isDisabled()).toBe(true);
  });

  it('connects and disconnects the selected provider', async () => {
    const view = component as unknown as {
      connect: () => void;
      disconnect: () => void;
    };
    const emitted: Array<string | undefined> = [];
    component.signingInWithChange.subscribe((value) => emitted.push(value));
    view.connect();
    await authState.linkWith.mock.results.at(-1)?.value;
    view.disconnect();
    await authState.unlinkAuthProvider.mock.results.at(-1)?.value;
    expect(authState.linkWith).toHaveBeenCalledWith('google.com');
    expect(authState.unlinkAuthProvider).toHaveBeenCalledWith('google.com');
    expect(emitted).toContain('google.com');
    expect(emitted.at(-1)).toBeUndefined();
  });

  it('stops observing authentication state on destroy', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
