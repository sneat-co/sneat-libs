import { RouterStateSnapshot } from '@angular/router';

/** Derive the page title from the deepest activated route, preserving the
 * legacy space-type prefix (for example, "Family Debts"). */
export function getRouteTitle(
  snapshot: RouterStateSnapshot,
): string | undefined {
  let route = snapshot.root;
  while (route.firstChild) {
    route = route.firstChild;
  }
  let title = route.data['title'] as string | undefined;
  if (title) {
    const spaceType = route.paramMap.get('spaceType');
    if (spaceType) {
      title = `${capitalizeFirstLetter(spaceType)} ${title}`;
    }
  }
  return title;
}

function capitalizeFirstLetter(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
