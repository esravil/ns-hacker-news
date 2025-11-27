const STORAGE_KEY = "nsreddit.inviteToken";

/**
 * Safely read the invite token from the current URL (?invite=...).
 * Returns null if not present or empty.
 */
export function getInviteTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("invite");
    const trimmed = token?.trim() ?? "";

    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

/**
 * Read any previously stored invite token from localStorage.
 */
export function getInviteTokenFromStorage(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const trimmed = raw?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

/**
 * Persist an invite token in localStorage.
 */
export function saveInviteToken(token: string): void {
  if (typeof window === "undefined") return;

  const trimmed = token.trim();
  if (!trimmed) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, trimmed);
  } catch {
    // Ignore storage errors; gating logic will fall back to URL parsing.
  }
}

/**
 * Clear any stored invite token from localStorage.
 */
export function clearInviteToken(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

/**
 * Load an invite token, preferring the URL (?invite=...) and syncing it
 * into localStorage for later use. Falls back to localStorage if it isn't
 * present in the URL anymore.
 */
export function loadInviteToken(): string | null {
  const fromUrl = getInviteTokenFromUrl();
  if (fromUrl) {
    saveInviteToken(fromUrl);
    return fromUrl;
  }

  return getInviteTokenFromStorage();
}