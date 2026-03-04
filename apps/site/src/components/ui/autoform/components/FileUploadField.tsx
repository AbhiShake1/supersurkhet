import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Upload, X, FileText, Image as ImageIcon, File } from 'lucide-react';
import type { FieldWrapperProps } from './FieldWrapper';
import { useState, useRef } from 'react';

interface FileUploadFieldProps extends FieldWrapperProps {
  placeholder?: string;
  className?: string;
  accept?: string;
  multiple?: boolean;
}

export function FileUploadField({
  field,
  label,
  description,
  error,
  className,
  placeholder = 'Choose file...',
  accept,
  multiple = false,
  ...props
}: FileUploadFieldProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setFileType(file.type);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFilePreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }

      field.onChange(file);
    } else {
      setFileName(null);
      setFilePreview(null);
      setFileType(null);
      field.onChange(null);
    }
  };

  const handleRemoveFile = () => {
    setFileName(null);
    setFilePreview(null);
    setFileType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    field.onChange(null);
  };

  const getFileIcon = () => {
    if (fileType?.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />;
    }
    if (fileType?.includes('pdf')) {
      return <FileText className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label
          htmlFor={field.name}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </Label>
      )}

      <div className="space-y-3">
        {/* File input area */}
        {/** biome-ignore lint/a11y/noStaticElementInteractions: lint debt cleanup */}
        {/** biome-ignore lint/a11y/useKeyWithClickEvents: lint debt cleanup */}
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-input bg-background px-6 py-8 transition-colors hover:border-accent',
            error && 'border-destructive',
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <Input
            ref={fileInputRef}
            id={field.name}
            type="file"
            className="hidden"
            accept={accept}
            multiple={multiple}
            onChange={handleFileChange}
            {...props}
          />

          <div className="flex flex-col items-center text-center">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground mb-1">
              {fileName || placeholder}
            </p>
            <p className="text-xs text-muted-foreground">
              Click to browse or drag and drop
            </p>
          </div>
        </div>

        {/* File preview */}
        {fileName && (
          <div className="flex items-center justify-between rounded-lg border border-input bg-background p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                {getFileIcon()}
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                  {fileName}
                </p>
                {filePreview && fileType?.startsWith('image/') && (
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="h-8 w-8 rounded object-cover mt-1"
                  />
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRemoveFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {error && (
        <p className="text-sm font-medium text-destructive">{error.message}</p>
      )}
    </div>
  );
}
