import React, { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { gun } from '@/lib/gun';
import SEA from 'gun/sea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';
import { testBoyaiConnection } from '@/server-functions/ai-proxy';

export function BoyaiSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Saves the user's BYO AI API key.
   * Encrypts with SEA using the user's private key pair,
   * stores the encrypted blob in GunDB, then navigates to /playground.
   * Plain text key is never persisted — only the encrypted blob.
   */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to save an API key');
      return;
    }
    
    // @ts-expect-error - Gun internal type
    const userSeaPair = gun.user()._.sea;
    if (!userSeaPair) {
      toast.error('Could not find user SEA pair for encryption');
      return;
    }

    setIsSaving(true);
    try {
      // Test the API key first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const testResult = await (testBoyaiConnection as any)({
        data: undefined,
        headers: { 'X-Boyai-Key': apiKey }
      });

      if (!testResult?.success) {
        throw new Error('API Key validation failed. Please check your key.');
      }

      console.log("SAVE_REGION - Encrypting with SEA Pub:", userSeaPair.pub);

      // Encrypt the key
      const encrypted = await SEA.encrypt(apiKey, userSeaPair);
      
      // Save it to the user's graph
      console.log("SAVE_REGION - Writing to Path:", "user().get('boyai_config').get('llm_api_key')");
      await new Promise((resolve, reject) => {
        gun.user().get('boyai_config').get('llm_api_key').put(encrypted, (ack) => {
          // @ts-expect-error - Gun internal type
          if (ack.err) {
            // @ts-expect-error - Gun internal type
            reject(new Error(String(ack.err)));
          } else {
            resolve(ack);
          }
        });
      });

      toast.success('API Key securely saved to your private vault.');
      setApiKey('');
      
      // Redirect to the chat playground to immediately test the AI model
      navigate({ to: '/boyai-chat' as any });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error encrypting API key');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-md p-6 border rounded-xl bg-background space-y-4">
      <div>
        <h2 className="text-xl font-bold">BYO AI Vault</h2>
        <p className="text-sm text-muted-foreground">
          Store your AI API key securely. It will be encrypted locally using your private key and stored in GunDB. We never see the raw key.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="apiKey" className="text-sm font-medium">
            API Key
          </label>
          <Input
            id="apiKey"
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={isSaving || !apiKey}>
          {isSaving ? 'Saving...' : 'Save Securely'}
        </Button>
      </form>
    </div>
  );
}
