import { Injectable, Injector, inject } from '@angular/core';
import { ISneatApiService, SneatApiService } from '@sneat/api-public';
import { parseStoreRef } from '@sneat/core';

export const getStoreUrl = (storeId: string): string => {
  if (storeId === 'firestore') {
    const v = 'http://localhost:4300/v0'; //environment.agents.firestoreStoreAgent;
    return v.endsWith('/') ? v.substring(0, v.length - 1) : v;
  }
  if (!storeId || storeId.match(/https?:\/\//)) {
    return storeId;
  }
  if (storeId.startsWith('http-')) {
    return storeId.replace('http-', 'http' + '://');
  }
  if (storeId.startsWith('https-')) {
    return storeId.replace('https-', 'https://');
  }
  const a = storeId.split(':');
  storeId = `//${a[0]}:${a[1]}`;
  if (a[2]) {
    storeId += ':' + a[2];
  }
  return storeId;
};

@Injectable({ providedIn: 'root' })
export class SneatApiServiceFactory {
  // The Injector is captured while the factory is constructed (an injection
  // context) and used to resolve services later — see getSneatApiService().
  private readonly injector = inject(Injector);

  private services: Record<string, ISneatApiService> = {};

  public getSneatApiService(storeId: string): ISneatApiService {
    if (!storeId) {
      throw new Error(
        'storeRef is a required parameter, got empty: ' + typeof storeId,
      );
    }
    const storeRef = parseStoreRef(storeId);
    if (!storeRef.type) {
      throw new Error(
        'storeRef.type is a required parameter, got empty: ' +
          typeof storeRef.type,
      );
    }
    const id = `${storeRef.type}:${storeRef.url}`;
    let service = this.services[id];
    if (service) {
      return service;
    }
    // const baseUrl = getStoreUrl(storeRefToId(storeRef));
    switch (storeRef.type) {
      case 'firestore':
        // Resolve via the captured Injector, never `inject()`: callers invoke
        // this from UI event handlers (e.g. a "create project" button click),
        // where no injection context is active and `inject()` throws NG0203 —
        // which is exactly what broke project creation on datatug.app.
        this.services[id] = service = this.injector.get(SneatApiService);
        return service;
      default:
        throw new Error('unknown store type: ' + storeRef.type);
    }
  }
}
