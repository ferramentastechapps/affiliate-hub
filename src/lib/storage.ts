import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Saves a base64 image or a URL to the local public/enhanced/ directory.
 * @param source Base64 string or image URL
 * @param isBase64 True if source is a base64 string
 * @returns The public URL of the saved image (e.g. /enhanced/abc.jpg)
 */
export async function saveEnhancedImage(source: string, isBase64: boolean): Promise<string | null> {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const enhancedDir = path.join(publicDir, 'enhanced');
    
    // Create the enhanced directory if it doesn't exist
    if (!fs.existsSync(enhancedDir)) {
      fs.mkdirSync(enhancedDir, { recursive: true });
    }

    const uniqueId = crypto.randomBytes(8).toString('hex');
    const fileName = `enhanced_${Date.now()}_${uniqueId}.jpg`;
    const filePath = path.join(enhancedDir, fileName);

    if (isBase64) {
      // Handle base64 string (remove data URL prefix if present)
      const base64Data = source.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, buffer);
    } else {
      // Handle URL download
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };
      try {
        const parsedUrl = new URL(source);
        headers['Referer'] = `${parsedUrl.protocol}//${parsedUrl.hostname}/`;
      } catch (e) {}

      const response = await fetch(source, { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(filePath, buffer);
    }

    // Return the relative public path
    return `/enhanced/${fileName}`;
  } catch (error) {
    console.error('Error saving enhanced image:', error);
    return null;
  }
}
