import { ISpaceRef } from './interfaces';
import { parseSpaceType } from './team-type';

const CURRENT_SPACE_STORAGE_KEY = 'sneat.currentSpace';

/** Persists the user's current space so it can be restored after login. */
export function writeCurrentSpace(space: ISpaceRef): void {
  if (!space.id || !space.type) {
    return;
  }
  try {
    localStorage.setItem(
      CURRENT_SPACE_STORAGE_KEY,
      JSON.stringify({ id: space.id, type: space.type }),
    );
  } catch {
    // Ignore storage errors (e.g. disabled/full storage in private mode).
  }
}

/** Clears the persisted current space (e.g. when the user leaves all spaces). */
export function clearCurrentSpace(): void {
  try {
    localStorage.removeItem(CURRENT_SPACE_STORAGE_KEY);
  } catch {
    // Ignore storage errors (e.g. disabled storage in private mode).
  }
}

/** Reads the persisted current space, or undefined when none/invalid. */
export function readCurrentSpace(): ISpaceRef | undefined {
  try {
    const value = localStorage.getItem(CURRENT_SPACE_STORAGE_KEY);
    if (!value) {
      return undefined;
    }
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') {
      return undefined;
    }
    const { id, type } = parsed as Record<string, unknown>;
    const parsedType = parseSpaceType(type);
    return typeof id === 'string' && id && parsedType
      ? { id, type: parsedType }
      : undefined;
  } catch {
    return undefined;
  }
}

/** Router path for the persisted current space, or undefined when none. */
export function currentSpacePath(): string | undefined {
  const space = readCurrentSpace();
  return space ? `/space/${space.type}/${space.id}` : undefined;
}
