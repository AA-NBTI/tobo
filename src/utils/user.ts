export function getUserProfileUrl(user: { id?: string, author_id?: string, username?: string | null, accounts?: { username?: string | null } | null } | null | string): string {
  if (!user) return '/';
  
  if (typeof user === 'string') {
    const trimmed = user.trim()
    if (!trimmed) return '/';
    if (trimmed.startsWith('@')) return `/users/${trimmed}`;
    return `/users/${trimmed}`;
  }

  const id = user.id || user.author_id;
  const username = (user.username || user.accounts?.username || '').trim();

  if (username && username !== '@') {
    const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
    return `/users/@${cleanUsername}`;
  }
  
  if (id) {
    return `/users/${id}`;
  }

  return '/';
}



export function getLocalizedDisplayName(displayName: string, locale: string): string {
  if (!displayName) return displayName;
  
  const parts = displayName.split('-');
  if (parts.length >= 2) {
    if (locale === 'ko') {
      return parts[0].trim();
    } else {
      return parts.slice(1).join('-').trim();
    }
  }
  return displayName;
}
