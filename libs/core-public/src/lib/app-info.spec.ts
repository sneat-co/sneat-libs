import { APP_INFO } from './app-info';
describe('APP_INFO', () => {
  it('is one stable public injection token', () => expect(APP_INFO.toString()).toContain('app_info'));
});
