export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  className?: string;
  containerClassName?: string;
  labelClassName?: string;
  buttonClassName?: string;
}

import { CheckIcon, EyeIcon, EyeOffIcon, XIcon } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Label } from './label';

export function PasswordInput({
  label,
  description,
  className,
  containerClassName,
  labelClassName,
  buttonClassName,
  id: propId,
  ...props
}: PasswordInputProps) {
  const id = useId();
  const [password, setPassword] = useState('');
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const toggleVisibility = () => setIsVisible((prevState) => !prevState);
  const requirements = [
    { regex: /.{6,}/, text: 'At least 6 characters' },
    // { regex: /[0-9]/, text: "At least 1 number" },
    // { regex: /[a-z]/, text: "At least 1 lowercase letter" },
    // { regex: /[A-Z]/, text: "At least 1 uppercase letter" },
  ];
  const checkStrength = (pass: string) => {
    return requirements.map((req) => ({
      met: req.regex.test(pass),
      text: req.text,
    }));
  };

  const strength = checkStrength(password);

  const strengthScore = useMemo(() => {
    return strength.filter((req) => req.met).length;
  }, [strength]);

  const getStrengthColor = (score: number) => {
    const percentage = (score / requirements.length) * 100;
    if (percentage === 0) return 'bg-border';
    if (percentage <= 20) return 'bg-red-500';
    if (percentage <= 40) return 'bg-orange-500';
    if (percentage <= 60) return 'bg-amber-500';
    if (percentage <= 80) return 'bg-lime-500';
    return 'bg-emerald-500';
  };

  const getStrengthText = (score: number) => {
    const percentage = (score / requirements.length) * 100;
    if (percentage === 0) return 'Enter a password';
    if (percentage <= 20) return 'Weak password';
    if (percentage <= 40) return 'Medium password';
    return 'Strong password';
  };

  return (
    <div>
      {/* Password input field with toggle visibility button */}
      <div className="*:not-first:mt-2">
        {label && (
          <Label htmlFor={id} className={labelClassName}>
            {label}
          </Label>
        )}
        <div className="relative">
          <Input
            {...props}
            id={id}
            className={cn('pe-9', className)}
            placeholder="Password"
            type={isVisible ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              props.onChange?.(e);
            }}
            aria-describedby={`${id}-description`}
          />
          <button
            className={cn(
              'text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
              buttonClassName,
            )}
            type="button"
            onClick={toggleVisibility}
            aria-label={isVisible ? 'Hide password' : 'Show password'}
            aria-pressed={isVisible}
            aria-controls="password"
          >
            {isVisible ? (
              <EyeOffIcon size={16} aria-hidden="true" />
            ) : (
              <EyeIcon size={16} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Password strength indicator */}
      <div
        className="bg-border mt-3 mb-4 h-1 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={strengthScore}
        aria-valuemin={0}
        aria-valuemax={requirements.length}
        aria-label="Password strength"
      >
        <div
          className={`h-full ${getStrengthColor(strengthScore)} transition-all duration-500 ease-out`}
          style={{ width: `${(strengthScore / requirements.length) * 100}%` }}
        ></div>
      </div>

      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}

      {/* Password strength description */}
      <p
        id={`${id}-description`}
        className="text-foreground mb-2 text-sm font-medium"
      >
        {getStrengthText(strengthScore)}. Must contain:
      </p>

      {/* Password requirements list */}
      <ul className="space-y-1.5" aria-label="Password requirements">
        {strength.map((req, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
          <li key={index} className="flex items-center gap-2">
            {req.met ? (
              <CheckIcon
                size={16}
                className="text-emerald-500"
                aria-hidden="true"
              />
            ) : (
              <XIcon
                size={16}
                className="text-muted-foreground/80"
                aria-hidden="true"
              />
            )}
            <span
              className={`text-xs ${req.met ? 'text-emerald-600' : 'text-muted-foreground'}`}
            >
              {req.text}
              <span className="sr-only">
                {req.met ? ' - Requirement met' : ' - Requirement not met'}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
