import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { type HTMLAttributes, createContext, useContext } from "react";

const InputGroupContext = createContext<{ size?: string }>({});

const inputGroupVariants = {
	root: "flex items-center border border-input rounded-lg focus-within:ring-2 focus-within:ring-ring focus-within:border-ring",
	field: "flex-1 min-w-0 border-0 p-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0",
	separator: "mx-2 my-1 bg-muted w-px h-4/5",
};

interface InputGroupProps
	extends HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof inputGroupVariants> {
	className?: string;
}

const InputGroup = ({ className, children, ...props }: InputGroupProps) => {
	return (
		<div
			className={cn(inputGroupVariants.root, className)}
			{...props}
		>
			<InputGroupContext.Provider value={{}}>
				{children}
			</InputGroupContext.Provider>
		</div>
	);
};

interface InputGroupFieldProps extends HTMLAttributes<HTMLInputElement> {
	className?: string;
}

const InputGroupField = ({ className, ...props }: InputGroupFieldProps) => {
	const { size } = useContext(InputGroupContext);
	return (
		<input
			className={cn(inputGroupVariants.field, className)}
			{...props}
		/>
	);
};

interface InputGroupSeparatorProps extends HTMLAttributes<HTMLDivElement> {
	className?: string;
}

const InputGroupSeparator = ({ className, ...props }: InputGroupSeparatorProps) => {
	return (
		<div
			className={cn(inputGroupVariants.separator, className)}
			{...props}
		/>
	);
};

export { InputGroup, InputGroupField, InputGroupSeparator };