import { useState } from 'react';
// import { createC2pa, createTestSigner } from 'c2pa-node';
// import { ManifestBuilder } from 'c2pa-node';

interface Assertion {
  label: string;
  data: any;
}

export default function CreateManifest() {
  const [file, setFile] = useState<File | null>(null);
  const [assertions, setAssertions] = useState<Assertion[]>([]);
  const [signedAssetUrl, setSignedAssetUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleAssertionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const parsedAssertions = JSON.parse(e.target.value);
      setAssertions(parsedAssertions);
    } catch (error) {
      console.error('Invalid JSON:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const asset = {
        buffer: Buffer.from(buffer),
        mimeType: file.type,
      };

      const manifest = new ManifestBuilder(
        {
          claim_generator: 'c2pa-verifier/1.0.0',
          format: file.type,
          title: file.name,
          assertions,
        },
        { vendor: 'cai' }
      );

      const signer = await createTestSigner();
      const c2pa = createC2pa({
        signer,
      });

      const { signedAsset } = await c2pa.sign({
        asset,
        manifest,
      });

      // Create a download URL for the signed asset
      const blob = new Blob([signedAsset], { type: file.type });
      const url = URL.createObjectURL(blob);
      setSignedAssetUrl(url);
    } catch (error) {
      console.error('Error signing asset:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create and Sign Manifest</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Upload Asset
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            className="w-full p-2 border rounded"
            accept="image/*"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Assertions (JSON)
          </label>
          <textarea
            value={JSON.stringify(assertions, null, 2)}
            onChange={handleAssertionChange}
            className="w-full p-2 border rounded h-32 font-mono"
            placeholder="Enter assertions as JSON array"
          />
        </div>

        <button
          type="submit"
          disabled={!file || isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
        >
          {isLoading ? 'Signing...' : 'Sign Asset'}
        </button>
      </form>

      {signedAssetUrl && (
        <div className="mt-4">
          <h2 className="text-xl font-bold mb-2">Signed Asset Ready</h2>
          <a
            href={signedAssetUrl}
            download="signed-asset"
            className="text-blue-500 hover:underline"
          >
            Download Signed Asset
          </a>
        </div>
      )}
    </div>
  );
} 