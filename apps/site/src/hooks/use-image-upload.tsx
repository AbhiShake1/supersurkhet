import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
      toast.error("Failed to upload image");
    },
  });
  const previewRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    defaultValue ?? null,
  );
  useEffect(() => {
    setFileName("Image")
    setPreviewUrl(value ?? null)
    previewRef.current = value ?? null
  }, [value])
  const [fileName, setFileName] = useState<string | null>(null);

  const handleThumbnailClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const url = await uploadImage(file);
      setPreviewUrl(url);
      previewRef.current = url;
      onUpload?.(url);
    },
    [onUpload],
  );

  const handleRemove = useCallback(() => {
    setPreviewUrl(null);
    setFileName(null);
    previewRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [previewUrl]);

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
