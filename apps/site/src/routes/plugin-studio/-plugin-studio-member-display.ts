function normalizeDisplayText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toEmailLocalPart(email: string | undefined): string | undefined {
  if (!email) return undefined;
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return undefined;
  const localPart = email.slice(0, atIndex).trim();
  return localPart.length > 0 ? localPart : undefined;
}

export function resolveActorDisplayName(user: unknown): string | undefined {
  const userRecord = user as Record<string, unknown> | null | undefined;
  const candidates = [
    userRecord?.name,
    userRecord?.displayName,
    userRecord?.fullName,
    userRecord?.username,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeDisplayText(candidate);
    if (normalized) return normalized;
  }

  const email = normalizeDisplayText(userRecord?.email);
  return toEmailLocalPart(email);
}

export function resolveProjectMemberDisplayName({
  memberUserId,
  actorUserIdAliases,
  actorDisplayName,
}: {
  memberUserId: string;
  actorUserIdAliases?: readonly string[];
  actorDisplayName: string | undefined;
}): string {
  const actorAliases = Array.isArray(actorUserIdAliases)
    ? actorUserIdAliases
    : [];
  if (
    actorDisplayName &&
    actorAliases.some((alias) => alias === memberUserId)
  ) {
    return actorDisplayName;
  }
  return memberUserId;
}

export function resolveProjectMemberEmailDisplay({
  memberUserId,
  actorUserIdAliases,
  actorEmail,
  memberEmailByUserId,
}: {
  memberUserId: string;
  actorUserIdAliases?: readonly string[];
  actorEmail?: string;
  memberEmailByUserId?: Readonly<Record<string, string | undefined>>;
}): string {
  const actorAliases = Array.isArray(actorUserIdAliases)
    ? actorUserIdAliases
    : [];
  if (
    actorEmail &&
    actorAliases.some((alias) => alias === memberUserId)
  ) {
    return actorEmail;
  }
  const inviteEmail = normalizeDisplayText(memberEmailByUserId?.[memberUserId]);
  return inviteEmail ?? '';
}
