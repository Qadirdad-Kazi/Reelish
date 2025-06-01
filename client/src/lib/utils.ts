import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number | null): string {
  // Handle null values by defaulting to 0
  const safeNum = num ?? 0;
  if (safeNum >= 1000000) {
    return (safeNum / 1000000).toFixed(1) + 'M';
  } else if (safeNum >= 1000) {
    return (safeNum / 1000).toFixed(1) + 'K';
  }
  return safeNum.toString();
}

export function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`;
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h`;
  } else if (diffInSeconds < 604800) {
    return `${Math.floor(diffInSeconds / 86400)}d`;
  } else {
    return `${Math.floor(diffInSeconds / 604800)}w`;
  }
}

export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#[a-zA-Z0-9_]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.substring(1)) : [];
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function generateVideoThumbnail(videoFile: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.addEventListener('loadedmetadata', () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      video.currentTime = 1; // Seek to 1 second
    });

    video.addEventListener('seeked', () => {
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnailDataUrl);
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    });

    video.addEventListener('error', () => {
      reject(new Error('Failed to load video'));
    });

    video.src = URL.createObjectURL(videoFile);
  });
}
