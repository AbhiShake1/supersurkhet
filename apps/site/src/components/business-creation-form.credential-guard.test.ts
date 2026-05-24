import { describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Replicate the exact guard logic from saveProviderCredentialIfReady inside
// BusinessOnboardingAssistantForm. Tested here as a pure function so we can
// cover all branches without rendering the full component.
// ---------------------------------------------------------------------------

type AuthMode = 'api-key' | 'oauth-access-token' | 'aws-credential-chain' | 'none';

type Payload = {
  authMode: AuthMode;
  apiKey?: string;
  oauthAccessToken?: string;
};

async function saveProviderCredentialIfReady(
  payload: Payload,
  save: () => Promise<void>,
) {
  if (payload.authMode === 'api-key' && !payload.apiKey) return;
  if (payload.authMode === 'oauth-access-token' && !payload.oauthAccessToken) return;
  await save();
}

describe('saveProviderCredentialIfReady', () => {
  it('skips save when authMode is api-key and apiKey is empty string', async () => {
    const save = vi.fn();
    await saveProviderCredentialIfReady({ authMode: 'api-key', apiKey: '' }, save);
    expect(save).not.toHaveBeenCalled();
  });

  it('skips save when authMode is api-key and apiKey is undefined', async () => {
    const save = vi.fn();
    await saveProviderCredentialIfReady({ authMode: 'api-key' }, save);
    expect(save).not.toHaveBeenCalled();
  });

  it('calls save when authMode is api-key and apiKey is present', async () => {
    const save = vi.fn();
    await saveProviderCredentialIfReady(
      { authMode: 'api-key', apiKey: 'sk-test-key' },
      save,
    );
    expect(save).toHaveBeenCalledOnce();
  });

  it('skips save when authMode is oauth-access-token and token is undefined', async () => {
    const save = vi.fn();
    await saveProviderCredentialIfReady(
      { authMode: 'oauth-access-token' },
      save,
    );
    expect(save).not.toHaveBeenCalled();
  });

  it('skips save when authMode is oauth-access-token and token is empty string', async () => {
    const save = vi.fn();
    await saveProviderCredentialIfReady(
      { authMode: 'oauth-access-token', oauthAccessToken: '' },
      save,
    );
    expect(save).not.toHaveBeenCalled();
  });

  it('calls save when authMode is oauth-access-token and token is present', async () => {
    const save = vi.fn();
    await saveProviderCredentialIfReady(
      { authMode: 'oauth-access-token', oauthAccessToken: 'ya29.valid-token' },
      save,
    );
    expect(save).toHaveBeenCalledOnce();
  });

  it('calls save when authMode is none — no credential required', async () => {
    const save = vi.fn();
    await saveProviderCredentialIfReady({ authMode: 'none' }, save);
    expect(save).toHaveBeenCalledOnce();
  });

  it('calls save when authMode is aws-credential-chain — no key check needed', async () => {
    const save = vi.fn();
    await saveProviderCredentialIfReady(
      { authMode: 'aws-credential-chain' },
      save,
    );
    expect(save).toHaveBeenCalledOnce();
  });
});
