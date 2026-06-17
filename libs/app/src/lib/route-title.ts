import { RouterStateSnapshot } from '@angular/router';

// Derives the page title from route config: walks to the deepest activated
// route, reads its `data['title']`, and (for space routes) prefixes the space
// type, e.g. data.title="Debts" on a family space => "Family Debts". This is
// the single source of the "bare" page title (without the app-name suffix),
// shared by SneatTitleStrategy (document.title) and BaseAppComponent (analytics)
// so both stay in sync.
export function getRouteTitle(snapshot: RouterStateSnapshot): string | undefined {
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
