async function testIdempotency() {
  const payload = {
    idempotency_key: 'erp_sale_order_998877',
    document_type: '01',
    series: 'F001',
    client_doc_type: '6',
    client_doc_number: '20100070970',
    client_name: 'SUPERMERCADOS PERUANOS S.A.',
    client_address: 'Calle Morelli 181, San Borja',
    currency: 'PEN',
    payment_type: 'Contado',
    items: [
      {
        code: 'ITEM-IDEMP',
        description: 'Servicio de integraciÃ³n con ERP',
        quantity: 1,
        unit_price: 590.00,
        igv_affectation_type: '10'
      }
    ],
    send_now: true
  };

  console.log('1. Enviando primera llamada con idempotency_key...');
  const res1 = await fetch('http://localhost:4001/api/v1/documents', {
    method: 'POST',
    headers: { 'x-api-key': 'fact_demo_key_pro_2026', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data1 = await res1.json();
  console.log('Llamada 1 -> ID:', data1.id, 'NÃºmero:', data1.full_number);

  console.log('2. Enviando segunda llamada EXACTA con la misma idempotency_key...');
  const res2 = await fetch('http://localhost:4001/api/v1/documents', {
    method: 'POST',
    headers: { 'x-api-key': 'fact_demo_key_pro_2026', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data2 = await res2.json();
  console.log('Llamada 2 -> ID:', data2.id, 'NÃºmero:', data2.full_number);

  if (data1.id === data2.id && data1.full_number === data2.full_number) {
    console.log('>>> Ã‰XITO TOTAL: La idempotencia protegiÃ³ contra doble facturaciÃ³n!');
  } else {
    console.error('>>> FALLO: Se generÃ³ un duplicado!');
  }
}
testIdempotency();
