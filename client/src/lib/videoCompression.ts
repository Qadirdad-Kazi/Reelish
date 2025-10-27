/**
 * Video compression utility for client-side video compression
 * Reduces file size while maintaining acceptable quality
 */

interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  onProgress?: (progress: number) => void;
}

export async function compressVideo(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxSizeMB = 50, // Target max size in MB
    maxWidthOrHeight = 1280, // Max dimension (720p-ish)
    quality = 0.8, // Video quality (0.0 - 1.0)
    onProgress = () => {}
  } = options;

  // If file is already small enough, return it
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB <= maxSizeMB) {
    console.log(`File size ${fileSizeMB.toFixed(2)}MB is within limit, no compression needed`);
    onProgress(100);
    return file;
  }

  console.log(`Compressing video from ${fileSizeMB.toFixed(2)}MB...`);
  onProgress(10);

  return new Promise((resolve, reject) => {
    try {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = video.videoWidth;
        let height = video.videoHeight;

        if (width > height) {
          if (width > maxWidthOrHeight) {
            height = Math.round((height * maxWidthOrHeight) / width);
            width = maxWidthOrHeight;
          }
        } else {
          if (height > maxWidthOrHeight) {
            width = Math.round((width * maxWidthOrHeight) / height);
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        console.log(`Original: ${video.videoWidth}x${video.videoHeight}`);
        console.log(`Compressed: ${width}x${height}`);

        onProgress(30);

        // Use MediaRecorder API for better compression
        video.play().then(() => {
          const stream = canvas.captureStream(30); // 30 fps
          
          // Get audio from original video if available
          const audioContext = new AudioContext();
          const source = audioContext.createMediaElementSource(video);
          const dest = audioContext.createMediaStreamDestination();
          source.connect(dest);
          source.connect(audioContext.destination);
          
          // Add audio track to stream if available
          if (dest.stream.getAudioTracks().length > 0) {
            stream.addTrack(dest.stream.getAudioTracks()[0]);
          }

          const chunks: Blob[] = [];
          const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
            ? 'video/webm; codecs=vp9'
            : MediaRecorder.isTypeSupported('video/webm')
            ? 'video/webm'
            : 'video/mp4';

          const recorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: 2500000 // 2.5 Mbps for good quality
          });

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            const compressedSizeMB = blob.size / (1024 * 1024);
            
            console.log(`Compressed to ${compressedSizeMB.toFixed(2)}MB`);
            
            // Create a new File object from the blob
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, '') + '_compressed.mp4',
              { type: mimeType }
            );

            onProgress(100);
            URL.revokeObjectURL(video.src);
            resolve(compressedFile);
          };

          recorder.onerror = (error) => {
            console.error('MediaRecorder error:', error);
            reject(new Error('Video compression failed'));
          };

          // Draw frames to canvas
          const drawFrame = () => {
            if (!video.paused && !video.ended) {
              ctx.drawImage(video, 0, 0, width, height);
              requestAnimationFrame(drawFrame);
            }
          };

          drawFrame();
          recorder.start();
          onProgress(50);

          // Stop recording when video ends
          video.onended = () => {
            setTimeout(() => {
              recorder.stop();
              stream.getTracks().forEach(track => track.stop());
              audioContext.close();
            }, 100);
          };
        }).catch(error => {
          console.error('Video play error:', error);
          // If compression fails, return original file
          console.log('Compression failed, using original file');
          onProgress(100);
          resolve(file);
        });
      };

      video.onerror = () => {
        console.error('Video load error');
        // If video can't load, return original file
        resolve(file);
      };

    } catch (error) {
      console.error('Compression error:', error);
      // If any error occurs, return original file
      resolve(file);
    }
  });
}

/**
 * Get video duration in seconds
 */
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(Math.round(video.duration));
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };
  });
}

/**
 * Generate thumbnail from video
 */
export function generateVideoThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // Seek to 1 second or 10% into video, whichever is less
      const seekTime = Math.min(1, video.duration * 0.1);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(video.src);
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate thumbnail'));
        }
      }, 'image/jpeg', 0.8);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };
  });
}

