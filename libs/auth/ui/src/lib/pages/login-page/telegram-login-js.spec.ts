import {
  TELEGRAM_LOGIN_JS_URL,
  loadTelegramLoginScript,
  telegramLoginApi,
} from './telegram-login-js';

/**
 * A document whose head only records what is appended. The scripts stay
 * detached from the real test document, so nothing is ever fetched.
 */
function fakeDocument(existing?: HTMLScriptElement): {
  doc: Document;
  appended: HTMLScriptElement[];
} {
  const appended: HTMLScriptElement[] = [];
  const doc = {
    querySelector: () => existing ?? appended[0] ?? null,
    createElement: (tag: string) => document.createElement(tag),
    head: {
      appendChild: (el: HTMLScriptElement) => {
        appended.push(el);
        return el;
      },
    },
  };
  return { doc: doc as unknown as Document, appended };
}

describe('loadTelegramLoginScript', () => {
  it('appends the library once and resolves when it loads', async () => {
    const { doc, appended } = fakeDocument();
    const loaded = loadTelegramLoginScript(doc);
    expect(appended).toHaveLength(1);
    expect(appended[0].src).toBe(TELEGRAM_LOGIN_JS_URL);
    expect(appended[0].async).toBe(true);

    appended[0].dispatchEvent(new Event('load'));
    await expect(loaded).resolves.toBeUndefined();
    expect(appended[0].dataset['loaded']).toBe('true');

    // A later caller finds the loaded script and appends nothing.
    await expect(loadTelegramLoginScript(doc)).resolves.toBeUndefined();
    expect(appended).toHaveLength(1);
  });

  it('waits for a script another caller is still loading', async () => {
    const pending = document.createElement('script');
    const { doc, appended } = fakeDocument(pending);
    const loaded = loadTelegramLoginScript(doc);
    expect(appended).toHaveLength(0);

    pending.dispatchEvent(new Event('load'));
    await expect(loaded).resolves.toBeUndefined();
  });

  it('rejects when the library fails to load', async () => {
    const { doc, appended } = fakeDocument();
    const loaded = loadTelegramLoginScript(doc);
    appended[0].dispatchEvent(new Event('error'));
    await expect(loaded).rejects.toThrow(TELEGRAM_LOGIN_JS_URL);
  });
});

describe('telegramLoginApi', () => {
  it('returns Telegram.Login once the library has defined it', () => {
    const login = { auth: vi.fn() };
    expect(
      telegramLoginApi({ Telegram: { Login: login } } as unknown as Window),
    ).toBe(login);
    expect(telegramLoginApi({} as Window)).toBeUndefined();
  });
});
