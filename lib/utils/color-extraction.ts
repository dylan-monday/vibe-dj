// Extract dominant color from album art image

interface RGB {
  r: number;
  g: number;
  b: number;
}

export async function extractDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve("#7c3aed"); // Fallback purple
        return;
      }

      // Sample at low resolution for performance
      const size = 10;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size).data;
      const colors: RGB[] = [];

      // Collect all pixel colors
      for (let i = 0; i < imageData.length; i += 4) {
        colors.push({
          r: imageData[i],
          g: imageData[i + 1],
          b: imageData[i + 2],
        });
      }

      // Find most vibrant color (avoid dark/white)
      const vibrant = colors
        .filter((c) => {
          const brightness = (c.r + c.g + c.b) / 3;
          const saturation = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
          return brightness > 30 && brightness < 220 && saturation > 30;
        })
        .sort((a, b) => {
          const satA = Math.max(a.r, a.g, a.b) - Math.min(a.r, a.g, a.b);
          const satB = Math.max(b.r, b.g, b.b) - Math.min(b.r, b.g, b.b);
          return satB - satA;
        })[0];

      if (vibrant) {
        resolve(`rgb(${vibrant.r}, ${vibrant.g}, ${vibrant.b})`);
      } else {
        resolve("#7c3aed"); // Fallback purple
      }
    };

    img.onerror = () => resolve("#7c3aed");
    img.src = imageUrl;
  });
}
