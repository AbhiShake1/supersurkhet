import {
  type ComponentRef,
  type FormEvent,
  useReducer,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { MessageResponse } from '@/components/ai-elements/message';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { gun } from '@/lib/gun';
import {
  decryptBoyaiLlmApiKey,
  fetchEncryptedBoyaiLlmApiKey,
} from '@/lib/gun/utils/boyaiLlmApiKey';
import { getUnknownErrorMessage } from '@/lib/utils';
import { executeBoyaiPrompt } from '@/server-functions/ai-proxy';

export function BoyaiChat() {
  const { user } = useAuth();
  const promptRef = useRef<ComponentRef<'input'>>(null);
  const [, bumpInput] = useReducer((x: number) => x + 1, 0);
  const [messages, setMessages] = useState<
    { id: number; role: 'user' | 'ai'; text: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const nextMessageIdRef = useRef(1);

  const pushMessage = (entry: { role: 'user' | 'ai'; text: string }) => {
    const id = nextMessageIdRef.current++;
    setMessages((prev) => [...prev, { ...entry, id }]);
  };

  const submitMessage = async (): Promise<void> => {
    const promptValue = promptRef.current?.value ?? '';
    if (!promptValue.trim() || !user || isLoading) return;

    const userMessage = promptValue.trim();
    if (promptRef.current) promptRef.current.value = '';
    bumpInput();
    pushMessage({ role: 'user', text: userMessage });
    setIsLoading(true);

    try {
      // @ts-expect-error - Gun internal type
      const userSeaPair = gun.user()._.sea;
      if (!userSeaPair) {
        throw new Error('User SEA pair not available. Please login.');
      }

      console.log(
        'TEST_REGION - Reading from Path:',
        "user().get('boyai_config').get('llm_api_key')",
      );
      const encryptedKey = await fetchEncryptedBoyaiLlmApiKey();

      console.log(
        'TEST_REGION - Fetched encrypted raw:',
        typeof encryptedKey === 'string'
          ? `${encryptedKey.substring(0, 50)}...`
          : encryptedKey,
      );
      console.log('TEST_REGION - Decrypting with SEA Pub:', userSeaPair.pub);

      const rawKey = await decryptBoyaiLlmApiKey(encryptedKey, userSeaPair);

      const requestHeaders = { 'X-Boyai-Key': rawKey };
      console.log(
        'NETWORK_REGION - Sending Headers:',
        Object.keys(requestHeaders),
      );

      const result = await executeBoyaiPrompt({
        data: { prompt: userMessage, apiKey: rawKey },
      });

      pushMessage({ role: 'ai', text: result.text });
    } catch (error) {
      console.log('NETWORK_REGION - Diagnostic Server Error Caught:', error);
      console.error(error);
      const errorMsg = getUnknownErrorMessage(error);
      toast.error(errorMsg);
      pushMessage({ role: 'ai', text: `Error: ${errorMsg}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submitMessage();
  };

  const promptTrimmed = (promptRef.current?.value ?? '').trim();

  return (
    <div className="flex flex-col h-[500px] border rounded-xl bg-background max-w-2xl">
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground mt-10">
            Send a message to start chatting with your Bring Your Own AI.
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded-lg max-w-[80%] ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-auto'
                  : 'bg-muted text-foreground mr-auto'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap break-words text-left">
                  {msg.text}
                </p>
              ) : (
                <MessageResponse className="text-left">
                  {msg.text}
                </MessageResponse>
              )}
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
          ref={promptRef}
          onChange={() => bumpInput()}
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
        <Button type="submit" disabled={isLoading || !user || !promptTrimmed}>
          Send
        </Button>
      </form>
    </div>
  );
}
