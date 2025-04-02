import { NextRequest, NextResponse } from 'next/server';
import { createC2pa, ManifestBuilder, SigningAlgorithm, LocalSigner } from 'c2pa-node';
import { generateKeyPairSync } from 'crypto';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

interface CertificateSubject {
  C: string;  // Country
  ST: string; // State
  L: string;  // Location/City
  O: string;  // Organization
  OU: string; // Organizational Unit
  CN: string; // Common Name
}

/**
 * Creates a local signer with the specified certificate subject
 * @param certSubject The certificate subject details
 * @returns The signer and a cleanup function
 */
async function createLocalSigner(certSubject: CertificateSubject): Promise<{ signer: LocalSigner; cleanup: () => void }> {
  // Generate key pair
  const { privateKey: keyPair } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  });

  // Create temporary files for certificate and private key
  const tempDir = tmpdir();
  const keyPath = join(tempDir, 'temp-key.pem');
  const csrPath = join(tempDir, 'temp-csr.pem');
  const caCertPath = join(tempDir, 'temp-ca-cert.pem');
  const caKeyPath = join(tempDir, 'temp-ca-key.pem');
  const certPath = join(tempDir, 'temp-cert.pem');
  const chainPath = join(tempDir, 'temp-chain.pem');
  const configPath = join(tempDir, 'temp-openssl.cnf');

  // Create OpenSSL config with appropriate extensions
  const opensslConfig = `
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = ${certSubject.C}
ST = ${certSubject.ST}
L = ${certSubject.L}
O = ${certSubject.O}
OU = ${certSubject.OU}
CN = ${certSubject.CN}

[v3_req]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, nonRepudiation
extendedKeyUsage = clientAuth, emailProtection

[v3_ca]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:true
keyUsage = critical, digitalSignature, cRLSign, keyCertSign
`;

  writeFileSync(configPath, opensslConfig);

  // Export private key to PEM format
  const exportedPrivateKeyPem = keyPair.export({ type: 'pkcs8', format: 'pem' }).toString();
  writeFileSync(keyPath, exportedPrivateKeyPem);

  // Generate a CA key and certificate
  execSync(`openssl ecparam -name prime256v1 -genkey -out ${caKeyPath}`);
  execSync(`openssl req -new -x509 -key ${caKeyPath} -out ${caCertPath} -days 365 -subj "/C=${certSubject.C}/ST=${certSubject.ST}/L=${certSubject.L}/O=${certSubject.O}/OU=CA/CN=${certSubject.CN} CA" -config ${configPath} -extensions v3_ca`);

  // Create CSR for the end-entity certificate
  execSync(`openssl req -new -key ${keyPath} -out ${csrPath} -subj "/C=${certSubject.C}/ST=${certSubject.ST}/L=${certSubject.L}/O=${certSubject.O}/OU=${certSubject.OU}/CN=${certSubject.CN}" -config ${configPath}`);

  // Sign the CSR with the CA key
  execSync(`openssl x509 -req -days 365 -in ${csrPath} -CA ${caCertPath} -CAkey ${caKeyPath} -CAcreateserial -out ${certPath} -extfile ${configPath} -extensions v3_req`);

  // Create certificate chain (end entity cert + CA cert)
  const endEntityCert = readFileSync(certPath, 'utf8');
  const caCert = readFileSync(caCertPath, 'utf8');
  writeFileSync(chainPath, endEntityCert + caCert);

  // Read the files for the signer
  const [certificate, privateKey] = await Promise.all([
    readFile(chainPath),
    readFile(keyPath),
  ]);

  const signer: LocalSigner = {
    type: 'local',
    certificate,
    privateKey,
    algorithm: SigningAlgorithm.ES256,
    tsaUrl: 'http://timestamp.digicert.com',
  };

  // Return cleanup function along with the signer
  const cleanup = () => {
    try {
      unlinkSync(keyPath);
      unlinkSync(csrPath);
      unlinkSync(caCertPath);
      unlinkSync(caKeyPath);
      unlinkSync(certPath);
      unlinkSync(chainPath);
      unlinkSync(configPath);
      try {
        unlinkSync(`${caCertPath}.srl`);
      } catch {
        // The .srl file might not exist, ignore
      }
    } catch (error) {
      console.error('Error cleaning up temporary files:', error);
    }
  };

  return { signer, cleanup };
}

/**
 * Handles POST requests to sign assets with C2PA
 */
export async function POST(request: NextRequest) {
  let cleanup: (() => void) | undefined;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    const assertionsStr = formData.get('assertions') as string;
    const certSubjectStr = formData.get('certSubject') as string;
    
    if (!assertionsStr || !certSubjectStr) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    const assertions = JSON.parse(assertionsStr);
    const certSubject = JSON.parse(certSubjectStr);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Create local signer with custom certificate subject
    const { signer, cleanup: cleanupFn } = await createLocalSigner(certSubject);
    cleanup = cleanupFn;

    // Create C2PA instance
    const c2pa = createC2pa({
      signer,
    });

    // Build manifest
    const manifest = new ManifestBuilder(
      {
        claim_generator: 'c2pa-verifier/1.0.0',
        format: file.type,
        title: file.name,
        assertions,
      },
      { vendor: 'cai' },
    );

    // Sign the asset
    const { signedAsset } = await c2pa.sign({
      asset: { buffer, mimeType: file.type },
      manifest,
    });
      
    // Convert signed asset to base64
    const base64Data = Buffer.from(signedAsset.buffer).toString('base64');
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
  } finally {
    // Clean up temporary files after all operations are complete
    if (cleanup) {
      cleanup();
    }
  }
} 