import {buildBookmarkNavigationUrl} from '../background/navigation';
import type {MessageIdentity} from '../domain/identity';

export function navigateWithinChat(bookmark: MessageIdentity, page: Window = window): boolean {
  if (page !== page.top || page.location.origin !== 'https://chat.google.com') return false;
  const target = new URL(buildBookmarkNavigationUrl(page.location.href, bookmark));
  if (target.href === page.location.href) return true;
  if (target.pathname === page.location.pathname && target.search === page.location.search) {
    page.location.hash = target.hash;
  } else {
    page.history.pushState(null, '', target.href);
    page.dispatchEvent(new PopStateEvent('popstate', {state: null}));
  }
  return true;
}
