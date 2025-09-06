import { cn } from "@/lib/utils";

export const Logo = ({ className }: { className?: string }) => {
	return <img src="/icon.png" alt="logo" className={cn("size-16", className)} />;
};

export const LogoStroke = (props: { className?: string }) => {
	return <Logo {...props} />;
};
