import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import QRCodeBase, { type QRCodeProps } from "react-qr-code";

export const QRCode = forwardRef<QRCodeBase, QRCodeProps>(
    ({ className, ...props }) => (
        <QRCodeBase {...props} className={cn(
            "border-4 rounded-2xl p-4",
            className,
        )} />
    )
)