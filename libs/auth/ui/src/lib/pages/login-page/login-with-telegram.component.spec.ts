import { CUSTOM_ELEMENTS_SCHEMA, Provider } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { SneatApiService } from '@sneat/api';
import { SneatAuthStateService } from '@sneat/auth-core';
import { ErrorLogger } from '@sneat/core';
import { LoginWithTelegramComponent } from './login-with-telegram.component';
import { TelegramLoginConfig } from './telegram-login-config';

async function createComponent(
  extraProviders: Provider[] = [],
): Promise<ComponentFixture<LoginWithTelegramComponent>> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [LoginWithTelegramComponent],
    providers: [
      {
        provide: ErrorLogger,
        useValue: { logError: vi.fn(), logErrorHandler: () => vi.fn() },
      },
      {
        provide: SneatApiService,
        useValue: { post: vi.fn(), postAsAnonymous: vi.fn() },
      },
      {
        provide: SneatAuthStateService,
        useValue: { signInWithToken: vi.fn() },
      },
      ...extraProviders,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
  })
    .overrideComponent(LoginWithTelegramComponent, {
      set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    })
    .compileComponents();
  return TestBed.createComponent(LoginWithTelegramComponent);
}

describe('LoginWithTelegramComponent', () => {
  let component: LoginWithTelegramComponent;
  let fixture: ComponentFixture<LoginWithTelegramComponent>;

  beforeEach(waitForAsync(async () => {
    fixture = await createComponent();
    component = fixture.componentInstance;
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses the configured botID when TelegramLoginConfig is provided', async () => {
    fixture = await createComponent([
      { provide: TelegramLoginConfig, useValue: { botID: 'DataTugBot' } },
    ]);
    expect(fixture.componentInstance.botID).toBe('DataTugBot');
  });
});
