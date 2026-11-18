# ðŸš€ FACT-APPS PRO â€” Sistema & API de FacturaciÃ³n ElectrÃ³nica SUNAT (UBL 2.1)

Plataforma empresarial de FacturaciÃ³n ElectrÃ³nica multi-empresa (Multi-Tenant) diseÃ±ada para integrarse con cualquier ERP, Punto de Venta (POS), CRM o tienda online en minutos.

---

## ðŸ›ï¸ CaracterÃ­sticas Principales y Cumplimiento Normativo

1. **EstÃ¡ndar UBL 2.1 Oficial de SUNAT**:
   - Factura ElectrÃ³nica (`01`) â€” Serie `F001`, `F002`...
   - Boleta de Venta ElectrÃ³nica (`03`) â€” Serie `B001`, `B002`...
   - Nota de CrÃ©dito ElectrÃ³nica (`07`) â€” Serie `FC01`, `BC01`...
   - Nota de DÃ©bito ElectrÃ³nica (`08`) â€” Serie `FD01`, `BD01`...
   - CatÃ¡logos oficiales SUNAT: 01, 02, 05, 06, 07, 09, 10, 51, 52, 59.
   - CÃ¡lculo exacto de impuestos: Gravado (10), Exonerado (20), Inafecto (30), IGV 18% y redondeo oficial a 2 decimales.

2. **Cero Doble FacturaciÃ³n & Bloqueo AtÃ³mico**:
   - Control de correlativos con `SELECT ... FOR UPDATE` a nivel de base de datos en PostgreSQL.
   - Soporte para cabecera `Idempotency-Key`: Si un ERP o POS reenvÃ­a la misma orden o venta por error de red, la API devuelve el comprobante ya emitido sin crear un duplicado ni alterar correlativos.
   - RestricciÃ³n Ãºnica en base de datos: `UNIQUE(company_id, document_type, series, number)` y `UNIQUE(company_id, idempotency_key)`.

3. **Firma Digital C14N & X.509**:
   - CanonicalizaciÃ³n C14N (`http://www.w3.org/TR/2001/REC-xml-c14n-20010315`).
   - Firma enveloped RSA-SHA256 (`http://www.w3.org/2001/04/xmldsig-more#rsa-sha256`).
   - GeneraciÃ³n de Hash SHA-256 (`DigestValue`) de 28 caracteres.
   - CÃ³digo QR oficial SUNAT en base64 para impresiÃ³n.

4. **Sistema de Colas AsÃ­ncronas Transaccionales (PostgreSQL SKIP LOCKED)**:
   - Worker en segundo plano que procesa la tabla `invoice_jobs` con `FOR UPDATE SKIP LOCKED`.
   - Cero pÃ©rdida de trabajos ante caÃ­das de servidor o saturaciÃ³n de SUNAT.
   - Reintentos con Backoff Exponencial (15s, 1m, 5m, 15m, 1h).
   - Despacho de Webhooks: Notifica automÃ¡ticamente al ERP cliente vÃ­a HTTP POST (`DOCUMENT_ACCEPTED`, `DOCUMENT_REJECTED`) con el estado y CDR.

5. **Multi-Tenant / Multi-Empresa**:
   - Cada empresa cuenta con su propia API Key (`x-api-key`), RUC, credenciales SOL, certificado digital y series independientes.
   - Aislamiento estricto de datos por `company_id`.

---

## ðŸ’» Arquitectura TecnolÃ³gica

- **Backend**: NestJS 11, TypeORM, PostgreSQL 18, Axios, AdmZip, xml-crypto, node-forge, Swagger/OpenAPI.
- **Base de Datos**: PostgreSQL (`localhost:5432/fact`, usuario: `postgres`).
- **Frontend**: React 19, Tailwind CSS v4, Lucide Icons, Vite 8.

---

## ðŸ“¡ Endpoints de la API REST

Base URL: `http://localhost:4001/api/v1`
DocumentaciÃ³n Interactiva Swagger: `http://localhost:4001/api/docs`

### AutenticaciÃ³n
Enviar cabecera HTTP:
```http
x-api-key: fact_demo_key_pro_2026
Content-Type: application/json
Idempotency-Key: <uuid-opcional-anti-duplicados>
```

### 1. Emitir Comprobante (Factura / Boleta / Nota)
`POST /api/v1/documents`
```json
{
  "idempotency_key": "order_abc_12345",
  "document_type": "01",
  "series": "F001",
  "currency": "PEN",
  "payment_type": "Contado",
  "client_doc_type": "6",
  "client_doc_number": "20601234567",
  "client_name": "CORPORACION TECNOLOGICA S.A.C.",
  "client_address": "Av. Las Begonias 450, San Isidro",
  "client_email": "facturas@cliente.pe",
  "items": [
    {
      "code": "SRV-01",
      "description": "Licencia Enterprise de Software",
      "unit_measure": "ZZ",
      "quantity": 1,
      "unit_price": 118.00,
      "igv_affectation_type": "10"
    }
  ],
  "send_now": true
}
```

### 2. Descargar XML Firmado UBL 2.1
`GET /api/v1/documents/:id/xml`
Retorna el archivo XML con la firma digital X.509 y DigestValue embebidos.

### 3. Descargar CDR de SUNAT (Constancia de RecepciÃ³n)
`GET /api/v1/documents/:id/cdr`
Retorna el XML del CDR emitido por SUNAT con el cÃ³digo de respuesta y descripciÃ³n oficial.

### 4. RepresentaciÃ³n Impresa (PDF / HTML)
`GET /api/v1/documents/:id/html?format=A4` o `format=TICKET`
Retorna la representaciÃ³n grÃ¡fica lista para impresiÃ³n o renderizado en hoja A4 o ticket termal de 80mm con cÃ³digo QR y Hash.

### 5. Reintento Manual
`POST /api/v1/documents/:id/retry`
Reintenta el envÃ­o de un comprobante que quedÃ³ en cola o tuvo problemas temporales con SUNAT.

### 6. Monitor de Colas
`GET /api/v1/queue/status`
`POST /api/v1/queue/trigger`

---

## ðŸ› ï¸ EjecuciÃ³n de la Plataforma

### Iniciar Backend:
```powershell
cd fact-backend
npm run start:prod
# Servidor escuchando en http://localhost:4001
# Swagger UI en http://localhost:4001/api/docs
```

### Iniciar Frontend:
```powershell
cd fact-frontend
npm run dev
# Dashboard disponible en http://localhost:5174
```

