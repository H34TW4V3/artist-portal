
/**
 * Calculates the average brightness of an image from its URL.
 * Returns a value between 0 (black) and 255 (white).
 * Handles CORS issues for external images if the browser supports it.
 * Returns null if the image cannot be loaded or processed.
 */
export function getImageBrightness(imageUrl: string): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Try to load image with crossOrigin attribute for CORS
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Reduce canvas size for performance, aspect ratio doesn't matter for average brightness
      const scaledWidth = 50;
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      const scaledHeight = scaledWidth / aspectRatio;

      canvas.width = scaledWidth;
      canvas.height = scaledHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error("Could not get canvas context for brightness calculation.");
        resolve(null); // Resolve with null if context fails
        return;
      }

      ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

      let imageData;
      try {
        imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);
      } catch (e) {
        console.error("Could not get image data (possibly CORS issue):", e);
        resolve(null); // Resolve with null on CORS or other getImageData errors
        return;
      }

      const data = imageData.data;
      let r, g, b, avg;
      let colorSum = 0;

      for (let x = 0, len = data.length; x < len; x += 4) {
        r = data[x];
        g = data[x + 1];
        b = data[x + 2];

        // Standard brightness calculation (luminance)
        avg = Math.floor((0.299 * r + 0.587 * g + 0.114 * b));
        colorSum += avg;
      }

      const brightness = Math.floor(colorSum / (scaledWidth * scaledHeight));
      resolve(brightness);
    };

    img.onerror = (error) => {
      console.error("Error loading image for brightness calculation:", error);
      // Attempt to load without crossOrigin as a fallback for non-CORS servers
      const imgFallback = new Image();
      imgFallback.onload = () => {
         // Repeat canvas logic from above
        const canvas = document.createElement('canvas');
        const scaledWidth = 50;
        const aspectRatio = imgFallback.naturalWidth / imgFallback.naturalHeight;
        const scaledHeight = scaledWidth / aspectRatio;
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            resolve(null);
            return;
        }
        ctx.drawImage(imgFallback, 0, 0, scaledWidth, scaledHeight);
        try {
            const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);
            const data = imageData.data;
            let r, g, b, avg;
            let colorSum = 0;
            for (let x = 0, len = data.length; x < len; x += 4) {
                r = data[x]; g = data[x+1]; b = data[x+2];
                avg = Math.floor((0.299*r + 0.587*g + 0.114*b));
                colorSum += avg;
            }
            const brightness = Math.floor(colorSum / (scaledWidth*scaledHeight));
            resolve(brightness);
        } catch (e) {
            console.error("Could not get image data (fallback attempt failed, likely CORS):", e);
            resolve(null); // Still failed
        }
      };
       imgFallback.onerror = (fallbackError) => {
           console.error("Error loading image (fallback attempt failed):", fallbackError);
           resolve(null); // Resolve with null if even fallback fails
       }
      imgFallback.src = imageUrl;

    };

    img.src = imageUrl;
  });
}
