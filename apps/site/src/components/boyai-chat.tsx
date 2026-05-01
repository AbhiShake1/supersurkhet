import React, { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { gun } from '@/lib/gun';
import SEA from 'gun/sea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { executeBoyaiPrompt } from '@/server-functions/ai-proxy';
import { toast } from 'sonner';

export function BoyaiChat() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const submitMessage = async () => {
    if (!prompt.trim() || !user || isLoading) return;

    const userMessage = prompt.trim();
    setPrompt('');
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      // @ts-expect-error - Gun internal type
      const userSeaPair = gun.user()._.sea;
      if (!userSeaPair) {
        throw new Error('User SEA pair not available. Please login.');
      }

      console.log("TEST_REGION - Reading from Path:", "user().get('boyai_config').get('llm_api_key')");
      // Retrieve encrypted API key
      const encryptedKey = await new Promise<string>((resolve, reject) => {
        let isResolved = false;
        
        const timeout = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            reject(new Error('Timeout retrieving API Key. Please ensure you are logged in and have saved a key.'));
          }
        }, 5000);

        gun.user().get('boyai_config').get('llm_api_key').once((data) => {
          if (isResolved) return;
          isResolved = true;
          clearTimeout(timeout);
          if (!data) reject(new Error('No API Key found. Please save it in settings first.'));
          else resolve(data as string);
        });
      });

      console.log("TEST_REGION - Fetched encrypted raw:", typeof encryptedKey === 'string' ? encryptedKey.substring(0, 50) + '...' : encryptedKey);
      console.log("TEST_REGION - Decrypting with SEA Pub:", userSeaPair.pub);

      // Decrypt in memory
      const rawKey = await SEA.decrypt(encryptedKey, userSeaPair);
      if (rawKey === undefined || rawKey === null) {
        throw new Error("DIAGNOSTIC_FAILURE: Decryption resulted in null. SEA pair mismatch or corrupted data.");
      }
      if (!rawKey) {
        throw new Error('Failed to decrypt API key. Your session may be invalid.');
      }

      const requestHeaders = { 'X-Boyai-Key': rawKey };
      console.log("NETWORK_REGION - Sending Headers:", Object.keys(requestHeaders));

      // Execute server function directly passing apiKey
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (executeBoyaiPrompt as any)({
        data: { prompt: userMessage, apiKey: rawKey }
      });

      setMessages((prev) => [...prev, { role: 'ai', text: result.text }]);
    } catch (error) {
      console.log("NETWORK_REGION - Diagnostic Server Error Caught:", error);
      console.error(error);
      const errorMsg = error instanceof Error ? error.message : 'An error occurred';
      toast.error(errorMsg);
      setMessages((prev) => [...prev, { role: 'ai', text: `Error: ${errorMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage();
  };

  return (
    <div className="flex flex-col h-[500px] border rounded-xl bg-background max-w-2xl">
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground mt-10">
            Send a message to start chatting with your Bring Your Own AI.
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg max-w-[80%] ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-auto'
                  : 'bg-muted text-foreground mr-auto'
              }`}
            >
              {msg.text}
            </div>
          ))
        )}
        {isLoading && (
          <div className="bg-muted text-foreground p-3 rounded-lg w-fit">
            Thinking...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submitMessage();
            }
          }}
          placeholder="Ask me anything..."
          disabled={isLoading || !user}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading || !user || !prompt.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
