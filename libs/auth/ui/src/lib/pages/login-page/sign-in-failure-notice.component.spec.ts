import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ISignInFailure, silentRedirectSignInFailure } from '@sneat/auth-core';
import { SignInFailureNoticeComponent } from './sign-in-failure-notice.component';

describe('SignInFailureNoticeComponent', () => {
  let fixture: ComponentFixture<SignInFailureNoticeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignInFailureNoticeComponent],
    })
      .overrideComponent(SignInFailureNoticeComponent, {
        set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(SignInFailureNoticeComponent);
  });

  function render(failure?: ISignInFailure, canRetry = false): HTMLElement {
    fixture.componentRef.setInput('failure', failure);
    fixture.componentRef.setInput('canRetry', canRetry);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const buttons = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('ion-button')) as HTMLElement[];

  it('renders nothing without a failure', () => {
    const el = render(undefined);
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows summary, hints, code, message and host', () => {
    const el = render(
      silentRedirectSignInFailure('google.com', 'intouchkeeper.app'),
      true,
    );
    // Read each part directly: happy-dom's root textContent skips text
    // inside upgraded Ionic elements.
    const textOf = (selector: string) =>
      Array.from(el.querySelectorAll(selector))
        .map((node) => node.textContent ?? '')
        .join(' ');
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(textOf('h2 ion-text')).toBe("Sign-in with Google didn't complete");
    expect(el.querySelectorAll('.sign-in-failure-hint')).toHaveLength(3);
    expect(textOf('.sign-in-failure-hint')).toContain('third-party cookies');
    expect(el.querySelector('code')?.textContent).toBe('redirect-result-empty');
    const details = textOf('.sign-in-failure-details');
    expect(details).toContain('no sign-in result was received');
    expect(details).toContain('(on intouchkeeper.app)');
  });

  it('emits retry and dismiss', () => {
    const retry = vi.fn();
    const dismiss = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);
    fixture.componentInstance.dismiss.subscribe(dismiss);
    const el = render(
      { summary: 'x', code: 'auth/popup-blocked', host: 'h', hints: ['a'] },
      true,
    );
    const [tryAgain, close] = buttons(el);
    expect(tryAgain.textContent).toContain('Try again');
    tryAgain.click();
    close.click();
    expect(retry).toHaveBeenCalledOnce();
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it('offers only Dismiss when retry is not possible', () => {
    const el = render({ summary: 'x', host: 'h', hints: [] }, false);
    expect(buttons(el).map((b) => b.textContent?.trim())).toEqual(['Dismiss']);
  });
});
