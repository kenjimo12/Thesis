// src/utils/auth.js

export const TOKEN_KEY = "token";
export const ROLE_KEY = "role";
export const USER_KEY = "user";
export const JOINED_KEY = "joinedAt";

/**
 * Helper: get the active storage
 * - localStorage → remember me
 * - sessionStorage → not remembered
 */
function getStorage(preferLocal = true) {
  return preferLocal ? localStorage : sessionStorage;
}

/**
 * Read helpers
 * Try localStorage first, then sessionStorage
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function getRole() {
  return localStorage.getItem(ROLE_KEY) || sessionStorage.getItem(ROLE_KEY);
}

export function getJoinedAt() {
  return localStorage.getItem(JOINED_KEY) || sessionStorage.getItem(JOINED_KEY);
}

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    const user = raw ? JSON.parse(raw) : null;
    if (!user) return null;

    // ✅ Attach joinedAt if not already inside user
    const joinedAt = getJoinedAt();
    if (joinedAt && !user.joinedAt) {
      return { ...user, joinedAt };
    }

    return user;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return !!getToken();
}

/**
 * Save auth
 * @param {string} token
 * @param {object} user
 * @param {boolean} rememberMe
 */
export function setAuth(token, user, rememberMe = true) {
  // clear both first to avoid conflicts
  clearAuth();

  const storage = getStorage(rememberMe);

  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));
  storage.setItem(ROLE_KEY, user?.role || "");

  // ✅ JOINED DATE:
  // If backend doesn't provide createdAt, we create it ONCE and keep it.
  // Priority: backend date fields > existing joinedAt in user > keep stored joinedAt > now()
  const backendJoined =
    user?.createdAt ||
    user?.created_at ||
    user?.joinedAt ||
    user?.joined_at ||
    user?.dateCreated ||
    user?.date_created ||
    null;

  const existing = storage.getItem(JOINED_KEY);

  const finalJoinedAt = backendJoined || user?.joinedAt || existing || new Date().toISOString();
  storage.setItem(JOINED_KEY, finalJoinedAt);
}

/**
 * Clear auth everywhere
 */
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(JOINED_KEY);

  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(ROLE_KEY);
  sessionStorage.removeItem(JOINED_KEY);

  // let UI react immediately
  window.dispatchEvent(new Event("auth:changed"));
}

// keep logout as alias if used elsewhere
export function logout() {
  clearAuth();
}
