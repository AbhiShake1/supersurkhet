import { describe, expect, it } from 'vitest';
import {
  resolveActorDisplayName,
  resolveProjectMemberEmailDisplay,
  resolveProjectMemberDisplayName,
} from './-plugin-studio-member-display';

describe('plugin studio member display helpers', () => {
  it('prefers actor name from auth profile', () => {
    expect(
      resolveActorDisplayName({
        name: 'Abhi Dev',
        email: 'abhi@example.com',
      }),
    ).toBe('Abhi Dev');
  });

  it('falls back to email local-part when no profile name is available', () => {
    expect(
      resolveActorDisplayName({
        email: 'owner@company.com',
      }),
    ).toBe('owner');
  });

  it('shows actor display name in member rows when ids match aliases', () => {
    expect(
      resolveProjectMemberDisplayName({
        memberUserId: 'eTP5tiSuKUxZBthmH5GgJjTMeXVRIbKjPEoZ8qn40ki',
        actorUserIdAliases: [
          'eTP5tiSuKUxZBthmH5GgJjTMeXVRIbKjPEoZ8qn40ki',
          'pub/eTP5tiSuKUxZBthmH5GgJjTMeXVRIbKjPEoZ8qn40ki',
        ],
        actorDisplayName: 'Abhi Dev',
      }),
    ).toBe('Abhi Dev');
  });

  it('falls back to raw member id when no matching actor profile name exists', () => {
    expect(
      resolveProjectMemberDisplayName({
        memberUserId: 'member/other-user',
        actorUserIdAliases: ['member/current-user'],
        actorDisplayName: 'Abhi Dev',
      }),
    ).toBe('member/other-user');
  });

  it('falls back safely when actor aliases are missing', () => {
    expect(
      resolveProjectMemberDisplayName({
        memberUserId: 'member/other-user',
        actorUserIdAliases: undefined as unknown as readonly string[],
        actorDisplayName: 'Abhi Dev',
      }),
    ).toBe('member/other-user');
  });

  it('shows actor email for matching member id alias', () => {
    expect(
      resolveProjectMemberEmailDisplay({
        memberUserId: 'pub/current-user',
        actorUserIdAliases: ['current-user', 'pub/current-user'],
        actorEmail: 'owner@company.com',
        memberEmailByUserId: {},
      }),
    ).toBe('owner@company.com');
  });

  it('returns empty string when member email cannot be resolved', () => {
    expect(
      resolveProjectMemberEmailDisplay({
        memberUserId: 'member/other-user',
        actorUserIdAliases: ['current-user'],
        actorEmail: undefined,
        memberEmailByUserId: {},
      }),
    ).toBe('');
  });
});
