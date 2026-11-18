import { useState } from 'react';
import {
  Key,
  Copy,
  Check,
  Zap,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Building2,
  Terminal,
  HelpCircle,
  Code2,
  ExternalLink,
  Activity,
  FileCode,
  Layers,
  ArrowRightLeft,
  Sparkles
} from 'lucide-react';

interface Company {
  id: string;
  ruc: string;
  razon_social: string;
  nombre_comercial?: string;
  direccion: string;
  ubigeo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  sol_user: string;
  env_mode: 'BETA' | 'PRODUCCION';
  api_key: string;
  webhook_url?: string;
}

interface IntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  apiBase: string;
  onCompanyUpdated?: (updated: Company) => void;
}

/**
 * ============================================================================
 * CCOFACT PRO - MODAL DE VARIABLES DE INTEGRACIÓN EXTERNA Y API KEYS
 * ============================================================================
 * Proporciona a clientes y desarrolladores credenciales reales, endpoints,
 * ejemplos de código (cURL, JS/Node, PHP, Python), snippets para Control Finanzas,
 * conmutación instantánea entre BETA y PRODUCCIÓN (fact_live_ vs fact_test_),
 * y pruebas de conectividad en vivo en tiempo real.
 */
export function IntegrationModal({ isOpen, onClose, company, apiBase, onCompanyUpdated }: IntegrationModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [testingPing, setTestingPing] = useState(false);
  const [testingEmission, setTestingEmission] = useState(false);
  const [switchingEnv, setSwitchingEnv] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'control_finanzas' | 'curl' | 'js' | 'php' | 'python' | 'env' | 'guia'>('control_finanzas');

  if (!isOpen || !company) return null;

  const isProduction = company.env_mode === 'PRODUCCION';
  const ccofactEmitirUrl = `${apiBase}/ccofact/emitir`;
  const ccofactStatusUrl = `${apiBase}/ccofact/status`;
  const swaggerDocsUrl = `${apiBase.replace('/api/v1', '')}/api/docs`;

  const copyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2200);
  };

  // Conmutar entorno instantáneo entre BETA y PRODUCCIÓN
  const handleToggleEnvironment = async () => {
    const targetEnv = isProduction ? 'BETA' : 'PRODUCCION';
    setSwitchingEnv(true);
    setTestResult(null);
    try {
      const res = await fetch(`${apiBase}/companies/${company.id}/switch-env`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          env_mode: targetEnv,
        }),
      });

      const updated = await res.json();
      if (!res.ok) {
        throw new Error(updated.message || 'Error al conmutar entorno');
      }

      if (onCompanyUpdated) {
        onCompanyUpdated(updated);
      }

      setTestResult({
        success: true,
        message: targetEnv === 'PRODUCCION'
          ? `¡NEGOCIO CONMUTADO A PRODUCCIÓN SUNAT! Se ha generado tu API Key Oficial con prefijo fact_live_ (${updated.api_key}). Tus comprobantes tendrán validez legal y fiscal inmediata.`
          : `¡Negocio conmutado a ambiente BETA (Pruebas)! Se ha generado tu API Key de homologación (${updated.api_key}).`,
        data: updated,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Fallo al cambiar de entorno: ${err.message}`,
      });
    } finally {
      setSwitchingEnv(false);
    }
  };

  // Variables para Control Finanzas y Sistemas Externos
  const controlFinanzasConfig = {
    hasElectronicBilling: true,
    businessRuc: company.ruc,
    businessName: company.nombre_comercial || company.razon_social,
    businessReason: company.razon_social,
    ccofactUrl: ccofactEmitirUrl,
    ccofactApiKey: company.api_key,
    // Compatibilidad con campos existentes de Control Finanzas:
    nubefactUrl: ccofactEmitirUrl,
    nubefactToken: company.api_key,
  };

  const envFormat = `# =====================================================================
# VARIABLES CCOFACT PRO - MOTOR DE FACTURACIÓN ELECTRÓNICA SOBERANO
# EMPRESA: ${company.razon_social} (RUC: ${company.ruc})
# ENTORNO: ${company.env_mode} (${isProduction ? 'PRODUCCIÓN SUNAT OFICIAL' : 'BETA PRUEBAS'})
# =====================================================================
HAS_ELECTRONIC_BILLING=true
BUSINESS_RUC=${company.ruc}
BUSINESS_NAME="${company.nombre_comercial || company.razon_social}"
BUSINESS_REASON="${company.razon_social}"
CCOFACT_ENV_MODE=${company.env_mode}
CCOFACT_EMITIR_URL=${ccofactEmitirUrl}
CCOFACT_STATUS_URL=${ccofactStatusUrl}
CCOFACT_API_KEY=${company.api_key}
# Compatibilidad con formulario existente de Control Finanzas:
NUBEFACT_URL=${ccofactEmitirUrl}
NUBEFACT_TOKEN=${company.api_key}
`;

  const curlSnippet = `# 1. Ping / Verificación de API Key y Series Activas (GET)
curl -X GET "${ccofactStatusUrl}" \\
  -H "x-api-key: ${company.api_key}"

# 2. Emisión de Boleta Electrónica de Venta (POST)
curl -X POST "${ccofactEmitirUrl}" \\
  -H "x-api-key: ${company.api_key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tipo_comprobante": "03",
    "serie": "B001",
    "moneda": "PEN",
    "forma_pago": "Contado",
    "cliente": {
      "tipo_documento": "1",
      "numero_documento": "77084232",
      "razon_social": "DAVID CCOPA YAPURA",
      "direccion": "TAMBOPATA, MADRE DE DIOS"
    },
    "items": [
      {
        "codigo": "PROD-001",
        "descripcion": "Zapatillas Deportivas Modelo Pro",
        "unidad_medida": "NIU",
        "cantidad": 1,
        "precio_unitario": 120.00,
        "tipo_afectacion_igv": "10"
      }
    ],
    "enviar_a_sunat_inmediato": ${isProduction ? 'true' : 'false'}
  }'`;

  const jsSnippet = `// Integración CCOFACT PRO con JavaScript / TypeScript / Node.js
async function emitirComprobante() {
  const url = '${ccofactEmitirUrl}';
  const apiKey = '${company.api_key}';

  const payload = {
    tipo_comprobante: '03', // '01' Factura, '03' Boleta, '07' Nota Crédito
    serie: 'B001',
    moneda: 'PEN',
    forma_pago: 'Contado',
    cliente: {
      tipo_documento: '1', // 1=DNI, 6=RUC, 0=Sin Doc
      numero_documento: '77084232',
      razon_social: 'DAVID CCOPA YAPURA',
      direccion: 'TAMBOPATA, MADRE DE DIOS',
    },
    items: [
      {
        codigo: 'PROD-001',
        descripcion: 'Producto o Servicio Profesional',
        unidad_medida: 'NIU',
        cantidad: 1,
        precio_unitario: 120.00,
        tipo_afectacion_igv: '10', // 10=Gravado IGV
      },
    ],
    enviar_a_sunat_inmediato: ${isProduction ? 'true' : 'false'},
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (data.exito) {
    console.log('Comprobante emitido:', data.comprobante.numero_completo);
    console.log('PDF A4:', data.recursos.pdf_a4);
    console.log('Ticket POS:', data.recursos.ticket_pos_80mm);
    console.log('Hash SUNAT:', data.sunat.codigo_hash);
  } else {
    console.error('Error al emitir:', data.mensaje);
  }
}

emitirComprobante();`;

  const phpSnippet = `<?php
// Integración CCOFACT PRO en PHP / Laravel / WordPress
$apiKey = '${company.api_key}';
$apiUrl = '${ccofactEmitirUrl}';

$payload = [
    'tipo_comprobante' => '03', // 01=Factura, 03=Boleta
    'serie'            => 'B001',
    'moneda'           => 'PEN',
    'forma_pago'       => 'Contado',
    'cliente'          => [
        'tipo_documento'   => '1',
        'numero_documento' => '77084232',
        'razon_social'     => 'DAVID CCOPA YAPURA',
        'direccion'        => 'TAMBOPATA, MADRE DE DIOS'
    ],
    'items'            => [
        [
            'codigo'              => 'PROD-001',
            'descripcion'         => 'Producto Ejemplo CCOFACT',
            'unidad_medida'       => 'NIU',
            'cantidad'            => 1,
            'precio_unitario'     => 120.00,
            'tipo_afectacion_igv' => '10'
        ]
    ],
    'enviar_a_sunat_inmediato' => ${isProduction ? 'true' : 'false'}
];

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-api-key: ' . $apiKey
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$resultado = json_decode($response, true);
if ($resultado['exito'] ?? false) {
    echo "Emitido: " . $resultado['comprobante']['numero_completo'] . "\\n";
    echo "PDF: " . $resultado['recursos']['pdf_a4'] . "\\n";
} else {
    echo "Error: " . ($resultado['mensaje'] ?? 'Fallo de emisión') . "\\n";
}
?>`;

  const pythonSnippet = `# Integración CCOFACT PRO en Python / Django / FastAPI
import requests

API_URL = "${ccofactEmitirUrl}"
API_KEY = "${company.api_key}"

payload = {
    "tipo_comprobante": "03",
    "serie": "B001",
    "moneda": "PEN",
    "forma_pago": "Contado",
    "cliente": {
        "tipo_documento": "1",
        "numero_documento": "77084232",
        "razon_social": "DAVID CCOPA YAPURA",
        "direccion": "TAMBOPATA, MADRE DE DIOS"
    },
    "items": [
        {
            "codigo": "PROD-001",
            "descripcion": "Producto Ejemplo CCOFACT",
            "unidad_medida": "NIU",
            "cantidad": 1,
            "precio_unitario": 120.00,
            "tipo_afectacion_igv": "10"
        }
    ],
    "enviar_a_sunat_inmediato": ${isProduction ? 'True' : 'False'}
}

headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}

response = requests.post(API_URL, json=payload, headers=headers)
data = response.json()

if response.status_code == 200 and data.get("exito"):
    print(f"Comprobante: {data['comprobante']['numero_completo']}")
    print(f"PDF A4: {data['recursos']['pdf_a4']}")
    print(f"Ticket 80mm: {data['recursos']['ticket_pos_80mm']}")
else:
    print(f"Error: {data.get('mensaje') or response.text}")`;

  // Test 1: Ping / Health Check (GET /ccofact/status)
  const handleTestPing = async () => {
    setTestingPing(true);
    setTestResult(null);
    try {
      const res = await fetch(ccofactStatusUrl, {
        method: 'GET',
        headers: {
          'x-api-key': company.api_key,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.online) {
        throw new Error(data.message || 'El servidor no devolvió estado online');
      }

      const seriesCount = data.company?.series_activas?.length || 0;
      setTestResult({
        success: true,
        message: `¡API Key 100% Válida y Activa! Motor CCOFACT PRO Online (${data.engine} v${data.version}). Entorno: ${data.company?.env_mode || company.env_mode}. ${seriesCount} series tributarias activas asignadas a ${data.company?.razon_social || company.razon_social}.`,
        data: data.company,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Fallo en verificación de API Key: ${err.message}`,
      });
    } finally {
      setTestingPing(false);
    }
  };

  // Test 2: Emisión Real de Comprobante (POST /ccofact/emitir)
  const handleTestEmission = async () => {
    setTestingEmission(true);
    setTestResult(null);
    try {
      const res = await fetch(ccofactEmitirUrl, {
        method: 'POST',
        headers: {
          'x-api-key': company.api_key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo_comprobante: '03',
          serie: 'B001',
          moneda: 'PEN',
          forma_pago: 'Contado',
          cliente: {
            tipo_documento: '0',
            numero_documento: '00000000',
            razon_social: 'CLIENTE TEST INTEGRACION',
            direccion: 'LIMA, PERU',
          },
          items: [
            {
              codigo: 'PING-01',
              descripcion: 'Prueba de Conexión de API CCOFACT PRO',
              unidad_medida: 'NIU',
              cantidad: 1,
              precio_unitario: 10.00,
              tipo_afectacion_igv: '10',
            },
          ],
          enviar_a_sunat_inmediato: false,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.exito === false) {
        throw new Error(data.mensaje || data.error || 'Respuesta no exitosa');
      }

      setTestResult({
        success: true,
        message: `¡Comprobante ${data.comprobante?.numero_completo} emitido exitosamente con firma digital en ${data.tiempo_procesamiento_ms || 35}ms! Hash: ${data.sunat?.codigo_hash?.substring(0, 15)}...`,
        data: data.comprobante,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Fallo en prueba de emisión: ${err.message}`,
      });
    } finally {
      setTestingEmission(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full my-8 shadow-2xl overflow-hidden flex flex-col text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header con Degradado Tecnológico Luminoso */}
        <div className={`p-6 text-white flex items-start justify-between relative overflow-hidden transition-colors duration-300 ${
          isProduction
            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700'
            : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700'
        }`}>
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3.5 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner border border-white/20">
              <Key className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl font-bold tracking-tight">API de Facturación Electrónica SUNAT</h3>
                <span className={`text-[11px] font-extrabold px-3 py-0.5 rounded-full border shadow-xs flex items-center gap-1.5 ${
                  isProduction
                    ? 'bg-emerald-400 text-slate-900 border-white/50 animate-pulse'
                    : 'bg-amber-400 text-slate-900 border-white/50'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isProduction ? 'bg-emerald-950' : 'bg-amber-950'}`} />
                  {isProduction ? 'PRODUCCIÓN EN VIVO' : 'BETA PRUEBAS'}
                </span>
              </div>
              <p className="text-xs text-indigo-100 mt-1 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-white/80" />
                <span className="font-semibold text-white">{company.razon_social}</span>
                <span className="text-white/60">•</span>
                <span>RUC:</span>
                <span className="font-mono bg-white/20 px-1.5 py-0.5 rounded font-bold text-white">{company.ruc}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <a
              href={swaggerDocsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl border border-white/25 transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Swagger Docs</span>
            </a>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/15 transition cursor-pointer text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Panel Interactivo de Conmutación de Entorno (BETA / PRODUCCIÓN) */}
        <div className={`px-6 py-3.5 border-b flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-colors duration-200 ${
          isProduction
            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/90 border-amber-200 text-amber-950'
        }`}>
          <div className="flex items-center gap-2.5">
            {isProduction ? (
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <div>
              <span className="font-bold block">
                {isProduction
                  ? 'Entorno Actual: PRODUCCIÓN OFICIAL SUNAT (Llave: fact_live_)'
                  : 'Entorno Actual: BETA / HOMOLOGACIÓN (Llave: fact_test_)'}
              </span>
              <p className="text-[11px] opacity-80">
                {isProduction
                  ? 'Todos los comprobantes emitidos desde Control Finanzas o su sistema tienen plena validez legal y tributaria ante SUNAT.'
                  : 'Modo de prueba seguro sin validez tributaria ante SUNAT. Cambia a PRODUCCIÓN para emitir comprobantes legales.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleEnvironment}
            disabled={switchingEnv}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition shrink-0 cursor-pointer disabled:opacity-50 ${
              isProduction
                ? 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/20'
            }`}
          >
            {switchingEnv ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowRightLeft className="w-3.5 h-3.5" />
            )}
            <span>
              {switchingEnv
                ? 'Cambiando...'
                : isProduction
                ? 'Pasar a Modo BETA (Pruebas)'
                : '🚀 Pasar a PRODUCCIÓN (Generar fact_live_)'}
            </span>
          </button>
        </div>

        {/* Barra de Sub-Tabs de Integración */}
        <div className="flex border-b border-slate-200 bg-slate-50/90 px-6 gap-2 pt-2.5 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('control_finanzas')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'control_finanzas'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Control Finanzas
          </button>
          <button
            onClick={() => setActiveSubTab('curl')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'curl'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-500" />
            cURL / Terminal
          </button>
          <button
            onClick={() => setActiveSubTab('js')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'js'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-600" />
            JavaScript / Node
          </button>
          <button
            onClick={() => setActiveSubTab('php')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'php'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-violet-600" />
            PHP / Laravel
          </button>
          <button
            onClick={() => setActiveSubTab('python')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'python'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            Python
          </button>
          <button
            onClick={() => setActiveSubTab('env')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'env'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            .ENV / JSON
          </button>
          <button
            onClick={() => setActiveSubTab('guia')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'guia'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            Guía Paso a Paso
          </button>
        </div>

        {/* Contenido del Modal */}
        <div className="p-6 space-y-6 max-h-[66vh] overflow-y-auto">
          
          {/* Bloque Superior de Credenciales Claves */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* URL Emisión */}
            <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/80 p-4 rounded-2xl border border-indigo-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-600" />
                  URL de Emisión (POST)
                </span>
                <button
                  onClick={() => copyText(ccofactEmitirUrl, 'url_emitir')}
                  className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded-lg border border-indigo-200 shadow-2xs"
                >
                  {copiedField === 'url_emitir' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'url_emitir' ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>
              <div className="font-mono text-xs text-indigo-950 bg-white p-2.5 rounded-xl border border-indigo-200 font-semibold break-all select-all">
                {ccofactEmitirUrl}
              </div>
              <p className="text-[10px] text-slate-500">
                Pégalo en el campo <strong>URL Facturación</strong> de Control Finanzas
              </p>
            </div>

            {/* API Key */}
            <div className={`p-4 rounded-2xl border space-y-2 transition-colors ${
              isProduction
                ? 'bg-gradient-to-br from-emerald-50/90 to-teal-50/90 border-emerald-300'
                : 'bg-gradient-to-br from-amber-50/80 to-orange-50/80 border-amber-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isProduction ? 'text-emerald-950' : 'text-amber-900'
                }`}>
                  <Key className={`w-3.5 h-3.5 ${isProduction ? 'text-emerald-600' : 'text-amber-600'}`} />
                  {isProduction ? 'API Key Oficial (PRODUCCIÓN)' : 'API Key de Pruebas (BETA)'}
                </span>
                <button
                  onClick={() => copyText(company.api_key, 'api_key_field')}
                  className={`text-xs font-bold flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded-lg border shadow-2xs ${
                    isProduction
                      ? 'text-emerald-800 hover:text-emerald-950 border-emerald-200'
                      : 'text-amber-800 hover:text-amber-950 border-amber-200'
                  }`}
                >
                  {copiedField === 'api_key_field' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'api_key_field' ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>
              <div className={`font-mono text-xs bg-white p-2.5 rounded-xl border font-bold break-all select-all ${
                isProduction ? 'text-emerald-950 border-emerald-200' : 'text-amber-950 border-amber-200'
              }`}>
                {company.api_key}
              </div>
              <p className="text-[10px] text-slate-500">
                Pégalo en el campo <strong>Token / Llave</strong> de Control Finanzas
              </p>
            </div>
          </div>

          {/* TAB 1: VARIABLES CONTROL FINANZAS */}
          {activeSubTab === 'control_finanzas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Configuración para Control Finanzas (Ajustes Fiscales)
                </span>
                <button
                  onClick={() => copyText(JSON.stringify(controlFinanzasConfig, null, 2), 'all_cf')}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
                >
                  {copiedField === 'all_cf' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'all_cf' ? '¡Copiado!' : 'Copiar Todo (JSON)'}</span>
                </button>
              </div>

              {/* Grid de Variables Claras */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Variable: Facturación Activa */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="font-mono text-indigo-700 font-bold">hasElectronicBilling</span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">Activo</span>
                  </div>
                  <div className="font-mono text-slate-900 text-sm font-bold flex items-center justify-between">
                    <span>true</span>
                    <button
                      onClick={() => copyText('true', 'hasElectronicBilling')}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Copiar"
                    >
                      {copiedField === 'hasElectronicBilling' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">Interruptor de facturación en Control Finanzas</p>
                </div>

                {/* Variable: RUC */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="font-mono text-indigo-700 font-bold">businessRuc</span>
                    <span className="text-[10px] text-slate-500">11 Dígitos</span>
                  </div>
                  <div className="font-mono text-slate-900 text-sm font-bold flex items-center justify-between">
                    <span>{company.ruc}</span>
                    <button
                      onClick={() => copyText(company.ruc, 'businessRuc')}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Copiar"
                    >
                      {copiedField === 'businessRuc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">RUC del negocio emisor</p>
                </div>

                {/* Variable: Nombre Comercial */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="font-mono text-indigo-700 font-bold">businessName</span>
                    <span className="text-[10px] text-slate-500">Comercial</span>
                  </div>
                  <div className="font-sans text-slate-900 text-sm font-semibold flex items-center justify-between truncate">
                    <span className="truncate">{company.nombre_comercial || company.razon_social}</span>
                    <button
                      onClick={() => copyText(company.nombre_comercial || company.razon_social, 'businessName')}
                      className="text-slate-400 hover:text-slate-700 shrink-0 ml-2 cursor-pointer"
                      title="Copiar"
                    >
                      {copiedField === 'businessName' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">Nombre comercial en comprobantes</p>
                </div>

                {/* Variable: Razón Social */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="font-mono text-indigo-700 font-bold">businessReason</span>
                    <span className="text-[10px] text-slate-500">Fiscal</span>
                  </div>
                  <div className="font-sans text-slate-900 text-sm font-semibold flex items-center justify-between truncate">
                    <span className="truncate">{company.razon_social}</span>
                    <button
                      onClick={() => copyText(company.razon_social, 'businessReason')}
                      className="text-slate-400 hover:text-slate-700 shrink-0 ml-2 cursor-pointer"
                      title="Copiar"
                    >
                      {copiedField === 'businessReason' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">Razón social oficial ante SUNAT</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: cURL / Postman */}
          {activeSubTab === 'curl' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Comandos cURL para Terminal o Postman:</span>
                <button
                  onClick={() => copyText(curlSnippet, 'raw_curl')}
                  className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-1.5 rounded-xl cursor-pointer"
                >
                  {copiedField === 'raw_curl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'raw_curl' ? '¡Copiado!' : 'Copiar cURL'}</span>
                </button>
              </div>
              <pre className="text-xs font-mono bg-slate-950 p-4 rounded-2xl text-emerald-300 overflow-x-auto shadow-inner leading-relaxed border border-slate-800">
                {curlSnippet}
              </pre>
            </div>
          )}

          {/* TAB 3: JAVASCRIPT / NODE */}
          {activeSubTab === 'js' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Código JavaScript / TypeScript / Fetch:</span>
                <button
                  onClick={() => copyText(jsSnippet, 'raw_js')}
                  className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-1.5 rounded-xl cursor-pointer"
                >
                  {copiedField === 'raw_js' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'raw_js' ? '¡Copiado!' : 'Copiar JS'}</span>
                </button>
              </div>
              <pre className="text-xs font-mono bg-slate-950 p-4 rounded-2xl text-amber-200 overflow-x-auto shadow-inner leading-relaxed border border-slate-800">
                {jsSnippet}
              </pre>
            </div>
          )}

          {/* TAB 4: PHP / LARAVEL */}
          {activeSubTab === 'php' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Script PHP / Laravel / WordPress:</span>
                <button
                  onClick={() => copyText(phpSnippet, 'raw_php')}
                  className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-1.5 rounded-xl cursor-pointer"
                >
                  {copiedField === 'raw_php' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'raw_php' ? '¡Copiado!' : 'Copiar PHP'}</span>
                </button>
              </div>
              <pre className="text-xs font-mono bg-slate-950 p-4 rounded-2xl text-violet-300 overflow-x-auto shadow-inner leading-relaxed border border-slate-800">
                {phpSnippet}
              </pre>
            </div>
          )}

          {/* TAB 5: PYTHON */}
          {activeSubTab === 'python' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Script Python (Requests):</span>
                <button
                  onClick={() => copyText(pythonSnippet, 'raw_python')}
                  className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-1.5 rounded-xl cursor-pointer"
                >
                  {copiedField === 'raw_python' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'raw_python' ? '¡Copiado!' : 'Copiar Python'}</span>
                </button>
              </div>
              <pre className="text-xs font-mono bg-slate-950 p-4 rounded-2xl text-blue-300 overflow-x-auto shadow-inner leading-relaxed border border-slate-800">
                {pythonSnippet}
              </pre>
            </div>
          )}

          {/* TAB 6: .ENV & JSON */}
          {activeSubTab === 'env' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Variables de Entorno .ENV:</span>
                  <button
                    onClick={() => copyText(envFormat, 'raw_env')}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    {copiedField === 'raw_env' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copiar .ENV</span>
                  </button>
                </div>
                <pre className="text-xs font-mono bg-slate-900 p-4 rounded-2xl text-indigo-300 overflow-x-auto whitespace-pre shadow-inner">
                  {envFormat}
                </pre>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Formato Objeto JSON:</span>
                  <button
                    onClick={() => copyText(JSON.stringify(controlFinanzasConfig, null, 2), 'raw_json')}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    {copiedField === 'raw_json' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copiar JSON</span>
                  </button>
                </div>
                <pre className="text-xs font-mono bg-slate-900 p-4 rounded-2xl text-emerald-300 overflow-x-auto shadow-inner">
                  {JSON.stringify(controlFinanzasConfig, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 7: GUÍA PASO A PASO */}
          {activeSubTab === 'guia' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-bold text-slate-900 text-sm">Cómo registrar estas variables en Control Finanzas:</h4>
              
              <div className="space-y-3">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 text-xs shadow-xs">1</div>
                  <div>
                    <span className="font-bold text-slate-900 block">Abre tu sistema Control Finanzas</span>
                    <p className="text-slate-600 mt-0.5">Ingresa al panel del negocio y dirígete al menú lateral <strong>Configuración</strong> o <strong>Facturación Electrónica</strong>.</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 text-xs shadow-xs">2</div>
                  <div>
                    <span className="font-bold text-slate-900 block">Abre el Modal "Configurar Facturación"</span>
                    <p className="text-slate-600 mt-0.5">Haz clic en el botón <strong>"Configurar Facturación"</strong> o <strong>"Ajustes Fiscales"</strong>.</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 text-xs shadow-xs">3</div>
                  <div>
                    <span className="font-bold text-slate-900 block">Pega las credenciales</span>
                    <ul className="list-disc list-inside mt-1 space-y-1 text-slate-700 font-mono text-[11px]">
                      <li>Activa el interruptor <strong>Habilitar Facturación Electrónica</strong></li>
                      <li>URL Facturación: <code className="text-indigo-700 font-bold">{ccofactEmitirUrl}</code></li>
                      <li>Token / API Key: <code className="text-emerald-700 font-bold">{company.api_key}</code></li>
                      <li>RUC: <code className="text-slate-900 font-bold">{company.ruc}</code></li>
                    </ul>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 text-xs shadow-xs">4</div>
                  <div>
                    <span className="font-bold text-slate-900 block">Guarda y ¡Listo para Facturar!</span>
                    <p className="text-slate-600 mt-0.5">Haz clic en <strong>Guardar</strong>. Cada venta como Boleta o Factura en Control Finanzas se enviará a CCOFACT PRO, se firmará digitalmente con SUNAT y devolverá el PDF en formato A4 y Ticket POS al instante.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Panel de Pruebas de Conectividad en Vivo (Dual: Ping Status y Emisión) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Consola de Verificación en Vivo
                </h4>
                <p className="text-[11px] text-slate-500">
                  Prueba la validez del API Key antes de entregarla al cliente
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Botón 1: Ping Status (Sin correlativo) */}
                <button
                  type="button"
                  onClick={handleTestPing}
                  disabled={testingPing || testingEmission}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
                >
                  {testingPing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                  <span>{testingPing ? 'Verificando...' : '1. Probar Ping (GET)'}</span>
                </button>

                {/* Botón 2: Emisión Real de Prueba */}
                <button
                  type="button"
                  onClick={handleTestEmission}
                  disabled={testingPing || testingEmission}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
                >
                  {testingEmission ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>{testingEmission ? 'Emitiendo...' : '2. Emitir Prueba (POST)'}</span>
                </button>
              </div>
            </div>

            {/* Resultado del Test en Vivo */}
            {testResult && (
              <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 animate-in fade-in duration-150 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <span className="font-bold block text-[13px]">{testResult.success ? 'Conexión Exitosa' : 'Fallo en la Prueba'}</span>
                  <p className="leading-relaxed">{testResult.message}</p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Corporación Ccoplex S.A.C. • CCOFACT PRO Enterprise Engine
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
          >
            Entendido / Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
