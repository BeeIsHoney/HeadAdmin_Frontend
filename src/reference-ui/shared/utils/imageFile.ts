export const PREVIEW_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const MAX_PREVIEW_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const validatePreviewImageFile = (file: File): string | null => {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return 'Use a JPG, PNG, or WebP image.';
  }
  if (file.size > MAX_PREVIEW_IMAGE_BYTES) {
    return 'Image must be 5 MB or smaller.';
  }
  return null;
};

export const readImageFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read the selected image.'));
    };
    reader.readAsDataURL(file);
  });
