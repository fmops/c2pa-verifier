'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Assertion {
  label: string;
  data: Record<string, unknown>;
}

interface CertificateSubject {
  C: string;
  ST: string;
  L: string;
  O: string;
  OU: string;
  CN: string;
}

export default function CreateManifest() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [certSubject, setCertSubject] = useState<CertificateSubject>({
    C: 'US',
    ST: 'CA',
    L: 'Somewhere',
    O: 'C2PA Test Signing Cert',
    OU: 'FOR TESTING_ONLY',
    CN: 'C2PA Signer'
  });
  const [certSubjectText, setCertSubjectText] = useState(JSON.stringify({
    C: 'US',
    ST: 'CA',
    L: 'Somewhere',
    O: 'C2PA Test Signing Cert',
    OU: 'FOR TESTING_ONLY',
    CN: 'C2PA Signer'
  }, null, 2));
  const [assertions, setAssertions] = useState<Assertion[]>([
    {
      label: "c2pa.actions",
      data: {
        actions: [
          {
            action: "c2pa.created",
            softwareAgent: {
              name: "Blueteam C2PA Example"
            }
          }
        ]
      }
    }
  ]);
  const [assertionsText, setAssertionsText] = useState(JSON.stringify([
    {
      label: "c2pa.actions",
      data: {
        actions: [
          {
            action: "c2pa.created",
            softwareAgent: {
              name: "Blueteam C2PA Example"
            }
          }
        ]
      }
    }
  ], null, 2));
  const [signedAssetUrl, setSignedAssetUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCertSubjectChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setCertSubjectText(newText);
    
    try {
      const parsedSubject = JSON.parse(newText);
      setCertSubject(parsedSubject);
      setError(null);
    } catch (error) {
      console.error('Invalid JSON:', error);
      setError('Invalid certificate subject JSON format');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleAssertionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setAssertionsText(newText);
    
    try {
      const parsedAssertions = JSON.parse(newText);
      setAssertions(parsedAssertions);
      setError(null);
    } catch (error) {
      console.error('Invalid JSON:', error);
      setError('Invalid JSON format');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('assertions', JSON.stringify(assertions));
      formData.append('certSubject', JSON.stringify(certSubject));

      const response = await fetch('/api/sign', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sign asset');
      }

      const result = await response.json();
      
      // Create a download URL for the signed asset
      const binaryData = atob(result.data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      setSignedAssetUrl(url);
    } catch (error) {
      console.error('Error signing asset:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign asset. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Create and Sign Manifest</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <label className="block text-sm font-medium dark:text-gray-200">
            Upload Asset
          </label>
          <div className="flex flex-col items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {previewUrl ? (
                  <Image 
                    src={previewUrl} 
                    alt="Preview" 
                    className="max-h-48 max-w-full object-contain"
                    width={400}
                    height={300}
                    style={{
                      maxHeight: '12rem',
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <>
                    <svg className="w-8 h-8 mb-2 text-gray-400 dark:text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                    </svg>
                    <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG or GIF (MAX. 800x400px)</p>
                  </>
                )}
              </div>
              <input 
                type="file" 
                className="hidden" 
                onChange={handleFileChange}
                accept="image/*"
              />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 dark:text-gray-200">
            Certificate Subject (JSON)
          </label>
          <textarea
            value={certSubjectText}
            onChange={handleCertSubjectChange}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg h-32 font-mono text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Required fields: C (Country), ST (State), L (Locality), O (Organization), OU (Organizational Unit), CN (Common Name)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 dark:text-gray-200">
            Assertions (JSON)
          </label>
          <textarea
            value={assertionsText}
            onChange={handleAssertionChange}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg h-48 font-mono text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!file || isLoading}
          className="w-full bg-blue-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Signing...' : 'Sign Asset'}
        </button>
      </form>

      {signedAssetUrl && (
        <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
          <h2 className="text-xl font-bold mb-2 text-green-800 dark:text-green-200">Signed Asset Ready</h2>
          <a
            href={signedAssetUrl}
            download="signed-asset"
            className="inline-block bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            Download Signed Asset
          </a>
        </div>
      )}
    </div>
  );
} 