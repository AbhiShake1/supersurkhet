import { describe, expect, it } from 'vitest';
import { hasBusinessAccess } from './business-access';

describe('hasBusinessAccess', () => {
  it('allows platform admins', () => {
    expect(
      hasBusinessAccess(
        {
          id: 'biz-1',
          name: 'Biz',
          created_by: 'owner-1',
        } as never,
        { role: 'admin' },
      ),
    ).toBe(true);
  });

  it('allows business owner', () => {
    expect(
      hasBusinessAccess(
        {
          id: 'biz-1',
          name: 'Biz',
          created_by: 'owner-1',
        } as never,
        { role: 'user', _: { soul: 'owner-1' } },
      ),
    ).toBe(true);
  });

  it('allows business member', () => {
    expect(
      hasBusinessAccess(
        {
          id: 'biz-1',
          name: 'Biz',
          created_by: 'owner-1',
          members: {
            'member-1': {
              role: 'staff',
              userId: 'member-1',
            },
          },
        } as never,
        { role: 'user', _: { soul: 'member-1' } },
      ),
    ).toBe(true);
  });

  it('denies unrelated authenticated user', () => {
    expect(
      hasBusinessAccess(
        {
          id: 'biz-1',
          name: 'Biz',
          created_by: 'owner-1',
          members: {
            'member-1': {
              role: 'staff',
              userId: 'member-1',
            },
          },
        } as never,
        { role: 'user', _: { soul: 'outsider-1' } },
      ),
    ).toBe(false);
  });

  it('denies missing user', () => {
    expect(
      hasBusinessAccess(
        {
          id: 'biz-1',
          name: 'Biz',
          created_by: 'owner-1',
        } as never,
        null,
      ),
    ).toBe(false);
  });
});
