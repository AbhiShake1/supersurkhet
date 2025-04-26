import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

const CLOUDINARY_API_KEY = "185188199764294"
const CLOUDINARY_API_SECRET = "NQsOauie12C1QyX9En8CNKvSwwg"
const cloudinaryApiKey = CLOUDINARY_API_KEY
const cloudinaryApiSecret = CLOUDINARY_API_SECRET
// const cloudinaryApiKey = import.meta.env.CLOUDINARY_API_KEY
// const cloudinaryApiSecret = import.meta.env.CLOUDINARY_API_SECRET

if (!cloudinaryApiKey || !cloudinaryApiSecret) {
  throw new Error("CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET must be set")
}

export async function uploadImageToCloudinary(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', "default")

  const response = await fetch(`https://api.cloudinary.com/v1_1/dxejrk7wr/image/upload`, {
    method: 'POST',
    body: formData
  });
  if (!response.ok) {
    throw new Error('Failed to upload image');
  }
  const data = await response.json();
  return data.secure_url;
}

export interface UseImageUploadProps {
  onUpload?: (url: string) => void;
}

export function useImageUpload({ onUpload }: UseImageUploadProps = {}) {
  const { mutateAsync: uploadImage, isPending: isUploading } = useMutation({
    mutationFn: uploadImageToCloudinary,
    // onSuccess(d) {
    //   toast.success("Image uploaded successfully" + JSON.stringify(d, null, 2))
    // },
    onError() {
      toast.error("Failed to upload image")
    }
  })
  const previewRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleThumbnailClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return
      setFileName(file.name);
      const url = await uploadImage(file)
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