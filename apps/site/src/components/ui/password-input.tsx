import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Label } from "./label";

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

export function PasswordInput({
	label,
	description,
	error,
	className,
	containerClassName,
	labelClassName,
	buttonClassName,
	id: propId,
	...props
}: PasswordInputProps) {
	const fallbackId = useId();
	const id = propId ?? fallbackId;
	const [isVisible, setIsVisible] = useState<boolean>(false);

	const toggleVisibility = () => setIsVisible((prevState) => !prevState);

	return (
		<div className={cn("space-y-2", containerClassName)}>
			{label && (
				<Label htmlFor={id} className={cn("block text-sm", labelClassName)}>
					{label}
				</Label>
			)}
			<div className="relative">
				<Input
					id={id}
					className={cn("pe-9", className)}
					type={isVisible ? "text" : "password"}
					{...props}
				/>
				<button
					className={cn(
						"absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
						buttonClassName,
					)}
					type="button"
					onClick={toggleVisibility}
					aria-label={isVisible ? "Hide password" : "Show password"}
					aria-pressed={isVisible}
					aria-controls={id}
				>
					{isVisible ? (
						<EyeOff size={16} strokeWidth={2} aria-hidden="true" />
					) : (
						<Eye size={16} strokeWidth={2} aria-hidden="true" />
					)}
				</button>
			</div>
			{description && (
				<p className="text-muted-foreground text-sm">{description}</p>
			)}
			{error && <p className="text-destructive text-sm">{error}</p>}
		</div>
	);
}
