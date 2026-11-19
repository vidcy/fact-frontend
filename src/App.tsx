import React, { useState, useEffect } from 'react';
import {
  FileText,
  Send,
  CheckCircle2,
  Clock,
  Building2,
  Key,
  Printer,
  Download,
  Plus,
  Trash2,
  RefreshCw,
  Code2,
  Copy,
  Receipt,
  RotateCw,
  ShieldCheck,
  Check,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Hash,
  Search,
  Zap,
  Award,
  LogOut,
  AlertCircle,
  Info,
  Cloud,
  Ban,
  Users,
  BarChart3,
} from 'lucide-react';
import { IntegrationModal } from './components/IntegrationModal';
import { CompanyFormModal } from './components/CompanyFormModal';
import { FiscalAuthenticatorModal } from './components/FiscalAuthenticatorModal';
import { AdminLogin } from './components/AdminLogin';
import { ConfirmModal } from './components/ConfirmModal';
import { UsersManagement } from './components/UsersManagement';

// ============================================================================
// CONSTANTES GLOBALES Y URL DE API (SOPORTA LOCALHOST Y VERCEL PRODUCTION)
// ============================================================================
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4001/api/v1';

// ============================================================================
// INTERFACES TIPADAS (TypeScript Estricto)
// ============================================================================
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
  sol_pass?: string;
  env_mode: 'BETA' | 'PRODUCCION';
  api_key: string;
  webhook_url?: string;
  certificate_pfx_base64?: string;
  certificate_password?: string;
  certificate_filename?: string;
  certificate_url?: string;
  certificate_expires_at?: string;
  certificate_subject?: string;
  certificate_issuer?: string;
  series_list?: Array<{ document_type: string; series: string; current_number: number }>;
}

interface DocumentItem {
  code: string;
  description: string;
  unit_measure: string;
  quantity: number;
  unit_price: number;
  igv_affectation_type: string;
}

interface DocumentRecord {
  id: string;
  document_type: string;
  series: string;
  number: number;
  full_number: string;
  issue_date: string;
  issue_time: string;
  currency: string;
  client_doc_type: string;
  client_doc_number: string;
  client_name: string;
  total_gravada: string | number;
  total_igv: string | number;
  total_amount: string | number;
  status: string;
  sunat_response_code?: string;
  sunat_description?: string;
  xml_digest_value?: string;
  qr_data?: string;
  created_at: string;
}

/**
 * ============================================================================
 * CCOFACT PRO - APLICACIÓN PRINCIPAL (TEMA CLARO & PANEL ADMINISTRATIVO MAESTRO)
 * ============================================================================
 */
