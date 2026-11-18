async function testQueue() {
  const payload = {
    document_type: '03',
    series: 'B001',
    client_doc_type: '1',
    client_doc_number: '71234567',
    client_name: 'MARIA ELENA ROJAS',
    currency: 'PEN',
    payment_type: 'Contado',
    items: [
      {
        code: 'COL-01',
        description: 'TransacciÃ³n por Lote de Cola AsÃ­ncrona',
        quantity: 1,
        unit_price: 85.00,
        igv_affectation_type: '10'
      }
    ],
    send_now: false // ENCOLA EN SEGUNDO PLANO
  };

  console.log('1. Creando Boleta con send_now: false (Modo Cola AsÃ­ncrona)...');
  const res = await fetch('http://localhost:4001/api/v1/documents', {
    method: 'POST',
    headers: { 'x-api-key': 'fact_demo_key_pro_2026', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const doc = await res.json();
  console.log('Documento creado en estado inicial:', doc.status, 'NÃºmero:', doc.full_number);

  console.log('2. Esperando 5 segundos para que el worker de PostgreSQL SKIP LOCKED procese el trabajo...');
  await new Promise(r => setTimeout(r, 5000));

  console.log('3. Consultando estado del comprobante tras el procesamiento de la cola...');
  const checkRes = await fetch('http://localhost:4001/api/v1/documents/' + doc.id, {
    headers: { 'x-api-key': 'fact_demo_key_pro_2026' }
  });
  const updatedDoc = await checkRes.json();
  console.log('Documento tras worker:', updatedDoc.status);
  console.log('Respuesta SUNAT:', updatedDoc.sunat_description);

  // Consultar estadÃ­sticas de la cola
  const queueStatsRes = await fetch('http://localhost:4001/api/v1/queue/status');
  const stats = await queueStatsRes.json();
  console.log('MÃ©tricas de la cola:', JSON.stringify(stats.counts));
}
testQueue();
