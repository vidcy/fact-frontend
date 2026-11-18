async function testApi() {
  try {
    const payload = {
      document_type: '01',
      series: 'F001',
      client_doc_type: '6',
      client_doc_number: '20456789012',
      client_name: 'SERVICIOS INDUSTRIALES DEL NORTE S.A.C.',
      client_address: 'Carretera Panamericana Norte Km 560, Trujillo',
      client_email: 'contabilidad@sinorte.pe',
      currency: 'PEN',
      payment_type: 'Contado',
      items: [
        {
          code: 'PROD-99',
          description: 'ConsultorÃ­a Especializada en Sistemas Distribuidos',
          unit_measure: 'ZZ',
          quantity: 1,
          unit_price: 1180.00,
          igv_affectation_type: '10'
        }
      ],
      send_now: true
    };

    console.log('Enviando factura a http://localhost:4001/api/v1/documents...');
    const response = await fetch('http://localhost:4001/api/v1/documents', {
      method: 'POST',
      headers: {
        'x-api-key': 'fact_demo_key_pro_2026',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('FACTURA REGISTRADA:');
    console.log('NÃºmero:', data.full_number);
    console.log('Estado:', data.status);
    console.log('Hash SHA-256:', data.xml_digest_value);
    console.log('QR oficial:', data.qr_data);
    console.log('Respuesta SUNAT:', data.sunat_description);

    // Test obtener HTML para impresiÃ³n
    const htmlRes = await fetch('http://localhost:4001/api/v1/documents/' + data.id + '/html', {
      headers: { 'x-api-key': 'fact_demo_key_pro_2026' }
    });
    const htmlText = await htmlRes.text();
    console.log('HTML generado longitud:', htmlText.length, 'bytes');

    // Test obtener XML firmado
    const xmlRes = await fetch('http://localhost:4001/api/v1/documents/' + data.id + '/xml', {
      headers: { 'x-api-key': 'fact_demo_key_pro_2026' }
    });
    const xmlText = await xmlRes.text();
    console.log('XML firmado longitud:', xmlText.length, 'bytes');

    // Test obtener CDR
    const cdrRes = await fetch('http://localhost:4001/api/v1/documents/' + data.id + '/cdr', {
      headers: { 'x-api-key': 'fact_demo_key_pro_2026' }
    });
    const cdrText = await cdrRes.text();
    console.log('CDR XML longitud:', cdrText.length, 'bytes');
  } catch (err) {
    console.error('Error:', err.message);
  }
}
testApi();
