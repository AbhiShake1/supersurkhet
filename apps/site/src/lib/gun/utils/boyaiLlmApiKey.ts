import { gun } from '@/lib/gun';
import SEA from 'gun/sea';

/**
 * Reads the encrypted BYO AI API key from the user's GunDB graph.
 * Path: user().get('boyai_config').get('llm_api_key')
 * Rejects with a timeout error if the read takes longer than timeoutMs.
 * Rejects if no key is found.
 */
export const fetchEncryptedBoyaiLlmApiKey = (timeoutMs = 5000): Promise<string> =>
  new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(
          new Error(
            'Timeout retrieving API Key. Please ensure you are logged in and have saved a key.',
          ),
        );
      }
    }, timeoutMs);

    gun
      .user()
      .get('boyai_config')
      .get('llm_api_key')
      .once((data: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (!data) {
          reject(new Error('No API Key found. Please save it in settings first.'));
        } else {
          resolve(data as string);
        }
      });
  });

/**
 * Decrypts the BYO AI API key using the user's SEA pair.
 * Throws if decryption returns null — indicates SEA pair mismatch
 * or corrupted data.
 */
export const decryptBoyaiLlmApiKey = async (
  encryptedKey: string,
  userSeaPair: Parameters<typeof SEA.decrypt>[1],
): Promise<string> => {
  const rawKey = await SEA.decrypt(encryptedKey, userSeaPair);
  if (rawKey === undefined || rawKey === null) {
    throw new Error(
      'DIAGNOSTIC_FAILURE: Decryption resulted in null. SEA pair mismatch or corrupted data.',
    );
  }
  if (!rawKey) {
    throw new Error('Failed to decrypt API key. Your session may be invalid.');
  }
  return rawKey as string;
};
