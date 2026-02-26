import { useMutation } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export async function uploadImageToNetwork(file: File): Promise<string> {
  return toBase64(file);
}

export interface UseImageUploadProps {
  onUpload?: (url: string) => void;
  defaultValue?: string;
  value?: string;
}

export function useImageUpload({
  onUpload,
  defaultValue,
  value,
}: UseImageUploadProps = {}) {
  const { mutateAsync: uploadImage, isPending: isUploading } = useMutation({
    mutationFn: uploadImageToNetwork,
    // onSuccess(d) {
    //   toast.success("Image uploaded successfully" + JSON.stringify(d, null, 2))
    // },
    onError() {
      toast.error('Failed to upload image');
    },
  });
  const isControlled = value !== undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [internalPreviewUrl, setInternalPreviewUrl] = useState<string | null>(
    defaultValue ?? null,
  );
  const previewUrl = isControlled ? (value ?? null) : internalPreviewUrl;
  const [fileName, setFileName] = useState<string | null>(() =>
    previewUrl ? 'Image' : null,
  );

  const handleThumbnailClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const url = await uploadImage(file);
      if (!isControlled) {
        setInternalPreviewUrl(url);
      }
      setFileName(file.name);
      onUpload?.(url);
    },
    [isControlled, onUpload, uploadImage],
  );

  const handleRemove = useCallback(() => {
    if (!isControlled) {
      setInternalPreviewUrl(null);
    }
    setFileName(null);
    if (isControlled) {
      onUpload?.('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [isControlled, onUpload]);

  return {
    previewUrl,
    fileName,
    fileInputRef,
    handleThumbnailClick,
    handleFileChange,
    handleRemove,
    isUploading,
  };
}
