// lib/server-colors.ts
import sharp from 'sharp';

export async function extractColorsFromImage(imageUrl: string) {
  try {
    // 1. Fetch the image from the external API on the server
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Failed to fetch image');
    
    const buffer = Buffer.from(await response.arrayBuffer());

    // 2. Use sharp to resize the image to a SINGLE 1x1 pixel. 
    // This instantly calculates the average color of the entire image!
    const { data } = await sharp(buffer)
      .resize(1, 1)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const r = data[0];
    const g = data[1];
    const b = data[2];

    // 3. Boost the colors slightly so they pop on your dark UI
    const primary = `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`;
    const secondary = `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`;

    return { primary, secondary };
  } catch (error) {
    console.error('Error extracting colors:', error);
    // Fallback to your default purple gradient if the image fails
    return { primary: '#8b5cf6', secondary: '#d946ef' }; 
  }
}