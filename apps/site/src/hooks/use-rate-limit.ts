import { useQuery } from '@tanstack/react-query';

// Rate limiting functions
const getEmailRateLimitKey = (email: string) =>
  `otp_rate_limit_${email.toLowerCase()}`;

export const checkRateLimit = (
  email: string,
): { allowed: boolean; timeLeft: number } => {
  const key = getEmailRateLimitKey(email);
  const stored = localStorage.getItem(key);
  if (!stored) {
    return { allowed: true, timeLeft: 0 };
  }

  const { lastSent, attempts } = JSON.parse(stored);
  const now = Date.now();
  const baseDelay = 30 * 1000; // 30 seconds base delay
  const exponentialDelay = baseDelay * 2 ** (attempts - 1); // 30s, 60s, 120s, etc.
  const nextAllowedTime = lastSent + exponentialDelay;
  const timeLeft = nextAllowedTime - now;

  return {
    allowed: timeLeft <= 0,
    timeLeft: Math.max(0, timeLeft),
  };
};

export const updateRateLimit = (email: string) => {
  const key = getEmailRateLimitKey(email);
  const stored = localStorage.getItem(key);
  const now = Date.now();
  let attempts = 1;

  if (stored) {
    const { lastSent: _, ...data } = JSON.parse(stored);
    attempts = data.attempts + 1;
  }

  localStorage.setItem(
    key,
    JSON.stringify({
      lastSent: now,
      attempts,
    }),
  );
};

export const clearRateLimit = (email: string) => {
  const key = getEmailRateLimitKey(email);
  localStorage.removeItem(key);
};

export const useRateLimit = (email: string) => {
  return useQuery({
    queryKey: ['rate-limit', email],
    queryFn: () => {
      const rateLimitResult = checkRateLimit(email);
      return {
        ...rateLimitResult,
        secondsLeft: Math.ceil(rateLimitResult.timeLeft / 1000),
      };
    },
    refetchInterval: 1000, // Refetch every second
    refetchIntervalInBackground: true,
    enabled: !!email,
  });
};
