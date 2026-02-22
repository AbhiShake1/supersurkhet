import { describe, expect, it } from 'vitest';
import {
  buildGithubAuthorizeUrl,
  decodeGitOauthState,
  encodeGitOauthState,
} from './git-oauth';

describe('git oauth helpers', () => {
  it('builds github oauth authorize url with repo scope', () => {
    const url = buildGithubAuthorizeUrl({
      clientId: 'client_123',
      redirectUri: 'https://example.com/v1/integrations/git/oauth/callback',
      state: 'state_123',
    });

    expect(url).toContain('https://github.com/login/oauth/authorize?');
    expect(url).toContain('client_id=client_123');
    expect(url).toContain('scope=repo+read%3Aorg+read%3Auser+user%3Aemail');
    expect(url).toContain('state=state_123');
  });

  it('round-trips encoded oauth state payloads', () => {
    const encoded = encodeGitOauthState({
      state: 'abc',
      projectId: 'project.1',
      returnTo: 'https://example.com/plugin-studio/project.1',
      createdAt: 123,
    });

    const decoded = decodeGitOauthState(encoded);
    expect(decoded?.projectId).toBe('project.1');
    expect(decoded?.state).toBe('abc');
  });
});
