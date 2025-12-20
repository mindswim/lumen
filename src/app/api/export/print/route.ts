import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// sRGB IEC61966-2.1 ICC profile (embedded in output for color accuracy)
// Sharp includes sRGB profile by default when using withIccProfile('srgb')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageData, options = {} } = body;

    if (!imageData) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      );
    }

    const {
      format = 'jpeg',
      quality = 100,
      dpi = 300,
    } = options;

    // Remove data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Process with Sharp
    let pipeline = sharp(imageBuffer)
      // Ensure sRGB color space with embedded ICC profile
      .withIccProfile('srgb')
      // Set DPI metadata (for print)
      .withMetadata({
        density: dpi,
      });

    let outputBuffer: Buffer;
    let mimeType: string;

    if (format === 'jpeg') {
      outputBuffer = await pipeline
        .jpeg({
          quality,
          // No chroma subsampling (4:4:4) for maximum quality
          chromaSubsampling: '4:4:4',
          // Use mozjpeg for better compression at same quality
          mozjpeg: true,
        })
        .toBuffer();
      mimeType = 'image/jpeg';
    } else if (format === 'png') {
      outputBuffer = await pipeline
        .png({
          compressionLevel: 6,
        })
        .toBuffer();
      mimeType = 'image/png';
    } else if (format === 'tiff') {
      // TIFF for archival/print - maximum quality
      outputBuffer = await pipeline
        .tiff({
          quality: 100,
          compression: 'lzw',
        })
        .toBuffer();
      mimeType = 'image/tiff';
    } else {
      return NextResponse.json(
        { error: 'Unsupported format' },
        { status: 400 }
      );
    }

    // Return the processed image
    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': outputBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="export.${format === 'jpeg' ? 'jpg' : format}"`,
      },
    });
  } catch (error) {
    console.error('Print export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}

// Route segment config for large image uploads
export const maxDuration = 60; // 60 seconds timeout
export const dynamic = 'force-dynamic';
