async function testNubefactEngine() {
  console.log('=== TEST 1: EMISIÃ“N COMPATIBLE CON NUBEFACT JSON ===');
  const nubefactPayload = {
    operacion: 'generar_comprobante',
    tipo_de_comprobante: 1, // 1: Factura
    serie: 'FFF1',
    numero: null, // AsignaciÃ³n automÃ¡tica atÃ³mica
    cliente_tipo_de_documento: 6, // RUC
    cliente_numero_de_documento: '20100070970', // SUPERMERCADOS PERUANOS (RUC VÃ¡lido MÃ³dulo 11)
    cliente_denominacion: 'SUPERMERCADOS PERUANOS SOCIEDAD ANONIMA',
    cliente_direccion: 'Calle Morelli 181, San Borja, Lima',
    cliente_email: 'contabilidad@spsa.pe',
    fecha_de_emision: '2026-09-28',
    moneda: 1, // Soles
    porcentaje_de_igv: 18.0,
    forma_de_pago: 'Contado',
    items: [
      {
        codigo: 'POS-LIC-01',
        descripcion: 'Licencia Servidor FacturaciÃ³n API Multi-Empresa',
        unidad_de_medida: 'NIU',
        cantidad: 1,
        valor_unitario: 500.00,
        precio_unitario: 590.00,
        tipo_de_igv: 1, // Gravado
        subtotal: 500.00,
        total: 590.00
      }
    ],
    enviar_automaticamente_a_la_sunat: true
  };

  const res1 = await fetch('http://localhost:4001/api/v1/nubefact', {
    method: 'POST',
    headers: {
      'x-api-key': 'fact_demo_key_pro_2026',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(nubefactPayload)
  });

  const data1 = await res1.json();
  console.log('Respuesta Nubefact Format:');
  console.log('Serie - NÃºmero:', data1.serie + '-' + data1.numero);
  console.log('Aceptada por SUNAT:', data1.aceptada_por_sunat);
  console.log('DescripciÃ³n SUNAT:', data1.sunat_description);
  console.log('CÃ³digo Hash SHA-256:', data1.codigo_hash);
  console.log('Enlace PDF A4:', data1.enlace_del_pdf);
  console.log('Enlace Ticket 80mm:', data1.enlace_del_ticket);
  console.log('Enlace XML:', data1.enlace_del_xml);
  console.log('Enlace CDR:', data1.enlace_del_cdr);

  console.log('\n=== TEST 2: VALIDACIÃ“N MATEMÃTICA RUC MÃ“DULO 11 (CERO ERRORES) ===');
  const invalidRucPayload = {
    ...nubefactPayload,
    cliente_numero_de_documento: '20999999999' // RUC InvÃ¡lido
  };

  const res2 = await fetch('http://localhost:4001/api/v1/nubefact', {
    method: 'POST',
    headers: {
      'x-api-key': 'fact_demo_key_pro_2026',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(invalidRucPayload)
  });

  const data2 = await res2.json();
  console.log('Status HTTP RUC invÃ¡lido:', res2.status);
  console.log('Errores interceptados antes de SUNAT:', data2.message?.errors || data2.message);

  console.log('\n=== TEST 3: CONSULTA EN VIVO DE RUC Y DNI ===');
  const rucRes = await fetch('http://localhost:4001/api/v1/consultas/ruc/20100070970');
  const rucData = await rucRes.json();
  console.log('Consulta RUC:', rucData.ruc, '-', rucData.razon_social, '-', rucData.estado, '-', rucData.condicion);
}
testNubefactEngine();
