import { equalSpaceBriefs, ISpaceBrief } from './dto-team-brief';

const brief = (overrides: Partial<ISpaceBrief> = {}): ISpaceBrief => ({
  title: 'Our home',
  type: 'group',
  groupKind: 'housemates',
  ...overrides,
});

describe('equalSpaceBriefs', () => {
  it('treats identical housemate briefs as equal', () => {
    expect(equalSpaceBriefs(brief(), brief())).toBe(true);
  });

  it('detects group kind changes', () => {
    expect(equalSpaceBriefs(brief(), brief({ groupKind: 'friends' }))).toBe(false);
  });

  it('detects space type changes', () => {
    expect(equalSpaceBriefs(brief(), brief({ type: 'team', groupKind: undefined }))).toBe(false);
  });

  it('keeps legacy briefs without groupKind equal', () => {
    expect(
      equalSpaceBriefs(
        brief({ groupKind: undefined }),
        brief({ groupKind: undefined }),
      ),
    ).toBe(true);
  });
});
