export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
export const MAX_FILES = 5;
export const MAX_IMAGES = 10;
export const ACCEPTED_PDF_MIME = 'application/pdf';
export const ACCEPTED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

export type CompressionLevel = 'low' | 'medium' | 'high';

export interface QualityPreset {
  jpegQuality: number;
  maxDimension: number;
  label: string;
}

export const QUALITY_PRESETS: Record<CompressionLevel, QualityPreset> = {
  // "low" compression = highest quality, biggest file
  low: {
    jpegQuality: 85,
    maxDimension: 2000,
    label: 'High quality',
  },
  medium: {
    jpegQuality: 70,
    maxDimension: 1600,
    label: 'Balanced',
  },
  // "high" compression = smallest file, lowest quality
  high: {
    jpegQuality: 50,
    maxDimension: 1200,
    label: 'Smallest size',
  },
};

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(bytes >= k * k ? 2 : 1)} ${sizes[i]}`;
}
