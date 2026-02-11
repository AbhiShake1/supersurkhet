import { Logo } from '@/components/logo';
import { AutoForm, fieldConfig } from '@/components/ui/autoform';
import { SubmitButton } from '@/components/ui/autoform/components/SubmitButton';
import { Button } from '@/components/ui/button';
import { googleLogin } from '@/lib/auth';
import { gun } from '@/lib/gun';
import { pixelArt } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import { useGoogleLogin } from '@react-oauth/google';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth, type AuthUser } from './auth-provider';
import { cn } from '@/lib/utils';
import { sendMail } from '@/emails/send-mail';
import AccountVerifyEmail from '@/emails/account-verify';
import { render } from '@react-email/render';
import { getGunRef, mergeKeys } from '@/lib/gun/utils';
import type { OTP } from '@/lib/schema';
import { generateId } from '@/lib/id';
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaHeader,
  CredenzaTitle,
} from './ui/credenza';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';
import { Loader2 } from 'lucide-react';
import { ResendCountdown } from './resend-countdown';
import {
  checkRateLimit,
  clearRateLimit,
  updateRateLimit,
} from '@/hooks/use-rate-limit';
import { setUser } from '@/server-functions/user';

const loginSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(6)
    .superRefine(fieldConfig({ fieldType: 'password' })),
});

