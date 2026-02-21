export type InvitationRouteStatus =
  | 'loading'
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'error';

export function resolveInvitationStatus(input: {
  hasBusiness: boolean;
  invitationExists: boolean;
  hasUser: boolean;
}): InvitationRouteStatus {
  if (!input.hasBusiness) {
    return 'loading';
  }
  if (!input.hasUser) {
    return 'error';
  }
  if (!input.invitationExists) {
    return 'error';
  }
  return 'pending';
}
