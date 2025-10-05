import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type React from "react";

const spinnerVariants = cva("animate-spin", {
	variants: {
		size: {
			default: "h-4 w-4",
			sm: "h-3 w-3",
			lg: "h-6 w-6",
			xl: "h-8 w-8",
		},
	},
	defaultVariants: {
		size: "default",
	},
});

interface SpinnerProps
	extends React.SVGProps<SVGSVGElement>,
	VariantProps<typeof spinnerVariants> {
	className?: string;
}

export function Spinner({ size, className, ...props }: SpinnerProps) {
	return (
		<Loader2
			className={cn(spinnerVariants({ size }), className)}
			{...props}
		/>
	);
}

export { spinnerVariants };