export function App() {
  // 1. Estado de Autenticación de Administrador Maestro
  const [adminUser, setAdminUser] = useState<any>(() => {
    const saved = localStorage.getItem('ccofact_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('ccofact_admin_token') || null;
  });

  // 2. Navegación Principal por Pestañas
  const [activeTab, setActiveTab] = useState<'dashboard' | 'emitir' | 'documentos' | 'colas' | 'empresas' | 'usuarios' | 'api' | 'consola' | 'guia_sunat'>('dashboard');

  // 3. Empresas y Emisor Activo Multi-Tenant
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);

  // 4. Documentos y Colas
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [queueStats, setQueueStats] = useState<any>({ counts: [], recentJobs: [] });

  // 5. Modales Operativos y Alertas de Confirmación Estricta
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [integrationCompany, setIntegrationCompany] = useState<Company | null>(null);
  const [showCompanyFormModal, setShowCompanyFormModal] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);
  const [showFiscalModal, setShowFiscalModal] = useState(false);
  const [fiscalAuditCompanyId, setFiscalAuditCompanyId] = useState<string | null>(null);
  const [diagnosticDoc, setDiagnosticDoc] = useState<DocumentRecord | null>(null);

  // Sistema Centralizado de Confirmación y Alertas Visuales
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    message: React.ReactNode;
    variant?: 'danger' | 'warning' | 'primary' | 'success';
    confirmText?: string;
    cancelText?: string;
    details?: Array<{ label: string; value: React.ReactNode }>;
    requireCheckbox?: boolean;
    checkboxLabel?: string;
    loading?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [feedbackAlert, setFeedbackAlert] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // 6. Modal de Representación Impresa Oficial (A4 / Ticket Térmico 80mm)
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [previewFormat, setPreviewFormat] = useState<'A4' | 'TICKET'>('A4');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // 7. Formulario de Emisión POS
  const [docType, setDocType] = useState<'01' | '03' | '07' | '08'>('01');
  const [series, setSeries] = useState('F001');
  const [currency, setCurrency] = useState<'PEN' | 'USD'>('PEN');
  const [paymentType, setPaymentType] = useState('Contado');
  const [sendNow, setSendNow] = useState(true);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  // 8. Referencias Tributarias para Notas de Crédito (07) y Débito (08)
  const [refDocType, setRefDocType] = useState<'01' | '03'>('01');
  const [refSeries, setRefSeries] = useState('F001');
  const [refNumber, setRefNumber] = useState<number>(1);
  const [refReasonCode, setRefReasonCode] = useState('01');
  const [refReasonDesc, setRefReasonDesc] = useState('Anulación de la operación');

  // 9. Datos del Adquiriente / Cliente
  const [clientDocType, setClientDocType] = useState('6');
  const [clientDocNumber, setClientDocNumber] = useState('20601234567');
  const [clientName, setClientName] = useState('CORPORACION ANDINA DE SERVICIOS S.A.C.');
  const [clientAddress, setClientAddress] = useState('Av. República de Panamá 3055, San Isidro, Lima');
  const [clientEmail, setClientEmail] = useState('contacto@andina.com.pe');
  const [lookingUpDoc, setLookingUpDoc] = useState(false);

  // 10. Consola Sandbox CCOFACT
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxResponse, setSandboxResponse] = useState<any>(null);
  const [sandboxJsonInput, setSandboxJsonInput] = useState<string>(JSON.stringify({
    tipo_comprobante: "01",
    serie: "F001",
    moneda: "PEN",
    forma_pago: "Contado",
    idempotency_key: "cco_trans_" + Date.now(),
    cliente: {
      tipo_documento: "6",
      numero_documento: "20100017491",
      razon_social: "TELEFONICA DEL PERU S.A.A.",
      direccion: "Av. Faustino Sanchez Carrion 615, Jesus Maria, Lima",
      email: "facturacion@telefonica.pe"
    },
    items: [
      {
        codigo: "CCO-SRV01",
        descripcion: "Licencia Anual CCOFACT PRO Enterprise - Integración API SUNAT",
        unidad_medida: "ZZ",
        cantidad: 1,
        precio_unitario: 1180.00,
        tipo_afectacion_igv: "10"
      }
    ],
    enviar_a_sunat_inmediato: true
  }, null, 2));

  // 11. Líneas de Detalle / Ítems
  const [items, setItems] = useState<DocumentItem[]>([
    {
      code: 'SERV-01',
      description: 'Implementación de API de Facturación Electrónica SUNAT UBL 2.1',
      unit_measure: 'ZZ',
      quantity: 1,
      unit_price: 1180.00,
      igv_affectation_type: '10'
    }
  ]);

  // Manejo de Cierre de Sesión Administrativa
  const handleLogout = () => {
    localStorage.removeItem('ccofact_admin_token');
    localStorage.removeItem('ccofact_admin_user');
    setAdminUser(null);
    setAdminToken(null);
  };

  // Auto-cierre de alertas informativas después de 6 segundos
  useEffect(() => {
    if (feedbackAlert) {
      const timer = setTimeout(() => {
        setFeedbackAlert(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [feedbackAlert]);

  // Carga inicial al autenticar
  useEffect(() => {
    if (adminToken) {
      fetchCompanies();
    }
  }, [adminToken]);

  useEffect(() => {
    if (currentCompany && adminToken) {
      fetchDocuments();
      fetchQueueStats();
      updateDefaultSeries(docType);
    }
  }, [currentCompany]);

  // Ajuste inteligente de serie por defecto según el tipo de comprobante
  const updateDefaultSeries = (type: string) => {
    if (type === '01') {
      setSeries('F001');
    } else if (type === '03') {
      setSeries('B001');
    } else if (type === '07') {
      setSeries(refDocType === '01' ? 'FC01' : 'BC01');
    } else if (type === '08') {
      setSeries(refDocType === '01' ? 'FD01' : 'BD01');
    }
  };

  // Enviar JSON de prueba en la consola sandbox de CCOFACT PRO
  const handleSendSandboxJson = async () => {
    if (!currentCompany?.api_key) {
      setFeedbackAlert({
        type: 'error',
        message: 'Debe seleccionar una empresa emisora activa con API Key antes de probar el Sandbox.'
      });
      return;
    }
    setSandboxLoading(true);
    setSandboxResponse(null);
    try {
      const payload = JSON.parse(sandboxJsonInput);
      const res = await fetch(`${API_BASE}/ccofact/emitir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': currentCompany.api_key,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setSandboxResponse(data);
      if (res.ok) {
        fetchDocuments();
        fetchQueueStats();
      }
    } catch (err: any) {
      setSandboxResponse({ error: true, message: err.message });
    } finally {
      setSandboxLoading(false);
    }
  };

  // Consulta de empresas registradas (con filtrado multi-tenant si el usuario tiene empresa asignada)
  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${API_BASE}/companies`);
      const data = await res.json();
      
      const availableCompanies =
        adminUser?.companyId && adminUser.role !== 'SUPER_ADMIN'
          ? data.filter((c: Company) => c.id === adminUser.companyId)
          : data;

      setCompanies(availableCompanies);
      if (availableCompanies.length > 0) {
        if (!currentCompany || !availableCompanies.some((c: Company) => c.id === currentCompany.id)) {
          setCurrentCompany(availableCompanies[0]);
        }
      } else {
        setCurrentCompany(null);
        setDocuments([]);
      }
    } catch (err) {
      console.error('Error cargando empresas:', err);
    }
  };

  // Consulta de comprobantes emitidos
  const fetchDocuments = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/documents?limit=100`, {
        headers: { 'x-api-key': currentCompany.api_key }
      });
      const data = await res.json();
      setDocuments(data.data || []);
    } catch (err) {
      console.error('Error cargando documentos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Consulta de métricas de la cola transaccional
  const fetchQueueStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/queue/status`);
      const data = await res.json();
      setQueueStats(data);
    } catch (err) {
      console.error('Error cargando métricas de cola:', err);
    }
  };

  // Disparo manual del Worker de colas con confirmación
  const triggerQueueWorker = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Disparar Worker de Contingencia',
      subtitle: 'COLA TRANSACCIONAL SKIP LOCKED',
      variant: 'primary',
      message: '¿Desea forzar el procesamiento inmediato de todos los comprobantes pendientes o en reintento hacia SUNAT?',
      confirmText: 'Procesar Cola Ahora',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        try {
          await fetch(`${API_BASE}/queue/trigger`, { method: 'POST' });
          await fetchQueueStats();
          await fetchDocuments();
          setFeedbackAlert({
            type: 'success',
            message: 'Worker de contingencia procesado exitosamente.'
          });
        } catch (err: any) {
          setFeedbackAlert({
            type: 'error',
            message: `Error al procesar cola: ${err.message}`
          });
        }
      }
    });
  };

  // Consulta RUC / DNI ante SUNAT
  const handleLookupDoc = async () => {
    const docNum = clientDocNumber.trim();
    if (!docNum) return;
    setLookingUpDoc(true);
    try {
      if (clientDocType === '6') {
        const res = await fetch(`${API_BASE}/consultas/ruc/${docNum}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'RUC no encontrado');
        }
        const data = await res.json();
        setClientName(data.razon_social);
        if (data.direccion) setClientAddress(data.direccion);
      } else if (clientDocType === '1') {
        const res = await fetch(`${API_BASE}/consultas/dni/${docNum}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'DNI no encontrado');
        }
        const data = await res.json();
        setClientName(data.nombre_completo);
        if (data.direccion) setClientAddress(data.direccion);
      }
    } catch (err: any) {
      setFeedbackAlert({
        type: 'error',
        message: `Error en consulta SUNAT / RENIEC: ${err.message}`
      });
    } finally {
      setLookingUpDoc(false);
    }
  };

  // Cálculos matemáticos en tiempo real
  const calculateTotals = () => {
    let subtotal = 0;
    let igv = 0;
    let total = 0;

    items.forEach(it => {
      const itemSubtotal = (Number(it.quantity) * Number(it.unit_price)) / 1.18;
      const itemIgv = itemSubtotal * 0.18;
      subtotal += itemSubtotal;
      igv += itemIgv;
      total += Number(it.quantity) * Number(it.unit_price);
    });

    return {
      subtotal: subtotal.toFixed(2),
      igv: igv.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        code: `PRD-${items.length + 1}`,
        description: '',
        unit_measure: 'NIU',
        quantity: 1,
        unit_price: 10.00,
        igv_affectation_type: '10'
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof DocumentItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Ejecución atómica de la emisión
  const executeEmission = async (payload: any) => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: {
          'x-api-key': currentCompany.api_key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al emitir comprobante');
      }

      const created = await res.json();
      await fetchDocuments();
      await fetchQueueStats();
      setIdempotencyKey('');
      
      setFeedbackAlert({
        type: 'success',
        message: `Comprobante ${created.full_number || 'emitido'} procesado y transmitido con éxito.`
      });

      // Abrir vista previa del comprobante recién emitido
      openPreview(created);
    } catch (err: any) {
      setFeedbackAlert({
        type: 'error',
        message: `Error en emisión: ${err.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  // Emisión oficial de Comprobantes a SUNAT con validación estricta y modal de confirmación
  const handleSubmitEmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) {
      setFeedbackAlert({
        type: 'error',
        message: 'Debe seleccionar o registrar una empresa emisora activa antes de emitir comprobantes.'
      });
      return;
    }

    // Validaciones estrictas de datos tributarios
    const cleanDocNum = clientDocNumber.trim();
    if (!cleanDocNum) {
      setFeedbackAlert({
        type: 'error',
        message: 'Debe ingresar el número de documento de identidad del cliente receptor.'
      });
      return;
    }

    if (docType === '01') {
      if (clientDocType !== '6' || cleanDocNum.length !== 11 || !/^\d{11}$/.test(cleanDocNum)) {
        setFeedbackAlert({
          type: 'error',
          message: 'Para Factura Electrónica (01) es obligatorio un RUC de 11 dígitos numéricos (Tipo 6).'
        });
        return;
      }
    }

    if (docType === '03' && clientDocType === '1') {
      if (cleanDocNum.length !== 8 || !/^\d{8}$/.test(cleanDocNum)) {
        setFeedbackAlert({
          type: 'error',
          message: 'El DNI del cliente debe tener exactamente 8 dígitos numéricos.'
        });
        return;
      }
    }

    if (!clientName.trim()) {
      setFeedbackAlert({
        type: 'error',
        message: 'La Razón Social o Nombre del cliente es obligatorio según normativa SUNAT.'
      });
      return;
    }

    if (items.length === 0) {
      setFeedbackAlert({
        type: 'error',
        message: 'Debe incluir al menos un producto o servicio en el detalle del comprobante.'
      });
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].description.trim()) {
        setFeedbackAlert({
          type: 'error',
          message: `El ítem #${i + 1} requiere una descripción válida.`
        });
        return;
      }
      if (Number(items[i].quantity) <= 0) {
        setFeedbackAlert({
          type: 'error',
          message: `La cantidad del ítem #${i + 1} debe ser mayor a 0.`
        });
        return;
      }
      if (Number(items[i].unit_price) < 0) {
        setFeedbackAlert({
          type: 'error',
          message: `El precio unitario del ítem #${i + 1} no puede ser negativo.`
        });
        return;
      }
    }

    const isNote = docType === '07' || docType === '08';
    const payload: any = {
      idempotency_key: idempotencyKey.trim() || undefined,
      document_type: docType,
      series: series.toUpperCase(),
      currency,
      payment_type: paymentType,
      client_doc_type: clientDocType,
      client_doc_number: cleanDocNum,
      client_name: clientName.trim(),
      client_address: clientAddress.trim(),
      client_email: clientEmail.trim(),
      items: items.map(it => ({
        ...it,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price)
      })),
      send_now: sendNow
    };

    if (isNote) {
      payload.ref_document_type = refDocType;
      payload.ref_series = refSeries.toUpperCase();
      payload.ref_number = Number(refNumber);
      payload.ref_reason_code = refReasonCode;
      payload.ref_reason_desc = refReasonDesc;
      payload.ref_documento = {
        tipo: refDocType,
        serie: refSeries.toUpperCase(),
        numero: Number(refNumber),
        motivo_codigo: refReasonCode,
        motivo_descripcion: refReasonDesc,
      };
    }

    const docName = docType === '01' ? 'Factura Electrónica' : docType === '03' ? 'Boleta de Venta Electrónica' : docType === '07' ? 'Nota de Crédito' : 'Nota de Débito';
    const isProd = currentCompany.env_mode === 'PRODUCCION';

    setConfirmConfig({
      isOpen: true,
      title: 'Confirmar Emisión Tributaria ante SUNAT',
      subtitle: isProd ? 'VALIDEZ LEGAL - ENTORNO PRODUCCIÓN' : 'ENTORNO BETA - HOMOLOGACIÓN',
      variant: isProd ? 'warning' : 'primary',
      message: isProd
        ? '¡ATENCIÓN! Está a punto de emitir un comprobante con VALIDEZ FISCAL Y LEGAL OFICIAL ante SUNAT. Esta operación afectará su Registro de Ventas e Ingresos Electrónicos (RVIE / SIRE).'
        : 'Está a punto de emitir un comprobante de prueba en el ambiente BETA de SUNAT. El sistema generará el XML UBL 2.1, lo firmará con certificado digital X.509 y obtendrá el CDR.',
      details: [
        { label: 'Emisor Tributario', value: `${currentCompany.razon_social} (RUC ${currentCompany.ruc})` },
        { label: 'Tipo de Comprobante', value: docName },
        { label: 'Serie y Correlativo', value: `${series} (Siguiente Correlativo Atómico)` },
        { label: 'Cliente Receptor', value: `${clientName} (${clientDocType === '6' ? 'RUC' : clientDocType === '1' ? 'DNI' : 'Doc'}: ${cleanDocNum})` },
        { label: 'Total a Cobrar', value: `${currency} ${totals.total}` },
        { label: 'Transmisión SUNAT', value: sendNow ? 'Inmediata vía SOAP Web Service' : 'Cola de Contingencia' },
        { label: 'Ambiente Fiscal', value: currentCompany.env_mode },
      ],
      requireCheckbox: isProd,
      checkboxLabel: 'Confirmo que la operación comercial es legítima y autorizo el envío fiscal oficial a SUNAT.',
      confirmText: 'Confirmar y Transmitir',
      cancelText: 'Cancelar y Modificar',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        await executeEmission(payload);
      }
    });
  };

  // Apertura de representación impresa oficial
  const openPreview = async (doc: DocumentRecord) => {
    if (!currentCompany) return;
    setPreviewDoc(doc);
    setPreviewLoading(true);
    try {
      const res = await fetch(`${API_BASE}/documents/${doc.id}/html?format=${previewFormat}`, {
        headers: { 'x-api-key': currentCompany.api_key }
      });
      const html = await res.text();
      setPreviewHtml(html);
    } catch (err) {
      console.error(err);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (previewDoc && currentCompany) {
      openPreview(previewDoc);
    }
  }, [previewFormat]);

  // Reintento manual a SUNAT con confirmación
  const handleRetry = (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    setConfirmConfig({
      isOpen: true,
      title: 'Reintentar Envío a SUNAT',
      subtitle: 'TRANSMISIÓN SOAP DE CONTINGENCIA',
      variant: 'primary',
      message: `¿Desea reintentar inmediatamente el envío del comprobante ${doc?.full_number || ''} a los servidores de SUNAT?`,
      confirmText: 'Confirmar Reintento',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        if (!currentCompany) return;
        setLoading(true);
        try {
          await fetch(`${API_BASE}/documents/${docId}/retry`, {
            method: 'POST',
            headers: { 'x-api-key': currentCompany.api_key }
          });
          await fetchDocuments();
          await fetchQueueStats();
          setFeedbackAlert({
            type: 'success',
            message: 'Comprobante reenviado a la cola transaccional con prioridad alta.'
          });
        } catch (err: any) {
          setFeedbackAlert({
            type: 'error',
            message: `Error reintentando: ${err.message}`
          });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Consulta explícita de CDR en SUNAT (billConsultService getStatusCdr)
  const handleConsultarCdr = async (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (!currentCompany) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/documents/${docId}/consultar-cdr`, {
        method: 'POST',
        headers: { 'x-api-key': currentCompany.api_key }
      });
      const data = await res.json();
      await fetchDocuments();
      await fetchQueueStats();
      if (data.status?.includes('ACCEPTED')) {
        setFeedbackAlert({
          type: 'success',
          message: `¡CDR recuperado con éxito! El comprobante ${doc?.full_number || ''} fue ACEPTADO por SUNAT.`
        });
      } else {
        setFeedbackAlert({
          type: 'info',
          message: `Respuesta SUNAT para ${doc?.full_number || ''}: ${data.sunat_description || 'En proceso de validación en SUNAT'}`
        });
      }
    } catch (err: any) {
      setFeedbackAlert({
        type: 'error',
        message: `Error al consultar CDR en SUNAT: ${err.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  // Anulación fiscal conforme a Ley SUNAT (Emite Nota de Crédito) o descarte local
  const handleAnularDocument = (doc: DocumentRecord) => {
    if (!currentCompany) return;

    if (doc.status === 'ANULADO') {
      setFeedbackAlert({
        type: 'info',
        message: `El comprobante ${doc.full_number} ya se encuentra formalmente anulado ante SUNAT.`
      });
      return;
    }

    const isAcceptedBySunat = doc.status.includes('ACCEPTED');

    setConfirmConfig({
      isOpen: true,
      title: isAcceptedBySunat ? 'Anulación Legal Obligatoria ante SUNAT' : 'Descartar Registro Local',
      subtitle: isAcceptedBySunat ? 'R.S. 097-2012 / NOTA DE CRÉDITO UBL 2.1' : 'BORRADOR / LOCAL',
      variant: 'danger',
      message: isAcceptedBySunat
        ? `Según la normativa SUNAT, un comprobante aceptado jamás debe eliminarse de la base de datos. Se emitirá automáticamente una NOTA DE CRÉDITO ELECTRÓNICA UBL 2.1 (Motivo 01: Anulación de la operación) para neutralizar legalmente ${doc.full_number} en el SIRE.`
        : `El comprobante ${doc.full_number} no fue emitido ni aceptado por SUNAT. ¿Desea descartar su registro local de la base de datos?`,
      details: [
        { label: 'Comprobante', value: doc.full_number },
        { label: 'Cliente Receptor', value: doc.client_name },
        { label: 'Monto Total', value: `S/ ${Number(doc.total_amount).toFixed(2)}` },
        { label: 'Fecha de Emisión', value: new Date(doc.issue_date).toLocaleDateString() },
        { label: 'Efecto Contable', value: isAcceptedBySunat ? `Emisión Nota de Crédito ${doc.document_type === '01' ? 'FC01' : 'BC01'}` : 'Eliminación del registro' },
      ],
      requireCheckbox: isAcceptedBySunat,
      checkboxLabel: 'Entiendo que esta acción emitirá una Nota de Crédito Electrónica que anula la operación fiscal.',
      confirmText: isAcceptedBySunat ? 'Confirmar Anulación Fiscal' : 'Descartar Comprobante',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          if (isAcceptedBySunat) {
            const res = await fetch(`${API_BASE}/documents/${doc.id}/anular-fiscal`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': currentCompany.api_key,
              },
              body: JSON.stringify({
                motivo: 'ANULACION DE LA OPERACION',
              }),
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.message || 'Error al emitir Nota de Crédito de anulación');
            }
            setFeedbackAlert({
              type: 'success',
              message: `ÉXITO: ${data.message || 'Comprobante anulado formalmente ante SUNAT.'}`
            });
          } else {
            const res = await fetch(`${API_BASE}/documents/${doc.id}`, {
              method: 'DELETE',
              headers: { 'x-api-key': currentCompany.api_key }
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.message || 'Error eliminando comprobante');
            }
            setFeedbackAlert({
              type: 'success',
              message: `Comprobante ${doc.full_number} descartado exitosamente.`
            });
          }
          await fetchDocuments();
          await fetchQueueStats();
        } catch (err: any) {
          setFeedbackAlert({
            type: 'error',
            message: `Error en la anulación: ${err.message}`
          });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Eliminación física del comprobante en base de datos
  const handleDeleteDocument = (doc: DocumentRecord) => {
    if (!currentCompany) return;

    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar Registro de la Base de Datos',
      subtitle: 'PURGA DEFINITIVA DEL REGISTRO',
      variant: 'danger',
      message: `¿Desea eliminar definitivamente el comprobante ${doc.full_number} de la base de datos? Se eliminarán también sus líneas de detalle asociadas.`,
      details: [
        { label: 'Comprobante', value: doc.full_number },
        { label: 'Estado', value: doc.status },
        { label: 'Cliente Receptor', value: doc.client_name },
        { label: 'Monto Total', value: `S/ ${Number(doc.total_amount).toFixed(2)}` },
      ],
      requireCheckbox: false,
      confirmText: 'Sí, Eliminar de la Base de Datos',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          const res = await fetch(`${API_BASE}/documents/${doc.id}`, {
            method: 'DELETE',
            headers: { 'x-api-key': currentCompany.api_key }
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || 'Error eliminando comprobante');
          }
          setFeedbackAlert({
            type: 'success',
            message: `Comprobante ${doc.full_number} eliminado exitosamente de la base de datos.`
          });
          await fetchDocuments();
          await fetchQueueStats();
        } catch (err: any) {
          setFeedbackAlert({
            type: 'error',
            message: `Error al eliminar: ${err.message}`
          });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Conmutación Dinámica entre Entorno BETA y PRODUCCIÓN con API Key Real
  const handleSwitchEnv = (targetEnv: 'BETA' | 'PRODUCCION') => {
    if (!currentCompany) return;
    const isProd = targetEnv === 'PRODUCCION';

    setConfirmConfig({
      isOpen: true,
      title: isProd ? '🚀 Pasar a PRODUCCIÓN Oficial SUNAT' : 'Alternar a Modo BETA (Pruebas)',
      subtitle: `EMPRESA: ${currentCompany.razon_social} (RUC: ${currentCompany.ruc})`,
      variant: isProd ? 'warning' : 'primary',
      message: isProd
        ? '¡ATENCIÓN! Al pasar a PRODUCCIÓN, se generará inmediatamente tu API Key Oficial con prefijo fact_live_... Todos los comprobantes (Boletas, Facturas, Notas) emitidos desde Control Finanzas o su API tendrán plena validez legal y tributaria ante SUNAT.'
        : 'Se cambiará el entorno a BETA (Pruebas). La API Key tendrá prefijo fact_test_... y los comprobantes se emitirán en modo de homologación sin consecuencias tributarias.',
      details: [
        { label: 'RUC Emisor', value: currentCompany.ruc },
        { label: 'Razón Social', value: currentCompany.razon_social },
        { label: 'Nuevo Entorno', value: isProd ? 'PRODUCCIÓN SUNAT (Validez Legal)' : 'BETA (Pruebas)' },
        { label: 'Prefijo API Key', value: isProd ? 'fact_live_...' : 'fact_test_...' },
      ],
      requireCheckbox: isProd,
      checkboxLabel: 'Confirmo que deseo activar PRODUCCIÓN oficial y emitir con validez tributaria ante SUNAT.',
      confirmText: isProd ? 'Confirmar y Pasar a PRODUCCIÓN' : 'Cambiar a BETA',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/companies/${currentCompany.id}/switch-env`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ env_mode: targetEnv }),
          });
          const updated = await res.json();
          if (!res.ok) throw new Error(updated.message || 'Error al conmutar entorno');

          setCurrentCompany(updated);
          setIntegrationCompany(updated);
          await fetchCompanies();
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          setFeedbackAlert({
            type: 'success',
            message: `¡Negocio conmutado a ${targetEnv}! Nueva API Key oficial: ${updated.api_key}`,
          });
          setShowIntegrationModal(true);
        } catch (err: any) {
          setFeedbackAlert({
            type: 'error',
            message: `Fallo al cambiar de entorno: ${err.message}`,
          });
        }
      },
    });
  };

  // Regeneración de API Key con Confirmación Estricta
  const handleRegenerateKey = (companyId: string) => {
    const comp = companies.find(c => c.id === companyId);
    if (!comp) return;

    setConfirmConfig({
      isOpen: true,
      title: 'Regenerar API Key de Acceso',
      subtitle: 'SEGURIDAD Y CONTROL DE INTEGRACIONES',
      variant: 'warning',
      message: `¿Desea invalidar el token actual y generar una nueva API Key para "${comp.razon_social}"? Cualquier sistema externo vinculado (como Control Finanzas o terminales POS) dejará de emitir hasta que actualice la nueva clave.`,
      details: [
        { label: 'Empresa Emisora', value: comp.razon_social },
        { label: 'RUC', value: comp.ruc },
        { label: 'Token Actual', value: comp.api_key },
      ],
      confirmText: 'Confirmar y Regenerar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`${API_BASE}/companies/${companyId}/regenerate-key`, { method: 'POST' });
          if (!res.ok) throw new Error('Error al regenerar API Key');
          const data = await res.json();
          await fetchCompanies();
          setFeedbackAlert({
            type: 'success',
            message: `Nueva API Key generada con éxito: ${data.api_key}`
          });
        } catch (err: any) {
          setFeedbackAlert({
            type: 'error',
            message: err.message
          });
        }
      }
    });
  };

  // Eliminación de Empresa con Confirmación Estricta
  const handleDeleteCompany = (comp: Company) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar Empresa y Emisor Tributario',
      subtitle: 'ACCIÓN IRREVERSIBLE',
      variant: 'danger',
      message: `¿Está seguro de eliminar definitivamente a la empresa "${comp.razon_social}" (RUC ${comp.ruc})? Se eliminarán todas sus series, configuraciones, tokens de integración y registros locales asociados.`,
      details: [
        { label: 'RUC Emisor', value: comp.ruc },
        { label: 'Razón Social', value: comp.razon_social },
        { label: 'Ambiente SUNAT', value: comp.env_mode === 'PRODUCCION' ? 'PRODUCCIÓN (Legal)' : 'BETA (Pruebas)' },
        { label: 'API Key', value: comp.api_key },
      ],
      requireCheckbox: true,
      checkboxLabel: 'Confirmo que deseo eliminar definitivamente esta empresa y todos sus registros locales.',
      confirmText: 'Sí, Eliminar Empresa',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`${API_BASE}/companies/${comp.id}`, { method: 'DELETE' });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Error al eliminar empresa');
          }
          if (currentCompany?.id === comp.id) {
            setCurrentCompany(null);
          }
          await fetchCompanies();
          setFeedbackAlert({
            type: 'success',
            message: `Empresa ${comp.razon_social} eliminada exitosamente.`
          });
        } catch (err: any) {
          setFeedbackAlert({
            type: 'error',
            message: `Error al eliminar empresa: ${err.message}`
          });
        }
      }
    });
  };

  const totals = calculateTotals();

  // Métricas calculadas para Dashboard
  const totalInvoiced = documents.reduce((acc, d) => acc + (Number(d.total_amount) || 0), 0);
  const acceptedCount = documents.filter(d => d.status.includes('ACCEPTED')).length;
  const queuedCount = documents.filter(d => d.status === 'QUEUED' || d.status === 'SENDING').length;
  const rejectedCount = documents.filter(d => d.status === 'REJECTED' || d.status === 'FAILED_RETRY').length;
  const successRate = documents.length > 0 ? Math.round((acceptedCount / documents.length) * 100) : 100;

  // Métricas Analíticas Avanzadas por Tipo de Comprobante
  const facturasList = documents.filter(d => d.document_type === '01');
  const facturasTotal = facturasList.reduce((acc, d) => acc + (Number(d.total_amount) || 0), 0);
  const boletasList = documents.filter(d => d.document_type === '03');
  const boletasTotal = boletasList.reduce((acc, d) => acc + (Number(d.total_amount) || 0), 0);
  const notasList = documents.filter(d => d.document_type === '07');
  const notasTotal = notasList.reduce((acc, d) => acc + (Number(d.total_amount) || 0), 0);
  const totalIgvAcumulado = documents.reduce((acc, d) => acc + (Number(d.total_igv) || 0), 0);
  const totalGravadaAcumulado = documents.reduce((acc, d) => acc + (Number(d.total_gravada) || 0), 0);

  // --------------------------------------------------------------------------
  // CONTROL DE ACCESO: Si no está autenticado como Admin, mostrar Login
  // --------------------------------------------------------------------------
  if (!adminToken) {
    return (
      <AdminLogin
        apiBase={API_BASE}
        onLoginSuccess={(user, token) => {
          setAdminUser(user);
          setAdminToken(token);
        }}
      />
    );
  }

  // --------------------------------------------------------------------------
  // INTERFAZ PRINCIPAL CCOFACT PRO (TEMA CLARO & DEGRADADOS ELEGANTES)
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* HEADER SUPERIOR LUMINOSO */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-slate-900">CCOFACT PRO</span>
                <span className="text-[11px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
                  CORPORACIÓN CCOPLEX
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Plataforma Soberana de Facturación Electrónica UBL 2.1</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-slate-200 text-xs">
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              PostgreSQL 18 Conectado
            </div>
            <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200 font-semibold">
              <RotateCw className="w-3 h-3 animate-spin text-indigo-600" />
              SKIP LOCKED Activo
            </div>
          </div>
        </div>

        {/* SELECTOR DE EMPRESA, VARIABLES CONTROL FINANZAS Y PERFIL ADMIN */}
        <div className="flex items-center gap-3">
          {currentCompany && (
            <div className="flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <select
                aria-label="Seleccionar empresa emisora"
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer max-w-[180px] truncate"
                value={currentCompany.id}
                onChange={(e) => {
                  const comp = companies.find(c => c.id === e.target.value);
                  if (comp) setCurrentCompany(comp);
                }}
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id} className="bg-white text-slate-900 font-medium">
                    {c.ruc} - {c.razon_social}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleSwitchEnv(currentCompany.env_mode === 'PRODUCCION' ? 'BETA' : 'PRODUCCION')}
                title="Haz clic para conmutar entre PRODUCCIÓN (fact_live_) y BETA (fact_test_)"
                className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                  currentCompany.env_mode === 'PRODUCCION'
                    ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                    : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${currentCompany.env_mode === 'PRODUCCION' ? 'bg-rose-600 animate-pulse' : 'bg-amber-500'}`} />
                <span>{currentCompany.env_mode === 'PRODUCCION' ? 'PRODUCCIÓN' : 'BETA'}</span>
                <span className="text-[9px] opacity-60">↺</span>
              </button>
            </div>
          )}

          {/* BOTÓN DESTACADO: VARIABLES CONTROL FINANZAS */}
          {currentCompany && (
            <button
              onClick={() => {
                setIntegrationCompany(currentCompany);
                setShowIntegrationModal(true);
              }}
              title="Ver variables listas para Control Finanzas o ERP"
              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Variables Control Finanzas</span>
            </button>
          )}

          {currentCompany && (
            <button
              onClick={() => copyToClipboard(currentCompany.api_key)}
              title="Copiar API Key para sistemas externos"
              className="hidden md:flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs px-3 py-2 rounded-xl border border-slate-200 shadow-2xs transition cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-amber-500" />
              <code className="text-slate-800 font-bold">{currentCompany.api_key.substring(0, 10)}...</code>
              {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </button>
          )}

          {/* PERFIL ADMINISTRADOR & LOGOUT */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="hidden xl:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900 leading-tight">Admin Maestro</span>
              <span className="text-[10px] text-slate-500 font-medium">{adminUser?.email || 'admin@ccoplex.com'}</span>
            </div>

            <button
              onClick={handleLogout}
              title="Cerrar Sesión de Administrador"
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* BARRA DE NAVEGACIÓN PRINCIPAL */}
      <nav className="border-b border-slate-200 bg-white px-6 flex gap-1 overflow-x-auto shadow-2xs">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'dashboard'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Panel General
        </button>
        <button
          onClick={() => setActiveTab('emitir')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'emitir'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Send className="w-4 h-4" /> Emisión Universal (POS)
        </button>
        <button
          onClick={() => { setActiveTab('documentos'); fetchDocuments(); }}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'documentos'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" /> Comprobantes ({documents.length})
        </button>
        <button
          onClick={() => { setActiveTab('empresas'); fetchCompanies(); }}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'empresas'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" /> Empresas & Negocios ({companies.length})
        </button>
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'usuarios'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" /> Usuarios & Accesos
        </button>
        <button
          onClick={() => { setActiveTab('colas'); fetchQueueStats(); }}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'colas'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" /> Colas Transaccionales
          {queuedCount > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {queuedCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'api'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Code2 className="w-4 h-4" /> Documentación API & SDKs
        </button>
        <button
          onClick={() => setActiveTab('consola')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'consola'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Sandbox CCOFACT
        </button>
        <button
          onClick={() => setActiveTab('guia_sunat')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'guia_sunat'
              ? 'border-amber-600 text-amber-600 bg-amber-50/40'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4 text-amber-500" /> Guía SUNAT (Beta & Prod)
        </button>
      </nav>

      {/* CUERPO PRINCIPAL */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* ================================================================== */}
        {/* TAB 1: PANEL GENERAL (DASHBOARD) */}
        {/* ================================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Banner de Bienvenida y Vinculación Externa */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-3xl p-6 lg:p-8 text-white shadow-xl shadow-indigo-500/15 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="space-y-2 text-center md:text-left">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                  Infraestructura Soberana de Facturación SUNAT UBL 2.1
                </span>
                <h2 className="text-2xl font-black tracking-tight">
                  Emisor Activo: {currentCompany?.razon_social || 'Corporación Ccoplex'}
                </h2>
                <p className="text-xs text-indigo-100 max-w-2xl leading-relaxed">
                  Emite Facturas, Boletas y Notas de Crédito/Débito con firma digital X.509 y CDR instantáneo. 
                  Conéctalo a <strong>Control Finanzas</strong> o a cualquier sistema externo con 1 solo clic.
                </p>
              </div>

              {currentCompany && (
                <button
                  onClick={() => {
                    setIntegrationCompany(currentCompany);
                    setShowIntegrationModal(true);
                  }}
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 text-indigo-700 text-xs font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-black/10 transition shrink-0 cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Obtener Variables para Control Finanzas</span>
                </button>
              )}
            </div>

            {/* 4 Tarjetas de Métricas Clave */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-xs hover:shadow-md transition">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Facturado</span>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  S/ {totalInvoiced.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  <span className="text-emerald-600 font-bold">{documents.length}</span> comprobantes emitidos
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-xs hover:shadow-md transition">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Aceptados SUNAT</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-600 font-mono">
                  {acceptedCount}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Tasa de Aceptación: <span className="text-emerald-600 font-bold">{successRate}%</span> {rejectedCount > 0 && <span className="text-rose-600 font-bold">({rejectedCount} obs)</span>}
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-xs hover:shadow-md transition">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Cola de Envío</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-600 font-mono">
                  {queuedCount}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Worker PostgreSQL <span className="text-indigo-600 font-bold">SKIP LOCKED</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-xs hover:shadow-md transition">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Empresas Registradas</span>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-purple-600 font-mono">
                  {companies.length}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Multi-tenant con <span className="text-purple-600 font-bold">x-api-key</span> aislada
                </div>
              </div>
            </div>

            {/* PANEL DE ANÁLISIS FISCAL Y DESGLOSE TRIBUTARIO (SIRE / FORM 621) */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Análisis Fiscal & Distribución Tributaria</h3>
                    <p className="text-xs text-slate-500">Resumen para Registro de Ventas e Ingresos Electrónicos (RVIE / SIRE)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('usuarios')}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" /> Administrar Usuarios
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Facturas 01 */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Facturas Electrónicas (01)
                    </span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-mono text-[10px]">
                      {facturasList.length} emitidas
                    </span>
                  </div>
                  <p className="text-xl font-black text-slate-900 font-mono mt-1">
                    S/ {facturasTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {totalInvoiced > 0 ? Math.round((facturasTotal / totalInvoiced) * 100) : 0}% del volumen total
                  </p>
                </div>

                {/* Boletas 03 */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Boletas de Venta (03)
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-mono text-[10px]">
                      {boletasList.length} emitidas
                    </span>
                  </div>
                  <p className="text-xl font-black text-slate-900 font-mono mt-1">
                    S/ {boletasTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {totalInvoiced > 0 ? Math.round((boletasTotal / totalInvoiced) * 100) : 0}% del volumen total
                  </p>
                </div>

                {/* Desglose Fiscal SUNAT */}
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                    <span>Liquidación Tributaria</span>
                    <span className="text-[10px] bg-indigo-200/60 text-indigo-900 px-2 py-0.5 rounded-md font-bold">
                      IGV 18%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-600 pt-1">
                    <span>Base Gravada:</span>
                    <span className="font-mono font-bold text-slate-900">S/ {totalGravadaAcumulado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <span>IGV Liquidado:</span>
                    <span className="font-mono font-bold text-indigo-700">S/ {totalIgvAcumulado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {notasList.length > 0 && (
                    <div className="flex justify-between items-center text-[11px] text-rose-600 pt-1 border-t border-indigo-100">
                      <span>Notas de Crédito ({notasList.length}):</span>
                      <span className="font-mono font-bold">- S/ {notasTotal.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabla de Últimos Comprobantes & Acciones Rápidas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-indigo-600" /> Últimos Comprobantes Emitidos
                  </h3>
                  <button
                    onClick={() => { setActiveTab('documentos'); fetchDocuments(); }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    Ver todos <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 bg-slate-50/50">
                        <th className="py-2.5 px-3">Comprobante</th>
                        <th className="py-2.5 px-3">Cliente</th>
                        <th className="py-2.5 px-3">Fecha / Hora</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                        <th className="py-2.5 px-3 text-center">Estado SUNAT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {documents.slice(0, 6).map(doc => (
                        <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3 font-mono font-bold text-indigo-600">
                            {doc.full_number}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">{doc.client_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{doc.client_doc_number}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                            {doc.issue_date} {doc.issue_time}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            {doc.currency === 'USD' ? '$' : 'S/'} {Number(doc.total_amount).toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              doc.status.includes('ACCEPTED')
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : doc.status === 'QUEUED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {doc.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {documents.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            No hay comprobantes emitidos aún. Haz clic en "Emisión Universal" para emitir el primero.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Acciones Rápidas */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" /> Acciones Rápidas
                </h3>

                <div className="space-y-2.5 text-xs">
                  <button
                    onClick={() => setActiveTab('emitir')}
                    className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 transition text-left cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">Emitir Factura o Boleta</span>
                      <span className="text-[11px] text-slate-500">Emisión manual con cálculo automático</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-indigo-600" />
                  </button>

                  <button
                    onClick={() => {
                      if (currentCompany) {
                        setIntegrationCompany(currentCompany);
                        setShowIntegrationModal(true);
                      }
                    }}
                    className="w-full flex items-center justify-between p-3.5 bg-indigo-50/60 hover:bg-indigo-100/60 rounded-2xl border border-indigo-200 transition text-left cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-indigo-900 block">Variables Control Finanzas</span>
                      <span className="text-[11px] text-indigo-700">Copia y pega en tu sistema externo</span>
                    </div>
                    <Key className="w-4 h-4 text-amber-600" />
                  </button>

                  <button
                    onClick={() => {
                      if (currentCompany) {
                        setFiscalAuditCompanyId(currentCompany.id);
                        setShowFiscalModal(true);
                      }
                    }}
                    className="w-full flex items-center justify-between p-3.5 bg-emerald-50/60 hover:bg-emerald-100/60 rounded-2xl border border-emerald-200 transition text-left cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-emerald-900 block">Autenticador Fiscal Pro SUNAT</span>
                      <span className="text-[11px] text-emerald-700">Validar salud tributaria de la empresa</span>
                    </div>
                    <Award className="w-4 h-4 text-emerald-600" />
                  </button>

                  <button
                    onClick={() => {
                      setCompanyToEdit(null);
                      setShowCompanyFormModal(true);
                    }}
                    className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 transition text-left cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">Registrar Nueva Empresa</span>
                      <span className="text-[11px] text-slate-500">Agregar emisor multi-tenant</span>
                    </div>
                    <Plus className="w-4 h-4 text-indigo-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* ================================================================== */}
        {/* TAB 2: EMISIÓN UNIVERSAL (POS) */}
        {/* ================================================================== */}
        {activeTab === 'emitir' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 lg:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Send className="w-5 h-5 text-indigo-600" /> Emisión Universal de Comprobantes SUNAT
                </h2>
                <p className="text-xs text-slate-500">
                  Emite Facturas (01), Boletas (03), Notas de Crédito (07) y Notas de Débito (08)
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendNow}
                  onChange={(e) => setSendNow(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <span>Envío Inmediato SOAP SUNAT (CDR Verde)</span>
              </label>
            </div>

            <form onSubmit={handleSubmitEmission} className="space-y-6">
              {/* Selector de Tipo y Serie */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de Comprobante</label>
                  <select
                    value={docType}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      setDocType(t);
                      updateDefaultSeries(t);
                      if (t === '03') {
                        setClientDocType('1');
                        setClientDocNumber('48291048');
                        setClientName('CLIENTE BOLETA EJEMPLO');
                      } else {
                        setClientDocType('6');
                        setClientDocNumber('20601234567');
                        setClientName('CORPORACION ANDINA DE SERVICIOS S.A.C.');
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:border-indigo-600 outline-none transition cursor-pointer"
                  >
                    <option value="01">01 - FACTURA ELECTRÓNICA</option>
                    <option value="03">03 - BOLETA DE VENTA</option>
                    <option value="07">07 - NOTA DE CRÉDITO</option>
                    <option value="08">08 - NOTA DE DÉBITO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Serie Fiscal</label>
                  <input
                    type="text"
                    value={series}
                    onChange={(e) => setSeries(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition"
                    placeholder="F001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Moneda</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:border-indigo-600 outline-none transition cursor-pointer"
                  >
                    <option value="PEN">SOLES (S/ - PEN)</option>
                    <option value="USD">DÓLARES ($ - USD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Forma de Pago</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:border-indigo-600 outline-none transition cursor-pointer"
                  >
                    <option value="Contado">Contado</option>
                    <option value="Credito">Crédito a 30 días</option>
                  </select>
                </div>
              </div>

              {/* SECCIÓN NOTAS DE CRÉDITO Y DÉBITO */}
              {(docType === '07' || docType === '08') && (
                <div className="border border-amber-200 bg-amber-50/40 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>Datos Obligatorios del Comprobante Modificado ({docType === '07' ? 'Nota de Crédito' : 'Nota de Débito'})</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Tipo de Comprobante Modificado</label>
                      <select
                        value={refDocType}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setRefDocType(val);
                          if (docType === '07') setSeries(val === '01' ? 'FC01' : 'BC01');
                          if (docType === '08') setSeries(val === '01' ? 'FD01' : 'BD01');
                        }}
                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-slate-900 font-semibold outline-none"
                      >
                        <option value="01">01 - FACTURA ELECTRÓNICA</option>
                        <option value="03">03 - BOLETA DE VENTA</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Serie Modificada</label>
                      <input
                        type="text"
                        value={refSeries}
                        onChange={(e) => setRefSeries(e.target.value.toUpperCase())}
                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 outline-none"
                        placeholder="F001"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Número Correlativo Modificado</label>
                      <input
                        type="number"
                        min="1"
                        value={refNumber}
                        onChange={(e) => setRefNumber(parseInt(e.target.value, 10) || 1)}
                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 outline-none"
                        placeholder="1"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Código de Motivo SUNAT ({docType === '07' ? 'Catálogo 09 NC' : 'Catálogo 10 ND'})
                      </label>
                      {docType === '07' ? (
                        <select
                          value={refReasonCode}
                          onChange={(e) => {
                            setRefReasonCode(e.target.value);
                            const mapDescs: Record<string, string> = {
                              '01': 'Anulación de la operación',
                              '02': 'Anulación por error en el RUC',
                              '03': 'Corrección por error en la descripción',
                              '04': 'Descuento global',
                              '05': 'Descuento por ítem',
                              '06': 'Devolución total',
                              '07': 'Devolución por ítem',
                              '08': 'Bonificación',
                              '09': 'Disminución en el valor',
                            };
                            if (mapDescs[e.target.value]) setRefReasonDesc(mapDescs[e.target.value]);
                          }}
                          className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-slate-900 font-semibold outline-none"
                        >
                          <option value="01">01 - Anulación de la operación</option>
                          <option value="02">02 - Anulación por error en el RUC</option>
                          <option value="03">03 - Corrección por error en la descripción</option>
                          <option value="04">04 - Descuento global</option>
                          <option value="05">05 - Descuento por ítem</option>
                          <option value="06">06 - Devolución total</option>
                          <option value="07">07 - Devolución por ítem</option>
                          <option value="08">08 - Bonificación</option>
                          <option value="09">09 - Disminución en el valor</option>
                        </select>
                      ) : (
                        <select
                          value={refReasonCode}
                          onChange={(e) => {
                            setRefReasonCode(e.target.value);
                            const mapDescs: Record<string, string> = {
                              '01': 'Intereses por mora',
                              '02': 'Aumento en el valor',
                              '03': 'Penalidades / otros conceptos',
                            };
                            if (mapDescs[e.target.value]) setRefReasonDesc(mapDescs[e.target.value]);
                          }}
                          className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-slate-900 font-semibold outline-none"
                        >
                          <option value="01">01 - Intereses por mora</option>
                          <option value="02">02 - Aumento en el valor</option>
                          <option value="03">03 - Penalidades / otros conceptos</option>
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Descripción / Sustento del Motivo</label>
                      <input
                        type="text"
                        value={refReasonDesc}
                        onChange={(e) => setRefReasonDesc(e.target.value)}
                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
                        placeholder="Sustento tributario del comprobante"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Idempotencia Opcional */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                <Hash className="w-5 h-5 text-indigo-600 shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-800">Llave de Idempotencia (Idempotency-Key)</div>
                  <input
                    type="text"
                    value={idempotencyKey}
                    onChange={(e) => setIdempotencyKey(e.target.value)}
                    placeholder="Ej. sale_order_uuid_12345 (Garantiza cero doble facturación si se reenvía)"
                    className="w-full bg-transparent text-xs text-indigo-700 font-mono outline-none placeholder-slate-400 mt-0.5"
                  />
                </div>
              </div>

              {/* Datos del Cliente */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Datos del Adquiriente / Cliente</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tipo de Documento</label>
                    <select
                      value={clientDocType}
                      onChange={(e) => setClientDocType(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                    >
                      <option value="6">6 - R.U.C.</option>
                      <option value="1">1 - D.N.I.</option>
                      <option value="4">4 - CARNET EXTRANJERÍA</option>
                      <option value="7">7 - PASAPORTE</option>
                      <option value="0">0 - SIN DOCUMENTO</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">Número de Documento</label>
                      <button
                        type="button"
                        onClick={handleLookupDoc}
                        disabled={lookingUpDoc}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                        title="Consultar y autocompletar razón social"
                      >
                        {lookingUpDoc ? <RotateCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                        <span>Consultar SUNAT</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={clientDocNumber}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleLookupDoc();
                        }
                      }}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setClientDocNumber(val);
                        if ((clientDocType === '6' && val.length === 11) || (clientDocType === '1' && val.length === 8)) {
                          handleLookupDoc();
                        }
                      }}
                      placeholder="Ingresa DNI (8) o RUC (11) y presiona Enter"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Razón Social / Nombre Completo</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Dirección del Cliente</label>
                    <input
                      type="text"
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico (Notificación)</label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Items del Comprobante */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ítems / Servicios a Facturar</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-xs font-bold text-indigo-600 px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Línea
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Código</label>
                        <input
                          type="text"
                          value={it.code}
                          onChange={(e) => handleItemChange(idx, 'code', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                          placeholder="COD-01"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Descripción</label>
                        <input
                          type="text"
                          value={it.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                          placeholder="Descripción del bien o servicio"
                          required
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Cant.</label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-right text-slate-900 font-bold"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Precio (Con IGV)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={it.unit_price}
                          onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-right text-slate-900 font-mono font-bold"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Afectación IGV</label>
                        <select
                          value={it.igv_affectation_type}
                          onChange={(e) => handleItemChange(idx, 'igv_affectation_type', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-medium"
                        >
                          <option value="10">10 - Gravado (18%)</option>
                          <option value="20">20 - Exonerado</option>
                          <option value="30">30 - Inafecto</option>
                        </select>
                      </div>
                      <div className="col-span-1 flex justify-end pt-4">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                          title="Eliminar fila"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resumen de Totales */}
                <div className="flex justify-end pt-3">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 w-72 space-y-1.5 text-xs shadow-xs">
                    <div className="flex justify-between text-slate-600 font-medium">
                      <span>Operación Gravada:</span>
                      <span className="font-mono font-bold text-slate-900">{currency === 'USD' ? '$' : 'S/'} {totals.subtotal}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 font-medium">
                      <span>I.G.V. (18%):</span>
                      <span className="font-mono font-bold text-slate-900">{currency === 'USD' ? '$' : 'S/'} {totals.igv}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-slate-900">
                      <span>TOTAL A PAGAR:</span>
                      <span className="font-mono text-emerald-600">{currency === 'USD' ? '$' : 'S/'} {totals.total}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón de Emisión */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg shadow-indigo-500/25 transition cursor-pointer"
                >
                  {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{loading ? 'Firmando y Transmitiendo...' : 'Firmar y Emitir Comprobante a SUNAT'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 3: COMPROBANTES EMITIDOS */}
        {/* ================================================================== */}
        {activeTab === 'documentos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-indigo-600" /> Registro Oficial de Comprobantes
                </h2>
                <p className="text-xs text-slate-500">Historial completo con CDR oficial, representación impresa y XML firmado</p>
              </div>

              <button
                onClick={fetchDocuments}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" /> Actualizar
              </button>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/80 font-bold">
                      <th className="py-3 px-4">Comprobante</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Cliente / Receptor</th>
                      <th className="py-3 px-4">Fecha / Hora</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-center">Estado SUNAT</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documents.map(doc => (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                          {doc.full_number}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {doc.document_type === '01' ? 'Factura' : doc.document_type === '03' ? 'Boleta' : doc.document_type === '07' ? 'Nota Crédito' : 'Nota Débito'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{doc.client_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{doc.client_doc_number}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {doc.issue_date} {doc.issue_time}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {doc.currency === 'USD' ? '$' : 'S/'} {Number(doc.total_amount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setDiagnosticDoc(doc)}
                            title="Haz clic para ver el Diagnóstico Tributario Oficial retornado por SUNAT"
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full cursor-pointer hover:opacity-85 transition inline-flex items-center gap-1 ${
                              doc.status === 'ANULADO'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300 font-extrabold line-through'
                                : doc.status.includes('ACCEPTED')
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : doc.status === 'QUEUED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <span>{doc.status}</span>
                            <Info className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openPreview(doc)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                              title="Ver / Imprimir Representación Oficial"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            <a
                              href={`${API_BASE}/documents/${doc.id}/xml`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition"
                              title="Descargar XML UBL 2.1 Firmado"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>

                            <a
                              href={`${API_BASE}/documents/${doc.id}/cdr`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition"
                              title="Descargar CDR Oficial SUNAT"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>

                            {doc.status !== 'ACCEPTED' && doc.status !== 'ANULADO' && (
                              <button
                                onClick={() => handleConsultarCdr(doc.id)}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition cursor-pointer"
                                title="Consultar CDR Oficial en SUNAT (getStatusCdr)"
                              >
                                <Search className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {doc.status !== 'ACCEPTED' && doc.status !== 'ANULADO' && (
                              <button
                                onClick={() => handleRetry(doc.id)}
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition cursor-pointer"
                                title="Reintentar Envío a SUNAT"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {doc.status.includes('ACCEPTED') && doc.status !== 'ANULADO' && (
                              <button
                                onClick={() => handleAnularDocument(doc)}
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition cursor-pointer"
                                title="Anular según Ley SUNAT (Emite Nota de Crédito Oficial Motivo 01)"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {doc.status === 'ANULADO' && (
                              <span className="text-[10px] text-rose-500 font-bold px-2 py-0.5 bg-rose-50 rounded">
                                Anulado
                              </span>
                            )}

                            <button
                              onClick={() => handleDeleteDocument(doc)}
                              className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-lg transition cursor-pointer"
                              title="Eliminar registro de la Base de Datos"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {documents.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          No hay comprobantes registrados para este emisor.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


        {/* ================================================================== */}
        {/* TAB 4: EMPRESAS & NEGOCIOS MULTI-TENANT */}
        {/* ================================================================== */}
        {activeTab === 'empresas' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-indigo-600" />
                  Gestión de Negocios & Empresas Multi-Tenant
                </h2>
                <p className="text-xs text-slate-500">Cada negocio cuenta con su propio API Key, series independientes, certificado y variables para vincular con Control Finanzas</p>
              </div>

              <button
                onClick={() => {
                  setCompanyToEdit(null);
                  setShowCompanyFormModal(true);
                }}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" /> Registrar Nueva Empresa
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {companies.map(comp => (
                <div key={comp.id} className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-indigo-600">RUC {comp.ruc}</span>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">{comp.razon_social}</h3>
                      {comp.nombre_comercial && (
                        <p className="text-xs text-indigo-700 font-semibold">{comp.nombre_comercial}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">{comp.direccion}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold shrink-0 ${
                      comp.env_mode === 'PRODUCCION'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {comp.env_mode}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">API Key / Token:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-slate-900 font-bold font-mono truncate max-w-[200px]">{comp.api_key}</code>
                        <button
                          onClick={() => copyToClipboard(comp.api_key)}
                          className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          title="Copiar API Key"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Usuario SOL:</span>
                      <span className="text-slate-800 font-mono font-semibold">{comp.sol_user}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Webhook URL:</span>
                      <span className="text-slate-700 truncate max-w-[220px]">{comp.webhook_url || 'No configurado'}</span>
                    </div>
                  </div>

                  {/* Bóveda de Certificado Digital X.509 en la Nube (DigitalOcean Spaces) */}
                  {comp.certificate_pfx_base64 ? (
                    <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-emerald-950 font-mono truncate max-w-[170px]">
                              {comp.certificate_filename || 'certificado.pfx'}
                            </span>
                            <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <Cloud className="w-3 h-3 text-sky-600" /> DigitalOcean
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-800 mt-0.5">
                            {comp.certificate_expires_at
                              ? `Vence: ${new Date(comp.certificate_expires_at).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                              : 'Certificado X.509 activo en la Nube'}
                            {comp.certificate_issuer && ` • ${comp.certificate_issuer}`}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-600 text-white rounded-full">
                        Cargado
                      </span>
                    </div>
                  ) : (
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <span className="font-bold text-amber-950">Sin Certificado .PFX</span>
                          <p className="text-[11px] text-amber-700">Requerido para facturar en Producción SUNAT</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setCompanyToEdit(comp);
                          setShowCompanyFormModal(true);
                        }}
                        className="text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-xl cursor-pointer transition"
                      >
                        Subir .PFX
                      </button>
                    </div>
                  )}

                  {/* Acciones del Negocio */}
                  <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setIntegrationCompany(comp);
                        setShowIntegrationModal(true);
                      }}
                      className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs px-3 py-1.5 rounded-xl font-bold transition cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Variables Control Finanzas</span>
                    </button>

                    <button
                      onClick={() => {
                        setFiscalAuditCompanyId(comp.id);
                        setShowFiscalModal(true);
                      }}
                      className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs px-3 py-1.5 rounded-xl font-bold transition cursor-pointer"
                      title="Ejecutar Verificación de Autenticidad SUNAT"
                    >
                      <Award className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Autenticador Pro</span>
                    </button>

                    <button
                      onClick={() => {
                        setCompanyToEdit(comp);
                        setShowCompanyFormModal(true);
                      }}
                      className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer"
                    >
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleRegenerateKey(comp.id)}
                      className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer"
                      title="Regenerar API Key"
                    >
                      <Key className="w-3 h-3 text-amber-500" />
                      <span>Regenerar</span>
                    </button>

                    <button
                      onClick={() => handleDeleteCompany(comp)}
                      className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer"
                      title="Eliminar Empresa y Emisor"
                    >
                      <Trash2 className="w-3 h-3 text-rose-500" />
                      <span>Eliminar</span>
                    </button>

                    <button
                      onClick={() => setCurrentCompany(comp)}
                      className={`ml-auto text-xs px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                        currentCompany?.id === comp.id
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {currentCompany?.id === comp.id ? '✓ Emisor Activo' : 'Seleccionar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {companies.length === 0 && (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <Building2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">No hay empresas ni negocios registrados</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    El sistema CCOFACT PRO se encuentra completamente limpio de empresas de prueba. Registre su primera empresa ingresando únicamente su número de RUC de 11 dígitos para autocompletar la información oficial ante SUNAT.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCompanyToEdit(null);
                    setShowCompanyFormModal(true);
                  }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Registrar Primera Empresa
                </button>
              </div>
            )}
          </div>
        )}


        {/* ================================================================== */}
        {/* TAB 5: COLAS TRANSACCIONALES */}
        {/* ================================================================== */}
        {activeTab === 'colas' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-indigo-600" /> Cola de Procesamiento SKIP LOCKED
                </h2>
                <p className="text-xs text-slate-500">Worker de fondo de alta disponibilidad con reintentos exponenciales</p>
              </div>

              <button
                onClick={triggerQueueWorker}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" /> Disparar Worker Manualmente
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-xs">
                <span className="text-xs text-slate-500 font-bold uppercase">Pendientes de Envío</span>
                <div className="text-3xl font-black text-amber-600 font-mono">
                  {queueStats.counts?.find((c: any) => c.status === 'PENDING')?._count?.id || 0}
                </div>
                <p className="text-[11px] text-slate-500">Comprobantes listos para entrega inmediata a SUNAT</p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-xs">
                <span className="text-xs text-slate-500 font-bold uppercase">Reintentos por Caída SUNAT</span>
                <div className="text-3xl font-black text-rose-600 font-mono">
                  {queueStats.counts?.find((c: any) => c.status === 'FAILED_RETRY')?._count?.id || 0}
                </div>
                <p className="text-[11px] text-slate-500">Retroceso exponencial (15s, 1m, 5m, 15m, 1h)</p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-xs">
                <span className="text-xs text-slate-500 font-bold uppercase">Entregados con Éxito</span>
                <div className="text-3xl font-black text-emerald-600 font-mono">
                  {queueStats.counts?.find((c: any) => c.status === 'COMPLETED')?._count?.id || 0}
                </div>
                <p className="text-[11px] text-slate-500">Procesados y confirmados con CDR</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
              <h3 className="text-base font-bold text-slate-900">Últimos Trabajos de la Cola</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/50">
                      <th className="py-2.5 px-3">Job ID</th>
                      <th className="py-2.5 px-3">Comprobante</th>
                      <th className="py-2.5 px-3">Intentos</th>
                      <th className="py-2.5 px-3">Próxima Ejecución</th>
                      <th className="py-2.5 px-3">Último Error</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {queueStats.recentJobs?.map((job: any) => (
                      <tr key={job.id}>
                        <td className="py-2.5 px-3 text-slate-500">{job.id.substring(0, 8)}...</td>
                        <td className="py-2.5 px-3 text-indigo-600 font-bold">{job.document?.full_number || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-700">{job.attempts} / {job.max_attempts}</td>
                        <td className="py-2.5 px-3 text-slate-500">{new Date(job.next_run_at).toLocaleTimeString()}</td>
                        <td className="py-2.5 px-3 text-rose-600 font-sans truncate max-w-[200px]">{job.last_error || 'Ninguno'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${job.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                            {job.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!queueStats.recentJobs || queueStats.recentJobs.length === 0) && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 font-sans">
                          No hay trabajos pendientes en cola. Todos los comprobantes fueron entregados en tiempo real.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


        {/* ================================================================== */}
        {/* TAB 6: DOCUMENTACIÓN API & SDKS */}
        {/* ================================================================== */}
        {activeTab === 'api' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 lg:p-8 shadow-xs space-y-8">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-200">
                <Code2 className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  Documentación Oficial API CCOFACT • Corporación Ccoplex
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conecta cualquier ERP, POS, tienda virtual o sistema administrativo en 5 minutos
                </p>
              </div>
            </div>

            {/* Cabeceras HTTP */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  1. Encabezados HTTP Obligatorios (Headers)
                </span>
                <span className="text-xs text-indigo-700 font-bold">Autenticación por API Key</span>
              </div>
              <pre className="text-xs font-mono text-indigo-900 bg-white p-4 rounded-xl overflow-x-auto border border-slate-200 shadow-2xs font-semibold">
{`x-api-key: ${currentCompany?.api_key || 'fact_demo_key_pro_2026'}
Content-Type: application/json
Idempotency-Key: cco_order_987654 (Opcional pero recomendado para cero duplicados)`}
              </pre>
            </div>

            {/* Endpoints Principales */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                2. Endpoints Principales de la Plataforma
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">POST</span>
                    <span className="font-mono text-slate-900 font-bold">/api/v1/ccofact/emitir</span>
                  </div>
                  <p className="text-slate-600">
                    Endpoint soberano oficial. Emite Facturas (01), Boletas (03), Notas de Crédito (07) y Notas de Débito (08).
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded">DELETE</span>
                    <span className="font-mono text-slate-900 font-bold">/api/v1/documents/by-series-number/:serie/:numero</span>
                  </div>
                  <p className="text-slate-600">
                    Eliminación sincronizada. Permite a sistemas externos (Control Finanzas, ERPs) anular o eliminar una venta en tiempo real.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-sky-100 text-sky-800 font-bold rounded">GET</span>
                    <span className="font-mono text-slate-900 font-bold">/api/v1/documents/:id/html</span>
                  </div>
                  <p className="text-slate-600">
                    Representación impresa vectorial con código QR oficial. Formatos: ?format=A4 o ?format=TICKET.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold rounded">GET</span>
                    <span className="font-mono text-slate-900 font-bold">/api/v1/consultas/ruc/:ruc</span>
                  </div>
                  <p className="text-slate-600">
                    Consulta tributaria y algoritmo Módulo 11 para autocompletar razones sociales y direcciones.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* ================================================================== */}
        {/* TAB 7: SANDBOX CCOFACT */}
        {/* ================================================================== */}
        {activeTab === 'consola' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 lg:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" /> Consola de Pruebas Sandbox CCOFACT
                </h2>
                <p className="text-xs text-slate-500">Prueba peticiones JSON crudas directamente contra la API de CCOFACT</p>
              </div>

              <button
                onClick={handleSendSandboxJson}
                disabled={sandboxLoading}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition cursor-pointer"
              >
                {sandboxLoading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{sandboxLoading ? 'Procesando...' : 'Enviar JSON'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700">Request JSON (CCOFACT Engine):</span>
                <textarea
                  value={sandboxJsonInput}
                  onChange={(e) => setSandboxJsonInput(e.target.value)}
                  rows={20}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-indigo-300 focus:border-indigo-500 outline-none resize-none shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700">Response JSON:</span>
                <pre className="w-full h-[375px] bg-slate-900 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-emerald-400 overflow-auto shadow-inner">
                  {sandboxResponse ? JSON.stringify(sandboxResponse, null, 2) : '// Haz clic en "Enviar JSON" para probar la respuesta del motor CCOFACT PRO'}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 8: GUÍA OFICIAL SUNAT (BETA & PRODUCCIÓN) */}
        {/* ================================================================== */}
        {activeTab === 'guia_sunat' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 lg:p-8 shadow-xs space-y-8">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
                    <Award className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">
                    Guía Maestra de Conexión y Certificación SUNAT (Beta & Producción)
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  Todo lo que necesitas saber para operar de forma 100% legal, segura y homologada con SUNAT en Perú
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-bold text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  UBL 2.1 Oficial Certificado
                </span>
              </div>
            </div>

            {/* SECCIÓN 1: AMBIENTE BETA DE SUNAT */}
            <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/40 rounded-3xl p-6 border border-amber-200/80 space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm">
                  1. AMBIENTE BETA (HOMOLOGACIÓN Y PRUEBAS)
                </span>
                <span className="text-xs text-amber-800 font-semibold">
                  Sin valor tributario • Pruebas ilimitadas • Cero riesgo
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">
                SUNAT pone a disposición de todos los desarrolladores un <strong>Ambiente Beta</strong> de pruebas públicas. 
                En este entorno puedes emitir Facturas (<code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200">01</code>), 
                Boletas (<code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200">03</code>), 
                Notas de Crédito (<code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200">07</code>) 
                y Notas de Débito (<code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200">08</code>) recibiendo CDRs válidos de SUNAT sin generar pago de impuestos.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs space-y-1">
                  <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block font-sans">
                    Endpoint SOAP Beta Oficial
                  </span>
                  <div className="text-slate-900 font-bold break-all text-[11px]">
                    https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs space-y-1">
                  <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block font-sans">
                    Usuario Secundario SOL Beta
                  </span>
                  <div className="text-slate-900 font-bold text-[13px]">
                    MODDATOS <span className="text-slate-400 font-normal font-sans text-xs">(o tu RUC + MODDATOS)</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs space-y-1">
                  <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block font-sans">
                    Clave SOL Beta
                  </span>
                  <div className="text-slate-900 font-bold text-[13px]">
                    moddatos
                  </div>
                </div>
              </div>

              <div className="text-xs text-amber-900 bg-white/80 p-3 rounded-xl border border-amber-200 flex items-start gap-2">
                <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Tip CCOFACT:</strong> Todas las empresas creadas en CCOFACT vienen preconfiguradas en modo <strong>BETA</strong> con las credenciales oficiales de prueba. ¡Puedes emitir boletas de prueba de inmediato desde el formulario POS o desde Control Finanzas!
                </span>
              </div>
            </div>

            {/* SECCIÓN 2: RUTA HACIA PRODUCCIÓN */}
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 space-y-6">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm">
                  2. CÓMO PASAR A PRODUCCIÓN (FACTURACIÓN REAL)
                </span>
                <span className="text-xs text-slate-600 font-semibold">
                  Pasos exactos para emitir con valor legal ante SUNAT
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* Paso 1 */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">1</span>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">RUC Habilitado</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">RUC Activo y Habido</h4>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    La empresa debe estar en estado <strong>ACTIVO y HABIDO</strong> en SUNAT y pertenecer al Régimen MYPE Tributario, Régimen Especial (RER) o Régimen General.
                  </p>
                </div>

                {/* Paso 2 */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">2</span>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">Certificado X.509</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">CDT Gratuito de SUNAT</h4>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    <strong>¡SUNAT te lo da GRATIS!</strong> Entra a <a href="https://e-menu.sunat.gob.pe" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold">SUNAT Operaciones en Línea</a> con tu Clave SOL, ve a <em>Empresas &gt; Comprobantes de Pago &gt; Certificado Digital Tributario &gt; Solicitar CDT</em> y descárgalo como archivo <code className="bg-slate-100 px-1 py-0.5 rounded">.pfx</code>.
                  </p>
                </div>

                {/* Paso 3 */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">3</span>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">Usuario SOL</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Usuario Secundario</h4>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    En SUNAT SOL, ve a <em>Administración de Usuarios Secundarios &gt; Crear Usuario</em>. Asígnale los perfiles de <strong>Comprobantes de Pago Electrónicos</strong>. No uses tu clave SOL principal por seguridad.
                  </p>
                </div>

                {/* Paso 4 */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">4</span>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">1 Clic en CCOFACT</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Activar Producción</h4>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    En la pestaña <strong>Empresas</strong> de CCOFACT, edita la empresa, sube el archivo <code className="bg-slate-100 px-1 py-0.5 rounded">.pfx</code>, ingresa tu usuario secundario y cambia el modo de <strong>BETA</strong> a <strong>PRODUCCION</strong>. ¡Listo!
                  </p>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: POLÍTICA DE ELIMINACIÓN Y ANULACIONES */}
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg shadow-sm">
                  3. ANULACIÓN Y ELIMINACIÓN DE BOLETAS Y FACTURAS
                </span>
                <span className="text-xs text-slate-600 font-semibold">
                  Sincronización en tiempo real con Control Finanzas y normativa SUNAT
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Sincronización Automática con Control Finanzas
                  </h4>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Cuando eliminas una venta o boleta en <strong>Control Finanzas</strong>, el sistema llama automáticamente al endpoint <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">DELETE /api/v1/documents/by-series-number/:serie/:numero</code> de CCOFACT PRO. 
                    El comprobante se elimina de la base de datos de facturación al instante, manteniendo ambos sistemas 100% sincronizados sin discrepancias.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" /> Regla Tributaria SUNAT (En Producción)
                  </h4>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    En ambiente de producción real, una vez que SUNAT ya recibió y aceptó un comprobante (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">01</code> o <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">03</code>), la anulación tributaria formal se realiza dentro de los <strong>7 días calendario</strong> o mediante la emisión de una <strong>Nota de Crédito Electrónica (07)</strong> con motivo <em>01 - Anulación de la operación</em>, la cual puedes emitir directamente desde la pestaña de Emisión Universal de CCOFACT PRO.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 9: GESTIÓN DE USUARIOS Y ROLES RBAC */}
        {/* ================================================================== */}
        {activeTab === 'usuarios' && (
          <UsersManagement
            apiBase={API_BASE}
            adminToken={adminToken}
            companies={companies}
            onShowAlert={(type, message) => setFeedbackAlert({ type, message })}
          />
        )}
      </main>

      {/* ================================================================== */}
      {/* MODALES DEL SISTEMA */}
      {/* ================================================================== */}

      {/* MODAL 1: VARIABLES DE INTEGRACIÓN EXTERNA (CONTROL FINANZAS / ERP) */}
      <IntegrationModal
        isOpen={showIntegrationModal}
        onClose={() => setShowIntegrationModal(false)}
        company={integrationCompany}
        apiBase={API_BASE}
        onCompanyUpdated={async (updated) => {
          setIntegrationCompany(updated);
          setCurrentCompany(updated);
          await fetchCompanies();
        }}
      />

      {/* MODAL 2: REGISTRO / EDICIÓN DE EMPRESAS EMISORAS */}
      <CompanyFormModal
        isOpen={showCompanyFormModal}
        onClose={() => {
          setShowCompanyFormModal(false);
          setCompanyToEdit(null);
        }}
        onSuccess={async (saved) => {
          await fetchCompanies();
          setCurrentCompany(saved);
          setIntegrationCompany(saved);
          setShowIntegrationModal(true);
        }}
        companyToEdit={companyToEdit}
        apiBase={API_BASE}
      />

      {/* MODAL 3: AUTENTICADOR FISCAL PRO SUNAT */}
      <FiscalAuthenticatorModal
        isOpen={showFiscalModal}
        onClose={() => {
          setShowFiscalModal(false);
          setFiscalAuditCompanyId(null);
        }}
        companyId={fiscalAuditCompanyId}
        apiBase={API_BASE}
      />

      {/* MODAL 4: VISTA PREVIA DE COMPROBANTE OFICIAL (A4 / TICKET 80MM) */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header del Modal */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">{previewDoc.full_number}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${previewDoc.status.includes('ACCEPTED') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {previewDoc.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Representación Oficial SUNAT UBL 2.1</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-white p-1 rounded-xl border border-slate-200 flex text-xs shadow-2xs">
                  <button
                    onClick={() => setPreviewFormat('A4')}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${previewFormat === 'A4' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Formato A4
                  </button>
                  <button
                    onClick={() => setPreviewFormat('TICKET')}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${previewFormat === 'TICKET' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Ticket 80mm
                  </button>
                </div>

                <a
                  href={`${API_BASE}/documents/${previewDoc.id}/xml`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-200 transition"
                >
                  <Download className="w-3.5 h-3.5" /> XML
                </a>

                <a
                  href={`${API_BASE}/documents/${previewDoc.id}/cdr`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-200 transition"
                >
                  <Download className="w-3.5 h-3.5" /> CDR
                </a>

                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* IFrame con la plantilla HTML generada por el backend */}
            <div className="flex-1 bg-slate-100 p-2 overflow-auto flex justify-center">
              {previewLoading ? (
                <div className="flex items-center justify-center text-slate-500 text-sm">
                  <RotateCw className="w-5 h-5 animate-spin mr-2 text-indigo-600" /> Cargando representación impresa...
                </div>
              ) : (
                <iframe
                  title="Document Preview"
                  srcDoc={previewHtml}
                  className="w-full h-full border-0 bg-white rounded-xl shadow-xs"
                  style={{ maxWidth: previewFormat === 'TICKET' ? '380px' : '100%' }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: DIAGNÓSTICO DETALLADO DE ESTADO SUNAT */}
      {diagnosticDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  diagnosticDoc.status.includes('ACCEPTED')
                    ? 'bg-emerald-50 text-emerald-600'
                    : diagnosticDoc.status === 'QUEUED'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-rose-50 text-rose-600'
                }`}>
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Diagnóstico Tributario SUNAT</h3>
                  <p className="text-xs text-slate-500 font-mono">{diagnosticDoc.full_number}</p>
                </div>
              </div>
              <button
                onClick={() => setDiagnosticDoc(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 my-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium block mb-1">Estado Registrado:</span>
                <span className={`inline-block font-extrabold px-2.5 py-0.5 rounded-full ${
                  diagnosticDoc.status.includes('ACCEPTED')
                    ? 'bg-emerald-100 text-emerald-800'
                    : diagnosticDoc.status === 'QUEUED'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {diagnosticDoc.status}
                </span>
              </div>

              {diagnosticDoc.sunat_response_code && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-medium block mb-1">Código de Respuesta SUNAT:</span>
                  <span className="font-mono font-bold text-slate-900">{diagnosticDoc.sunat_response_code}</span>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium block mb-1">Detalle Oficial Retornado:</span>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {diagnosticDoc.sunat_description || (diagnosticDoc.status.includes('ACCEPTED') ? 'Comprobante recibido y aceptado con éxito conforme a las especificaciones técnicas de SUNAT.' : 'Sin respuesta registrada.')}
                </p>
              </div>

              {/* Guía Técnica Especializada para Error 0111 o 0140 */}
              {(diagnosticDoc.sunat_response_code?.includes('0111') || diagnosticDoc.sunat_description?.includes('0111')) && (
                <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-xl text-amber-900">
                  <span className="font-bold block mb-1">💡 Solución para Error 0111 (SUNAT):</span>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-800">
                    <li>Ingrese a SUNAT Operaciones en Línea con su Clave SOL principal.</li>
                    <li>Vaya a <b>Administración de Usuarios Secundarios</b> y edite su usuario secundario.</li>
                    <li>Asigne el perfil <b>"Comprobantes de Pago Electrónicos"</b>.</li>
                    <li>Verifique que la empresa esté dada de alta en <b>SEE - Desde los Sistemas del Contribuyente</b>.</li>
                  </ol>
                </div>
              )}

              {(diagnosticDoc.sunat_response_code?.includes('0140') || diagnosticDoc.sunat_description?.includes('0140') || diagnosticDoc.status === 'QUEUED') && (
                <div className="bg-blue-50/80 border border-blue-200 p-3 rounded-xl text-blue-900">
                  <span className="font-bold block mb-1">⏳ Comprobante en Proceso (0140):</span>
                  <p className="text-[11px] text-blue-800">
                    SUNAT está validando el lote. No debe reenviar el archivo para no reiniciar el bloqueo de 15 minutos. Utilice el botón <b>"Consultar CDR en SUNAT"</b> para recuperar la constancia cuando SUNAT la libere.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDiagnosticDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Cerrar
              </button>

              {(diagnosticDoc.status === 'QUEUED' || diagnosticDoc.sunat_response_code?.includes('0140')) && (
                <button
                  type="button"
                  onClick={() => {
                    const id = diagnosticDoc.id;
                    setDiagnosticDoc(null);
                    handleConsultarCdr(id);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" /> Consultar CDR Oficial
                </button>
              )}

              {diagnosticDoc.status !== 'ACCEPTED' && diagnosticDoc.status !== 'ANULADO' && !diagnosticDoc.sunat_response_code?.includes('0140') && (
                <button
                  type="button"
                  onClick={() => {
                    const id = diagnosticDoc.id;
                    setDiagnosticDoc(null);
                    handleRetry(id);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-md shadow-amber-600/20 flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Reintentar Envío
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CENTRALIZADO DE CONFIRMACIÓN OBLIGATORIA (CONFIRMAR / CANCELAR) */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        subtitle={confirmConfig.subtitle}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        details={confirmConfig.details}
        requireCheckbox={confirmConfig.requireCheckbox}
        checkboxLabel={confirmConfig.checkboxLabel}
        loading={confirmConfig.loading || loading}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {/* NOTIFICACIÓN / ALERTA VISUAL ELEGANTE (SIN ALERT DE NAVEGADOR) */}
      {feedbackAlert && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-300 max-w-md">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-start gap-3 ${
            feedbackAlert.type === 'success'
              ? 'bg-slate-900 text-white border-emerald-500/50'
              : feedbackAlert.type === 'error'
              ? 'bg-slate-900 text-white border-red-500/50'
              : 'bg-slate-900 text-white border-indigo-500/50'
          }`}>
            <div className="mt-0.5 shrink-0">
              {feedbackAlert.type === 'success' ? (
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
              ) : feedbackAlert.type === 'error' ? (
                <div className="w-6 h-6 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Info className="w-4 h-4" />
                </div>
              )}
            </div>
            <div className="flex-1 text-xs leading-relaxed font-medium">
              {feedbackAlert.message}
            </div>
            <button
              onClick={() => setFeedbackAlert(null)}
              className="text-slate-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
