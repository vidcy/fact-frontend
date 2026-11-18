const fs = require('fs');
const path = require('path');

const backendDir = path.resolve('../fact-backend');

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeFile(relativePath, content) {
  const fullPath = path.join(backendDir, relativePath);
  ensureDir(fullPath);
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log(`[OK] Created: ${relativePath}`);
}

writeFile('src/modules/sunat-core/services/xml-signer.service.ts', `
import { Injectable, Logger } from '@nestjs/common';
import * as forge from 'node-forge';
import { SignedXml } from 'xml-crypto';

@Injectable()
export class XmlSignerService {
  private readonly logger = new Logger(XmlSignerService.name);

  private defaultTestCert: { privateKeyPem: string; certPem: string } | null = null;

  constructor() {
    this.initDefaultCertificate();
  }

  private initDefaultCertificate() {
    try {
      const keys = forge.pki.rsa.generateKeyPair(2048);
      const cert = forge.pki.createCertificate();
      cert.publicKey = keys.publicKey;
      cert.serialNumber = '01';
      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date();
      cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2);

      const attrs = [
        { name: 'commonName', value: 'CERTIFICADO DEMO SUNAT FACT-APPS' },
        { name: 'countryName', value: 'PE' },
        { shortName: 'ST', value: 'Lima' },
        { name: 'localityName', value: 'Lima' },
        { name: 'organizationName', value: 'FACT-APPS DEMO S.A.C.' },
      ];
      cert.setSubject(attrs);
      cert.setIssuer(attrs);
      cert.sign(keys.privateKey, forge.md.sha256.create());

      this.defaultTestCert = {
        privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
        certPem: forge.pki.certificateToPem(cert),
      };
      this.logger.log('Certificado digital de pruebas inicializado con éxito.');
    } catch (err) {
      this.logger.error('Error inicializando certificado de pruebas', err);
    }
  }

  public extractFromPfx(pfxBase64: string, password: string): { privateKeyPem: string; certPem: string } {
    try {
      const pfxDer = forge.util.decode64(pfxBase64);
      const pfxAsn1 = forge.asn1.fromDer(pfxDer);
      const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password || '');

      let privateKeyPem = '';
      let certPem = '';

      for (const safeContent of pfx.safeContents) {
        for (const safeBag of safeContent.safeBags) {
          if (safeBag.key) {
            privateKeyPem = forge.pki.privateKeyToPem(safeBag.key);
          }
          if (safeBag.cert) {
            certPem = forge.pki.certificateToPem(safeBag.cert);
          }
        }
      }

      if (!privateKeyPem || !certPem) {
        throw new Error('No se encontró clave privada o certificado en el archivo PFX provisto');
      }

      return { privateKeyPem, certPem };
    } catch (err: any) {
      this.logger.warn(\`Error procesando PFX del cliente: \${err.message}. Usando certificado de pruebas.\`);
      return this.defaultTestCert!;
    }
  }

  public signXml(
    xmlString: string,
    pfxBase64?: string,
    password?: string,
  ): { signedXml: string; digestValue: string; signatureValue: string } {
    const keys = (pfxBase64 && password)
      ? this.extractFromPfx(pfxBase64, password)
      : this.defaultTestCert!;

    const sig = new SignedXml({
      privateKey: keys.privateKeyPem,
      publicCert: keys.certPem,
      signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
      canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    });

    sig.addReference({
      xpath: "/*",
      transforms: ['http://www.w3.org/2000/09/xmldsig#enveloped-signature'],
      digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    });

    sig.computeSignature(xmlString, {
      location: {
        reference: "//*[local-name(.)='ExtensionContent']",
        action: 'append',
      },
    });

    const signedXml = sig.getSignedXml();

    const refs = (sig as any).references || [];
    let digestValue = refs.length > 0 ? refs[0].digestValue : '';
    let signatureValue = (sig as any).signatureValue || '';

    if (!digestValue) {
      const match = signedXml.match(/<(?:[a-zA-Z0-9]+:)?DigestValue>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9]+:)?DigestValue>/i);
      if (match) digestValue = match[1].trim();
    }

    if (!signatureValue) {
      const match = signedXml.match(/<(?:[a-zA-Z0-9]+:)?SignatureValue>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9]+:)?SignatureValue>/i);
      if (match) signatureValue = match[1].trim();
    }

    return {
      signedXml,
      digestValue,
      signatureValue,
    };
  }
}
`);

console.log('XmlSignerService actualizado.');
