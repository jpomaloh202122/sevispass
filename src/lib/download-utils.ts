// Utility functions for downloading digital ID cards

export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-z0-9]/gi, '_') // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
};

export const getDownloadFilename = (name: string, format: 'png' | 'pdf'): string => {
  const sanitized = sanitizeFilename(name);
  return `SevisPass-DigitalID-${sanitized}.${format}`;
};

export const downloadOptions = {
  png: {
    quality: 1,
    bgcolor: '#ffffff',
    style: {
      // Ensure compatibility with older browsers
      background: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }
  },
  pdf: {
    orientation: 'landscape' as const,
    unit: 'mm' as const,
    format: 'a4' as const
  }
};