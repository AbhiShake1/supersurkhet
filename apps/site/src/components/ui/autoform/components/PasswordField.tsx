import type { AutoFormFieldProps } from "@autoform/react";
import type React from "react";
import { PasswordInput } from "../../password-input";

export const PasswordField: React.FC<AutoFormFieldProps> = ({ inputProps, id, error }) => {
	const { key, ...props } = inputProps;

	return (
		<PasswordInput
			id={id}
			className={error ? "border-destructive" : ""}
			{...props}
		/>
	);
};
