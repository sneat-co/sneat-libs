import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Sneat shared styles', () => {
  const projectRelative = resolve(process.cwd(), 'src/sneat-styles.scss');
  const workspaceRelative = resolve(process.cwd(), 'libs/components/src/sneat-styles.scss');
  const styles = readFileSync(
    existsSync(projectRelative) ? projectRelative : workspaceRelative,
    'utf8',
  );

  it('provides an explicit shared card-header background', () => {
    expect(styles).toMatch(
      /--sneat-card-header-background:\s*#f0f7ff/s,
    );
    expect(styles).toMatch(
      /\.sneat-card-header\s*\{[^}]*--background:\s*var\(--sneat-card-header-background\)/s,
    );
  });

  it('provides an explicit Ionic light pane-header background', () => {
    expect(styles).toMatch(
      /--sneat-pane-header-background:\s*var\(--ion-color-light\)/s,
    );
    expect(styles).toMatch(
      /\.sneat-pane-header\s*\{[^}]*--background:\s*var\(--sneat-pane-header-background\)/s,
    );
  });
});
