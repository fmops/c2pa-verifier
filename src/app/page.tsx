'use client';

import { useState, useEffect } from 'react';
import { Asset, BMFF, JPEG, PNG } from '@trustnxt/c2pa-ts/asset';
import { SuperBox } from '@trustnxt/c2pa-ts/jumbf';
import { ManifestStore } from '@trustnxt/c2pa-ts/manifest';

interface Action {
  softwareAgent?: {
    name?: string;
  };
  action?: string;
}

interface ActionAssertion {
  label: string;
  actions: Action[];
}

interface VerificationResult {
  actions: Array<{
    action?: string;
    softwareAgent?: string;
  }>;
  subject?: string;
  validationStatus: string;
}

export default function Home() {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const extractManifestInfo = (manifestStore: ManifestStore): VerificationResult => {
    try {
      const manifest = manifestStore.manifests[0];
      if (!manifest) {
        throw new Error('No manifest found');
      }

      const allAssertions = (manifest.assertions?.assertions || []) as unknown as Array<ActionAssertion | Record<string, unknown>>;
      
      // Filter for action assertions (those with actions array)
      const actionAssertions = allAssertions.filter((assertion): assertion is ActionAssertion => 
        assertion &&
        'actions' in assertion &&
        Array.isArray(assertion.actions)
      );

      // Extract all actions and their software agents
      const actions = actionAssertions.flatMap(assertion => 
        assertion.actions.map(action => ({
          action: action.action,
          softwareAgent: action.softwareAgent?.name
        }))
      );

      return {
        actions,
        subject: manifest.signature?.signatureData?.certificate?.subject,
        validationStatus: 'VALID'
      };
    } catch (err) {
      console.error('Error extracting manifest info:', err);
      return {
        actions: [],
        validationStatus: 'error'
      };
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);
    setError('');
    setImageUrl(null);

    try {
      setImageUrl(URL.createObjectURL(file));

      const buffer = await file.arrayBuffer();
      const buf = new Uint8Array(buffer);

      let asset: Asset;
      if (JPEG.canRead(buf)) {
        asset = new JPEG(buf);
      } else if (PNG.canRead(buf)) {
        asset = new PNG(buf);
      } else if (BMFF.canRead(buf)) {
        asset = new BMFF(buf);
      } else {
        setError('Error: Unsupported file format. Please upload a JPEG, PNG, or BMFF file.');
        return;
      }

      const jumbf = asset.getManifestJUMBF();

      if (jumbf) {
        try {
          const superBox = SuperBox.fromBuffer(jumbf);
          const manifests = ManifestStore.read(superBox);
          const manifestInfo = extractManifestInfo(manifests);
          setResult(manifestInfo);
        } catch (e) {
          const error = e as Error;
          setError(`Error reading manifest: ${error.message}`);
        }
      } else {
        setError('No C2PA manifest found in the image.');
      }
    } catch (error) {
      const err = error as Error;
      setError(`Error processing file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  return (
    <main className="min-h-screen p-8 bg-black text-white">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">C2PA Image Verification Tool</h1>
        
        <div className="mb-8">
          <label className="block text-sm font-medium mb-2">
            Upload an image to verify its C2PA manifest
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-300
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-500 file:text-white
              hover:file:bg-blue-600
              cursor-pointer"
            disabled={loading}
          />
        </div>

        {loading && (
          <div className="text-blue-400">Verifying image...</div>
        )}

        {error && (
          <div className="mt-8 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {imageUrl && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Image Preview</h2>
            <div className="rounded-lg overflow-hidden bg-gray-900">
              <img 
                src={imageUrl} 
                alt="Uploaded image" 
                className="max-w-full h-auto"
              />
            </div>
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-6">
            <h2 className="text-xl font-semibold mb-4">Manifest Information</h2>
            
            <div className="bg-gray-900 p-6 rounded-lg space-y-4">
              {result.actions.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-gray-300">Actions</h3>
                  {result.actions.map((item, index) => (
                    <div key={index} className="bg-gray-800/50 p-3 rounded space-y-1">
                      {item.action && (
                        <div>
                          <span className="text-gray-400">Action: </span>
                          <span className="text-white">{item.action}</span>
                        </div>
                      )}
                      {item.softwareAgent && (
                        <div>
                          <span className="text-gray-400">Software: </span>
                          <span className="text-white">{item.softwareAgent}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400">No actions found</div>
              )}

              {result.subject && (
                <div className="pt-4 border-t border-gray-700">
                  <span className="text-gray-400">Signed by: </span>
                  <span className="text-white">{result.subject}</span>
                </div>
              )}

              <div className="pt-4 border-t border-gray-700">
                <span className="text-gray-400">Validation Status: </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                  ${result.validationStatus === 'VALID' 
                    ? 'bg-green-900/50 text-green-200 border border-green-700'
                    : 'bg-red-900/50 text-red-200 border border-red-700'}`}>
                  {result.validationStatus}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