const signupSchema = z
  .object({
    email: z.string().email(),
    password: z
      .string()
      .min(6)
      .superRefine(fieldConfig({ fieldType: 'password' })),
    confirmPassword: z
      .string()
      .superRefine(fieldConfig({ fieldType: 'password' })),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

interface AuthFormProps extends React.ComponentProps<'div'> {
  mode: 'login' | 'signup';
  onModeChange: (mode: 'login' | 'signup') => void;
  onAuthSuccess?: (user: any) => void; // Callback for successful authentication
  onAuthError?: (error: Error) => void; // Callback for authentication errors
  headerProps?: React.ComponentProps<'div'>;
  headerWrapperProps?: React.ComponentProps<'div'>;
}

function verifyOTP({
  data: { otp, userId },
}: {
  data: { otp: string; userId: string };
}) {
  const otpKey = mergeKeys('otp', userId);
  return new Promise((resolve, reject) => {
    getGunRef(otpKey)
      .not(() => {
        console.log(otpKey, 'doesnt exist');
        reject(new Error('OTP expired'));
      })
      .once(async (otpData: unknown) => {
        const { otp: otpInDb, _ } = otpData as OTP;
        const createdAtValue = _?.['>']?.otp;
        if (otpInDb === otp && createdAtValue != null) {
          const createdAt = new Date(createdAtValue);
          const wasCreatedWithinLast10Minutes =
            Date.now() - createdAt.getTime() < 10 * 60 * 1000;
          if (!wasCreatedWithinLast10Minutes) {
            reject(new Error('OTP expired'));
          }
          resolve(otpData);
        } else {
          reject(new Error('Invalid OTP'));
        }
      });
  });
}

function createOTP({ data: { userId } }: { data: { userId: string } }) {
  const otpKey = mergeKeys('otp', userId);
  const otp = generateId({ length: 6 }).toLowerCase();
  getGunRef(otpKey).put({
    otp,
  });

  return otp;
}

export function AuthForm({
  mode,
  onModeChange,
  onAuthSuccess,
  onAuthError,
  className,
  headerProps,
  headerWrapperProps,
  ...props
}: AuthFormProps) {
  const isSignup = mode === 'signup';
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [signupData, setSignupData] = useState<z.infer<
    typeof signupSchema
  > | null>(null);

  // Resend OTP functionality
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const { refreshUser } = useAuth();

  const { linkAnonymousUser } = useAuth();
  const isAuthUser = (value: unknown): value is AuthUser =>
    !!value && typeof value === 'object';

  const signupMutation = useMutation({
    mutationFn: async ({ email, password }: z.infer<typeof signupSchema>) => {
      // Check rate limit
      const rateLimitResult = checkRateLimit(email);
      if (!rateLimitResult.allowed) {
        const secondsLeft = Math.ceil(rateLimitResult.timeLeft / 1000);
        throw new Error(`RATE_LIMIT:${secondsLeft}`);
      }

      const alias = email?.toLowerCase();
      const userExists = await new Promise((resolve) => {
        gun.get(`~@${alias}`).once((data) => resolve(!!data));
      });
      if (userExists) {
        throw new Error('This email is already registered');
      }

      const otp = createOTP({ data: { userId: alias } });

      // Send verification email
      await sendMail({
        data: {
          from: 'SuperSurkhet <onboarding@surkhet.app>',
          to: email,
          subject: 'SuperSurkhet Email Verification',
          html: await render(<AccountVerifyEmail verificationCode={otp} />),
        },
      });

      // Update rate limit
      updateRateLimit(email);

      // Store signup data and show OTP modal
      setSignupData({ email, password, confirmPassword: password });
      setShowOTPModal(true);
    },
    onSuccess: () => {
      setError('');
    },
    onError: (err) => {
      // Only show non-rate limit errors as regular errors
      if (!err.message.startsWith('RATE_LIMIT:')) {
        setError(err.message);
        onAuthError?.(err);
      }
      if (err.message.startsWith('RATE_LIMIT:')) {
        const seconds = err.message.split(':')[1];
        toast.error(
          `Please wait ${seconds} seconds before requesting another verification email.`,
        );
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: z.infer<typeof loginSchema>) => {
      const alias = email?.toLowerCase();
      return new Promise((resolve, reject) => {
        gun.user().auth(alias, password, (ack) => {
          if ('err' in ack && ack.err) return reject(new Error(ack.err));
          if ('sea' in ack) {
            setUser({ data: ack.sea });
          }
          resolve(gun.user().is); // Return the authenticated user object
        });
      });
    },
    onSuccess: async (user) => {
      // Link anonymous user data to the existing account if exists
      if (isAuthUser(user)) {
        // The user object from GunDB authentication will be passed to linkAnonymousUser
        await linkAnonymousUser(user);
      }
      refreshUser();
      onAuthSuccess?.(user);
    },
    onError: (err) => {
      setError(err.message);
      onAuthError?.(err);
    },
  });

  const googleLoginMutation = useMutation({
    mutationFn: googleLogin,
    onSuccess: async (user, variables) => {
      // Check for desktop redirect target
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('target') === 'desktop' && user) {
        const data = encodeURIComponent(JSON.stringify(user));
        window.location.href = `supersurkhet://auth?data=${data}`;
        // Don't proceed with normal flow to avoid double handling
        return;
      }

      // Link anonymous user data to the Google account if exists
      if (user) {
        // The user object from googleLogin will be passed to linkAnonymousUser
        const mergedUser = { ...variables, ...user };
        if (isAuthUser(mergedUser)) {
          await linkAnonymousUser(mergedUser);
        }
      }
      refreshUser();
      onAuthSuccess?.(user);
    },
    onError: (err) => {
      setError(err.message);
      onAuthError?.(err);
    },
  });

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      const res = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${codeResponse.access_token}`,
      );
      const data = await res.json();
      googleLoginMutation.mutate({
        email: data.email,
        name: data.name,
        avatar: data.picture,
      });
    },
    onError: () => {
      toast.error('Login Failed');
    },
  });

  const handleGoogleClick = () => {
    // Detect Electron via UserAgent (set in main.ts)
    const isDesktop =
      typeof navigator !== 'undefined' &&
      navigator.userAgent.includes('SuperSurkhetDesktop');

    if (isDesktop) {
      // Open in system browser
      window.open(
        `${window.location.origin}/login?target=desktop&open_external=true`,
        '_blank',
      );
      return;
    }

    loginWithGoogle();
  };

  // Resend OTP mutation
  const resendOtpMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const rateLimitResult = checkRateLimit(email);
      if (!rateLimitResult.allowed) {
        const secondsLeft = Math.ceil(rateLimitResult.timeLeft / 1000);
        throw new Error(`RATE_LIMIT:${secondsLeft}`);
      }

      const alias = email.toLowerCase();
      const otp = createOTP({ data: { userId: alias } });

      // Send verification email
      await sendMail({
        data: {
          from: 'SuperSurkhet <onboarding@surkhet.app>',
          to: email,
          subject: 'SuperSurkhet Email Verification',
          html: await render(<AccountVerifyEmail verificationCode={otp} />),
        },
      });

      // Update rate limit
      updateRateLimit(email);

      return otp;
    },
    onSuccess: () => {
      setError('');
      toast.success('Verification email sent successfully!');
    },
    onError: (err) => {
      // Only show non-rate limit errors as regular errors
      if (!err.message.startsWith('RATE_LIMIT:')) {
        setError(err.message);
      }
      if (err.message.startsWith('RATE_LIMIT:')) {
        const seconds = err.message.split(':')[1];
        toast.error(
          `Please wait ${seconds} seconds before requesting another verification email.`,
        );
      }
    },
  });

  // Handle resend cooldown
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendCooldown]);

  // OTP verification mutation
  const verifyOtpMutation = useMutation({
    mutationFn: async ({ otp }: { otp: string }) => {
      if (!signupData) throw new Error('No signup data available');
      const alias = signupData.email.toLowerCase();

      await verifyOTP({ data: { otp, userId: alias } });

      // Create the actual user account after OTP verification
      return new Promise((resolve, reject) => {
        gun.user().create(alias, signupData.password, (ack) => {
          if ('err' in ack) return reject(new Error(ack.err));

          const userProfile = {
            email: alias,
            role: 'user',
            isActive: true,
            avatar: createAvatar(pixelArt).toDataUri(),
            phone: '',
            permissions: {},
          };
          getGunRef(mergeKeys('user')).get(ack.pub).put(userProfile);
          resolve(ack);
        });
      });
    },
    onSuccess: async (ack) => {
      // Link anonymous user data to the new account if exists
      // The user object from GunDB will be passed to linkAnonymousUser
      if (isAuthUser(ack)) {
        await linkAnonymousUser(ack);
      }
      refreshUser();
      setError('');
      setShowOTPModal(false);
      setSignupData(null);

      // Clear rate limit after successful verification
      if (signupData) {
        clearRateLimit(signupData.email);
      }

      onModeChange('login');
      toast.success('Account created successfully!');
    },
    onError: (err) => {
      setError(err.message);
      onAuthError?.(err);
    },
  });

  return (
    <div
      className={cn(
        'bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+.125rem)] border px-4 shadow-md dark:[--color-muted:var(--color-zinc-900)]',
        className,
      )}
      {...props}
    >
      <div
        {...headerWrapperProps}
        className={cn('p-8 pb-6', headerWrapperProps?.className)}
      >
        <div {...headerProps} className={cn(headerProps?.className)}>
          <a href="/" aria-label="go home">
            <Logo />
          </a>
          <h1 className="mb-1 mt-4 text-xl font-semibold">
            {isSignup ? 'Create your account' : 'Sign In to Surkhet'}
          </h1>
          <p className="text-sm">
            {isSignup
              ? 'Get started with your free account'
              : 'Welcome back! Sign in to continue'}
          </p>
        </div>
        <hr className="my-4 border-dashed" />
        {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      </div>
      <div className="grid gap-6">
        <div className="flex flex-col gap-4">
          {
            // <Button variant="outline" className="w-full">
            //   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4 mr-2">
            //     <path
            //       d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
            //       fill="currentColor"
            //     />
            //   </svg>
            //   Login with Apple
            // </Button>
          }
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleClick}
            loading={googleLoginMutation.isPending}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="size-4 mr-2"
            >
              <path
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                fill="currentColor"
              />
            </svg>
            Login with Google
          </Button>
        </div>
        <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          <span className="bg-card text-muted-foreground relative z-10 px-2">
            Or continue with
          </span>
        </div>
        {isSignup ? (
          <AutoForm
            schema={signupSchema}
            onSubmit={(v) => {
              // Create OTP and send email instead of directly creating account
              signupMutation.mutate(v);
            }}
          >
            <SubmitButton className="w-full" loading={signupMutation.isPending}>
              Send Verification OTP Email
            </SubmitButton>
            <p className="text-accent-foreground text-center text-sm pb-2">
              Already have an account?
              <Button
                variant="link"
                className="px-2"
                onClick={() => {
                  setError('');
                  onModeChange('login');
                }}
              >
                Sign in
              </Button>
            </p>
          </AutoForm>
        ) : (
          <AutoForm
            schema={loginSchema}
            onSubmit={(v) => loginMutation.mutate(v)}
          >
            <SubmitButton className="w-full" loading={loginMutation.isPending}>
              Sign In
            </SubmitButton>
            <p className="text-accent-foreground text-center text-sm pb-2">
              Don't have an account yet?
              <Button asChild variant="link" className="px-2">
                <a
                  onClick={() => {
                    setError('');
                    onModeChange('signup');
                  }}
                >
                  Create account
                </a>
              </Button>
            </p>
          </AutoForm>
        )}
      </div>

      {/* OTP Verification Modal */}
      <Credenza open={showOTPModal} onOpenChange={setShowOTPModal}>
        <CredenzaContent>
          <CredenzaHeader>
            <CredenzaTitle>Email Verification</CredenzaTitle>
          </CredenzaHeader>
          <CredenzaBody>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Please enter the 6-digit code sent to your email address
              </p>

              <div className="flex justify-center">
                <InputOTP
                  value={otp}
                  onChange={setOtp}
                  maxLength={6}
                  onComplete={(value) => {
                    if (signupData) {
                      verifyOtpMutation.mutate({ otp: value });
                    }
                  }}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {verifyOtpMutation.isError && (
                <div className="text-red-500 text-sm">
                  {verifyOtpMutation.error.message}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setShowOTPModal(false)}
                    disabled={
                      verifyOtpMutation.isPending || resendOtpMutation.isPending
                    }
                  >
                    Cancel
                  </Button>

                  <Button
                    onClick={() => {
                      if (signupData) {
                        verifyOtpMutation.mutate({ otp });
                      }
                    }}
                    disabled={verifyOtpMutation.isPending}
                  >
                    {verifyOtpMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify OTP'
                    )}
                  </Button>
                </div>

                {signupData && (
                  <>
                    <ResendCountdown
                      email={signupData.email}
                      onCountdownComplete={() => setResendCooldown(0)}
                    />

                    {resendCooldown <= 0 &&
                      !(resendOtpMutation.isPending || isResending) && (
                        <div className="text-center text-sm text-muted-foreground mt-2">
                          Didn't receive a code?{' '}
                          <Button
                            variant="link"
                            className="px-1 text-muted-foreground underline"
                            onClick={async () => {
                              // Check if we're still under rate limit before attempting to resend
                              const rateLimitResult = checkRateLimit(
                                signupData.email,
                              );
                              if (!rateLimitResult.allowed) {
                                const secondsLeft = Math.ceil(
                                  rateLimitResult.timeLeft / 1000,
                                );
                                toast.error(
                                  `Please wait ${secondsLeft} seconds before requesting another email`,
                                );
                                return;
                              }

                              setIsResending(true);
                              try {
                                await resendOtpMutation.mutateAsync({
                                  email: signupData.email,
                                });

                                // The countdown is now handled by the ResendCountdown component
                              } catch (error) {
                                // Error is already handled in onError
                              } finally {
                                setIsResending(false);
                              }
                            }}
                            disabled={resendOtpMutation.isPending}
                          >
                            {resendOtpMutation.isPending || isResending ? (
                              <>
                                <Loader2 className="mr-2 h-3 w-3 animate-spin inline" />
                                Resending...
                              </>
                            ) : (
                              'Resend'
                            )}
                          </Button>
                        </div>
                      )}
                  </>
                )}
              </div>
            </div>
          </CredenzaBody>
        </CredenzaContent>
      </Credenza>
    </div>
  );
}
