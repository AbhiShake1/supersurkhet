import { describe, expect, it } from 'vitest';
import { resolveInvitationStatus } from '../$businessName/admin/-invitation-state';

describe('invitation state resolver', () => {
  it('moves from loading to pending when invitation token exists', () => {
    const status = resolveInvitationStatus({
      hasBusiness: true,
      invitationExists: true,
      hasUser: true,
    });

    expect(status).toBe('pending');
  });

  it('returns error when invitation token is missing', () => {
    const status = resolveInvitationStatus({
      hasBusiness: true,
      invitationExists: false,
      hasUser: true,
    });

    expect(status).toBe('error');
  });
});
