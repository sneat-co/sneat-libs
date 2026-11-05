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
    // happy-dom's textContent skips text inside upgraded Ionic elements.
    const text = el.innerHTML.replace(/<[^>]+>/g, '');
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(text).toContain("Sign-in with Google didn't complete");
    expect(text).toContain('third-party cookies');
    expect(el.querySelector('code')?.textContent).toBe('redirect-result-empty');
    expect(text).toContain('no sign-in result was received');
    expect(text).toContain('(on intouchkeeper.app)');
    expect(el.querySelectorAll('.sign-in-failure-hint')).toHaveLength(3);
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
