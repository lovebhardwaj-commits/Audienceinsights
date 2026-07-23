// Lightweight, temporary auth layer for external testers — a single env-variable
// user map gates the whole app in front of the real Meta OAuth flow. No database,
// no roles, no self-service. Parsed fresh on every call (not cached at module
// level) so updating AUTH_USERS in the Vercel dashboard takes effect without a
// redeploy.

export function getUsers(): Map<string, string> {
  const raw = process.env.AUTH_USERS || "";
  const users = new Map<string, string>();
  for (const pair of raw.split(",")) {
    const [email, password] = pair.split(":");
    if (email && password) {
      users.set(email.trim().toLowerCase(), password.trim());
    }
  }
  return users;
}

export function validateUser(email: string, password: string): boolean {
  const users = getUsers();
  const stored = users.get(email.trim().toLowerCase());
  return stored !== undefined && stored === password;
}
