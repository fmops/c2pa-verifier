import { NextRequest, NextResponse } from 'next/server';
import { createC2pa, createTestSigner } from 'c2pa-node';
import { ManifestBuilder } from 'c2pa-node';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const assertions = JSON.parse(formData.get('assertions') as string);

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Build manifest
    const manifest = new ManifestBuilder(
      {
        claim_generator: 'c2pa-verifier/1.0.0',
        format: file.type,
        title: file.name,
        assertions,
      },
      { vendor: 'cai' }
    );

    // Create signer and c2pa instance
    const signer = await createTestSigner();
    const c2pa = createC2pa({
      signer,
    });

    // Sign the asset
    const { signedAsset } = await c2pa.sign({
      asset: { buffer, mimeType: file.type },
      manifest,
    });

    console.log('signedAsset', signedAsset);

    // Convert the signed asset to base64 for sending back to client
    const base64Data = signedAsset.buffer.toString('base64');

    return NextResponse.json({
      data: base64Data,
      mimeType: file.type,
    });
  } catch (error) {
    console.error('Error signing asset:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sign asset' },
      { status: 500 }
    );
  }
} 