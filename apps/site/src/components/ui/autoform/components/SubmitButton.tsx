import type React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

export const SubmitButton: React.FC<{ children: React.ReactNode } & ButtonProps> = ({
	children,
	...props
}) => <Button {...props} type="submit">{children}</Button>;
