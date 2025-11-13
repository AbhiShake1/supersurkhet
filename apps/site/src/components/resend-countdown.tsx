import { useEffect } from "react";
import { useRateLimit } from "../hooks/use-rate-limit";

interface ResendCountdownProps {
  email: string;
  onCountdownComplete?: () => void;
}

export function ResendCountdown({ email, onCountdownComplete }: ResendCountdownProps) {
  const { data: rateLimitStatus, isLoading } = useRateLimit(email);

  useEffect(() => {
    if (rateLimitStatus && rateLimitStatus.secondsLeft === 0 && onCountdownComplete) {
      onCountdownComplete();
    }
  }, [rateLimitStatus, onCountdownComplete]);

  if (isLoading || !rateLimitStatus || rateLimitStatus.secondsLeft <= 0) {
    return null;
  }

  return (
    <div className="text-red-500 text-sm">
      Please wait {rateLimitStatus.secondsLeft} seconds before requesting another verification email.
    </div>
  );
}