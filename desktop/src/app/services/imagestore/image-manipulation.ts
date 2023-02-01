const sharp = typeof window !== 'undefined' ? window.require('sharp') : require('sharp');

const MAX_INPUT_PIXELS = 2500000000;
const MAX_DISPLAY_WIDTH = 10000;
const MAX_DISPLAY_HEIGHT = 10000;


/**
 * @author Thomas Kleinke
 */
export module ImageManipulation {

    export async function getSize(buffer: Buffer): Promise<{ width: number, height: number }> {

        const metadata = await getImage(buffer).metadata();
        return { width: metadata.width, height: metadata.height };
    }


    export async function createThumbnail(buffer: Buffer, targetHeight: number,
                                          targetJpegQuality: number): Promise<Buffer> {

        try {
            return await getImage(buffer)
                .resize(undefined, targetHeight)
                .jpeg({ quality: targetJpegQuality })
                .toBuffer();
        } catch (err) {
            console.error('Failed to generate thumbnail:', err);
            return undefined;
        }
    }


    export function needsDisplayVersion(width: number, height: number, fileExtension: string): boolean {

        return fileExtension.toLowerCase().includes('tif')
            || width > MAX_DISPLAY_WIDTH
            || height > MAX_DISPLAY_HEIGHT;
    }

    
    export async function createDisplayImage(buffer: Buffer, width: number, height: number,
                                             fileExtension: string): Promise<Buffer> {

        let image = getImage(buffer);

        if (fileExtension.toLowerCase().includes('tif')) {
            image = image.png();
        }
        if (width > MAX_DISPLAY_WIDTH || height > MAX_DISPLAY_HEIGHT) {
            image = image.resize(MAX_DISPLAY_WIDTH, MAX_DISPLAY_HEIGHT, { fit: 'inside' });
        }
        
        return image.toBuffer();
    }


    function getImage(buffer: Buffer): any {

        return sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS });
    }
}
