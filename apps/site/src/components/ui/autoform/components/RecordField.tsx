import type { AutoFormFieldProps } from "@autoform/react";
import type React from "react";
import { AutoForm } from "../AutoForm";

export const RecordField: React.FC<AutoFormFieldProps> = ({
	inputProps,
}) => {
	const { key, ...props } = inputProps;

	return (
		<AutoForm {...props} />
	);
};
