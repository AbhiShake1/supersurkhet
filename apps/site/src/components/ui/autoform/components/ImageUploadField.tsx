import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useImageUpload,
  type UseImageUploadProps,
} from "@/hooks/use-image-upload";
import { cn } from "@/lib/utils";
import type { AutoFormFieldProps } from "../react";
import { TooltipTrigger } from "@radix-ui/react-tooltip";
import { Trash2, Upload, X } from "lucide-react";
import type React from "react";
import { useCallback, useState, type ComponentProps } from "react";
import { Tooltip, TooltipContent } from "../../tooltip";
import { useFormContext } from "react-hook-form";

export const ImageUploadField: React.FC<AutoFormFieldProps> = ({
  inputProps,
  error,
  id,
  path,
  field,
  value,
}) => {
  const { control } = useFormContext()
  const { key, ...props } = inputProps;

  return (
    <ImageUploadItem
      id={id}
      className={error && "border-destructive"}
      control={control}
      path={path}
      defaultValue={props.defaultValue ?? value ?? field.default}
      value={value}
      {...props}
    />
  );
};

export interface ImageUploadItemProps
  extends Omit<ComponentProps<"input">, "defaultValue" | "value">,
  UseImageUploadProps,
  Pick<AutoFormFieldProps, "control" | "path"> { }

export function ImageUploadItem({
  className,
  control,
  path,
  value,
  ...props
}: ImageUploadItemProps) {
  const {
    previewUrl,
    fileName,
    fileInputRef,
    handleThumbnailClick,
    handleFileChange,
    handleRemove,
    isUploading,
  } = useImageUpload({
    defaultValue: props.defaultValue,
    value,
    onUpload() {
      control.unregister();
      control?.register(path.join("."), { shouldUnregister: true });
    },
  });

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file?.type.startsWith("image/")) {
        const fakeEvent = {
          target: {
            files: [file],
          },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileChange(fakeEvent);
      }
    },
    [handleFileChange],
  );

  return (
    <div
      className={cn(
        "w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm",
        className,
        isUploading && "opacity-70 pointer-events-none",
      )}
    >
      <div className="space-y-2">
        <h3 className="text-lg font-medium">
          {isUploading ? "Uploading..." : "Image Upload"}
        </h3>
        <p className="text-sm text-muted-foreground">
          Supported formats: JPG, PNG, GIF
        </p>
      </div>
      <input className="hidden" {...props} value={previewUrl ?? undefined} />

      <Input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {!previewUrl ? (
        <div
          onClick={handleThumbnailClick}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex h-64 cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:bg-muted",
            isDragging && "border-primary/50 bg-primary/5",
          )}
        >
          <UploadIllustration />
          <div className="text-center">
            <p className="text-sm font-medium">Click to select</p>
            <p className="text-xs text-muted-foreground">
              or drag and drop file here
            </p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="group relative h-64 overflow-hidden rounded-lg border">
            <img
              src={previewUrl}
              alt="Preview"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.currentTarget.closest("form");
                    }}
                    className="h-9 w-9 p-0"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upload Image</p>
                </TooltipContent>
              </Tooltip>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleRemove}
                className="h-9 w-9 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {fileName && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="truncate">{fileName}</span>
              <button
                type="button"
                onClick={handleRemove}
                className="ml-auto rounded-full p-1 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const UploadIllustration = () => (
  <div className="relative w-16 h-16">
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      aria-label="Upload illustration"
    >
      <title>Upload File Illustration</title>
      <circle
        cx="50"
        cy="50"
        r="45"
        className="stroke-gray-200 dark:stroke-gray-700"
        strokeWidth="2"
        strokeDasharray="4 4"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 50 50"
          to="360 50 50"
          dur="60s"
          repeatCount="indefinite"
        />
      </circle>

      <path
        d="M30 35H70C75 35 75 40 75 40V65C75 70 70 70 70 70H30C25 70 25 65 25 65V40C25 35 30 35 30 35Z"
        className="fill-accent stroke-primary"
        strokeWidth="2"
      >
        <animate
          attributeName="d"
          dur="2s"
          repeatCount="indefinite"
          values="
                        M30 35H70C75 35 75 40 75 40V65C75 70 70 70 70 70H30C25 70 25 65 25 65V40C25 35 30 35 30 35Z;
                        M30 38H70C75 38 75 43 75 43V68C75 73 70 73 70 73H30C25 73 25 68 25 68V43C25 38 30 38 30 38Z;
                        M30 35H70C75 35 75 40 75 40V65C75 70 70 70 70 70H30C25 70 25 65 25 65V40C25 35 30 35 30 35Z"
        />
      </path>

      <path
        d="M30 35C30 35 35 35 40 35C45 35 45 30 50 30C55 30 55 35 60 35C65 35 70 35 70 35"
        className="stroke-primary"
        strokeWidth="2"
        fill="none"
      />

      <g className="transform translate-y-2">
        <line
          x1="50"
          y1="45"
          x2="50"
          y2="60"
          className="stroke-primary"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <animate
            attributeName="y2"
            values="60;55;60"
            dur="2s"
            repeatCount="indefinite"
          />
        </line>
        <polyline
          points="42,52 50,45 58,52"
          className="stroke-primary"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <animate
            attributeName="points"
            values="42,52 50,45 58,52;42,47 50,40 58,47;42,52 50,45 58,52"
            dur="2s"
            repeatCount="indefinite"
          />
        </polyline>
      </g>
    </svg>
  </div>
);
