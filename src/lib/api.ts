import { auth } from "./firebase";

/**
 * Returns a fresh, non-expired Firebase ID token for the current user.
 * If forceRefresh is true, forces a network token refresh.
 */
export async function getFreshAuthToken(forceRefresh = false): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  try {
    const token = await currentUser.getIdToken(forceRefresh);
    localStorage.setItem("questhub_auth_token", token);
    return token;
  } catch (err) {
    console.error("Failed to get fresh Firebase ID token:", err);
    return null;
  }
}

/**
 * Fetch wrapper that automatically attaches the fresh Firebase ID token
 * and handles token refresh on 401 Unauthorized responses.
 */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let token = await getFreshAuthToken();
  const headers = new Headers(init?.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response = await fetch(input, {
    ...init,
    headers,
  });

  // If 401 (expired/invalid token), try refreshing once
  if (response.status === 401 && auth.currentUser) {
    token = await getFreshAuthToken(true);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
      response = await fetch(input, {
        ...init,
        headers,
      });
    }
  }

  return response;
}
