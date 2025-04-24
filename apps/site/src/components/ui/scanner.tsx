import { cn } from "@/lib/utils";
import {
	Scanner as BaseScanner,
	type IScannerProps,
} from "@yudiel/react-qr-scanner";

export type ScannerProps = Pick<
	IScannerProps,
	"allowMultiple" | "formats" | "onScan" | "onError" | "children" | "scanDelay"
> &
	React.ComponentProps<"div">;
export function Scanner({ className, ...props }: ScannerProps) {
	return (
		<div className={cn("", className)} {...props}>
			<BaseScanner allowMultiple {...props} />
		</div>
	);
}
