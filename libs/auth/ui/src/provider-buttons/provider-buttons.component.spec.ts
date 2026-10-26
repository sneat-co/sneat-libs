import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthProviderButtonsComponent, OAUTH_PROVIDER_IDS } from './index';

describe('AuthProviderButtonsComponent standalone presentation', () => {
  let fixture: ComponentFixture<AuthProviderButtonsComponent>;
  const selected = vi.fn();
  beforeEach(async () => {
    // Remove the shared suite's Firebase/analytics test providers: this entry needs none.
    TestBed.resetTestingModule();
    selected.mockReset();
    await TestBed.configureTestingModule({
      imports: [AuthProviderButtonsComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(AuthProviderButtonsComponent);
    fixture.componentInstance.providerSelected.subscribe(selected);
  });
  function items(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('ion-item'));
  }
  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('constructs without auth/router/user-record services and performs no automatic action', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const setStorage = vi.spyOn(Storage.prototype, 'setItem');
    await render();
    expect(items().map((item) => item.dataset['provider'])).toEqual([
      ...OAUTH_PROVIDER_IDS,
    ]);
    expect(selected).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(setStorage).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('ion-card')).toBeNull();
    for (const item of items())
      expect((item as HTMLElement & { button: boolean }).button).toBe(true);
    for (const icon of fixture.nativeElement.querySelectorAll('ion-icon')) {
      expect(icon.icon).toContain('<svg');
      expect(icon.getAttribute('name')).toBeNull();
    }
    fetch.mockRestore();
    setStorage.mockRestore();
  });
  it('emits exactly the selected typed provider without starting login itself', async () => {
    await render();
    for (const item of items()) item.click();
    expect(selected.mock.calls.map(([provider]) => provider)).toEqual([
      ...OAUTH_PROVIDER_IDS,
    ]);
  });
  it('uses actual native button semantics for keyboard users', async () => {
    await render();
    await vi.waitFor(() =>
      expect(items()[0].shadowRoot?.querySelector('button')).toBeTruthy(),
    );
    const button = items()[0].shadowRoot?.querySelector('button');
    expect(button?.type).toBe('button');
    button?.click();
    expect(selected).toHaveBeenCalledWith('google.com');
  });
  it('filters without changing fixed provider ordering and supports an empty set', async () => {
    fixture.componentRef.setInput('providers', ['github.com', 'google.com']);
    await render();
    expect(items().map((item) => item.dataset['provider'])).toEqual([
      'google.com',
      'github.com',
    ]);
    fixture.componentRef.setInput('providers', []);
    await fixture.whenStable();
    expect(items()).toHaveLength(0);
    expect(selected).not.toHaveBeenCalled();
  });
  it('disables every action while busy and identifies only the active spinner', async () => {
    fixture.componentRef.setInput('busy', 'microsoft.com');
    await render();
    expect(fixture.nativeElement.querySelectorAll('ion-spinner')).toHaveLength(
      1,
    );
    expect(
      fixture.nativeElement.querySelector('[aria-busy=true]').dataset.provider,
    ).toBe('microsoft.com');
    for (const item of items()) {
      expect((item as HTMLElement & { disabled: boolean }).disabled).toBe(true);
      item.click();
    }
    expect(selected).not.toHaveBeenCalled();
    fixture.componentRef.setInput('busy', undefined);
    await fixture.whenStable();
    items()[0].click();
    expect(selected).toHaveBeenCalledWith('google.com');
  });
  it('honors external disabled state even without a provider-specific busy state', async () => {
    fixture.componentRef.setInput('disabled', true);
    await render();
    for (const item of items()) item.click();
    expect(selected).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelectorAll('ion-spinner')).toHaveLength(
      0,
    );
  });
  it('supports bounded plain Russian labels and English fallback without interpolating HTML', async () => {
    fixture.componentRef.setInput('labels', {
      'google.com': 'Войти через Google',
      'apple.com': '',
      'microsoft.com': 'x'.repeat(161),
      'github.com': '<b>GitHub</b>',
    });
    await render();
    // Stencil's slot shim intercepts custom-element textContent in happy-dom.
    // Assert the actual interpolated label markup, including HTML escaping.
    expect(items()[0].querySelector('ion-label')?.innerHTML).toContain(
      'Войти через Google',
    );
    expect(items()[1].querySelector('ion-label')?.innerHTML).toContain(
      'Login with Apple',
    );
    expect(items()[2].querySelector('ion-label')?.innerHTML).toContain(
      'Login with Microsoft',
    );
    expect(items()[4].querySelector('ion-label')?.innerHTML).toContain(
      '&lt;b&gt;GitHub&lt;/b&gt;',
    );
    expect(items()[4].querySelector('b')).toBeNull();
  });
});
