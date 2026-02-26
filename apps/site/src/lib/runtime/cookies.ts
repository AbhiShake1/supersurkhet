function decodeCookieSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function getRuntimeCookie(name: string): string | undefined {
  if (typeof document === 'undefined' || !document.cookie) {
    return undefined;
  }

  const segments = document.cookie.split(';');
  for (const segment of segments) {
    const [rawKey, ...rawValueParts] = segment.trim().split('=');
    if (!rawKey) continue;

    const key = decodeCookieSegment(rawKey.trim());
    if (key !== name) continue;

    return decodeCookieSegment(rawValueParts.join('=').trim());
  }

  return undefined;
}
