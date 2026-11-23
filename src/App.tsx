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
  Truck,
  MapPin,
  Sparkles,
  Leaf,
  Eye,
  Wand2,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { IntegrationModal } from './components/IntegrationModal';
import { CompanyFormModal } from './components/CompanyFormModal';
import { FiscalAuthenticatorModal } from './components/FiscalAuthenticatorModal';
import { AdminLogin } from './components/AdminLogin';
import { ConfirmModal } from './components/ConfirmModal';
import { UsersManagement } from './components/UsersManagement';
import { SeriesModal } from './components/SeriesModal';

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
  client_address?: string;
  client_email?: string;
  items?: DocumentItem[];
  total_gravada: string | number;
  total_exonerada?: string | number;
  total_inafecta?: string | number;
  total_gratuita?: string | number;
  total_igv: string | number;
  total_amount: string | number;
  status: string;
  sunat_response_code?: string;
  sunat_description?: string;
  sunat_notes?: string[];
  cdr_xml?: string | null;
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'emitir' | 'documentos' | 'guias' | 'colas' | 'empresas' | 'usuarios' | 'api' | 'consola' | 'guia_sunat'>('dashboard');

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
  const [showSeriesModal, setShowSeriesModal] = useState(false);
  const [seriesConfigCompany, setSeriesConfigCompany] = useState<Company | null>(null);
  const [companySeries, setCompanySeries] = useState<Array<{ document_type: string; series: string; current_number: number }>>([]);
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

  // Catálogos Oficiales SUNAT
  const SUNAT_CAT_09 = [
    { code: '01', desc: 'Anulación de la operación' },
    { code: '02', desc: 'Anulación por error en el RUC' },
    { code: '03', desc: 'Corrección por error en la descripción' },
    { code: '04', desc: 'Descuento global' },
    { code: '05', desc: 'Descuento por ítem' },
    { code: '06', desc: 'Devolución total' },
    { code: '07', desc: 'Devolución por ítem' },
    { code: '08', desc: 'Bonificación' },
    { code: '09', desc: 'Disminución en el valor' },
    { code: '10', desc: 'Otros Conceptos' },
    { code: '11', desc: 'Ajustes de operaciones de exportación' },
    { code: '12', desc: 'Ajustes afectos al IVAP' },
    { code: '13', desc: 'Corrección o rectificación de montos netos pendientes y cuotas' },
  ];

  const SUNAT_CAT_10 = [
    { code: '01', desc: 'Intereses por mora' },
    { code: '02', desc: 'Aumento en el valor' },
    { code: '03', desc: 'Penalidades/ otros conceptos' },
    { code: '11', desc: 'Ajustes de operaciones de exportación' },
    { code: '12', desc: 'Ajustes afectos al IVAP' },
  ];

  // Modal Oficial de Anulación Fiscal SUNAT (Nota de Crédito Tipo 01 - Cero Bajas)
  const [fiscalAnnulModal, setFiscalAnnulModal] = useState<{
    isOpen: boolean;
    doc: DocumentRecord | null;
    method: 'NOTA_CREDITO';
    deliveredToClient: boolean;
    motivo: string;
    loading: boolean;
  }>({
    isOpen: false,
    doc: null,
    method: 'NOTA_CREDITO',
    deliveredToClient: true,
    motivo: 'ANULACION DE LA OPERACION (MOTIVO 01)',
    loading: false,
  });

  // Modal de Edición Inteligente (Diff Engine SUNAT)
  const [smartEditModal, setSmartEditModal] = useState<{
    isOpen: boolean;
    doc: DocumentRecord | null;
    clientDocType: string;
    clientDocNumber: string;
    clientName: string;
    clientAddress: string;
    clientEmail: string;
    issueDate: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    loading: boolean;
  }>({
    isOpen: false,
    doc: null,
    clientDocType: '1',
    clientDocNumber: '',
    clientName: '',
    clientAddress: '',
    clientEmail: '',
    issueDate: '',
    items: [],
    loading: false,
  });

  // Modal de Emisión Manual de Nota (Catálogo 09 / 10 SUNAT)
  const [manualNoteModal, setManualNoteModal] = useState<{
    isOpen: boolean;
    doc: DocumentRecord | null;
    noteType: '07' | '08';
    reasonCode: string;
    reasonText: string;
    amount: number;
    issueDate: string;
    loading: boolean;
  }>({
    isOpen: false,
    doc: null,
    noteType: '07',
    reasonCode: '01',
    reasonText: '',
    amount: 0,
    issueDate: '',
    loading: false,
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

  // 7. Formulario de Emisión POS & GRE
  const [docType, setDocType] = useState<'01' | '03' | '07' | '08' | '09'>('01');
  const [series, setSeries] = useState('F001');
  const [currency, setCurrency] = useState<'PEN' | 'USD'>('PEN');
  const [paymentType, setPaymentType] = useState('Contado');
  const [sendNow, setSendNow] = useState(true);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  // 7.1. Datos Específicos para Guías de Remisión Electrónica (GRE - Tipo 09)
  const [motivoTraslado, setMotivoTraslado] = useState('01');
  const [motivoTrasladoDesc, setMotivoTrasladoDesc] = useState('Venta');
  const [modalidadTraslado, setModalidadTraslado] = useState<'01' | '02'>('02');
  const [fechaInicioTraslado, setFechaInicioTraslado] = useState<string>(() =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()),
  );
  const [pesoBrutoTotal, setPesoBrutoTotal] = useState<number>(10.0);
  const [numeroBultos, setNumeroBultos] = useState<number>(1);
  const [puntoPartidaDireccion, setPuntoPartidaDireccion] = useState('');
  const [puntoPartidaUbigeo, setPuntoPartidaUbigeo] = useState('150101');
  const [puntoLlegadaDireccion, setPuntoLlegadaDireccion] = useState('');
  const [puntoLlegadaUbigeo, setPuntoLlegadaUbigeo] = useState('150101');
  // Transporte Público (Modalidad 01)
  const [transportistaDoc, setTransportistaDoc] = useState('');
  const [transportistaNombre, setTransportistaNombre] = useState('');
  const [transportistaMtc, setTransportistaMtc] = useState('');
  // Transporte Privado (Modalidad 02)
  const [conductorDoc, setConductorDoc] = useState('');
  const [conductorNombre, setConductorNombre] = useState('');
  const [conductorLicencia, setConductorLicencia] = useState('');
  const [vehiculoPlaca, setVehiculoPlaca] = useState('');

  // 8. Referencias Tributarias para Notas de Crédito (07) y Débito (08)
  const [refDocType, setRefDocType] = useState<'01' | '03'>('03');
  const [refSeries, setRefSeries] = useState('B001');
  const [refNumber, setRefNumber] = useState<number>(1);
  const [refNumberStr, setRefNumberStr] = useState<string>('1');
  const [refReasonCode, setRefReasonCode] = useState('01');
  const [refReasonDesc, setRefReasonDesc] = useState('Anulación de la operación');
  const [linkedRefDoc, setLinkedRefDoc] = useState<DocumentRecord | null>(null);
  const [searchingRefDoc, setSearchingRefDoc] = useState(false);
  const [sunatConsultResult, setSunatConsultResult] = useState<any | null>(null);

  // 9. Datos del Adquiriente / Cliente
  const [clientDocType, setClientDocType] = useState('6');
  const [clientDocNumber, setClientDocNumber] = useState('20601234567');
  const [clientName, setClientName] = useState('CORPORACION ANDINA DE SERVICIOS S.A.C.');
  const [clientAddress, setClientAddress] = useState('Av. República de Panamá 3055, San Isidro, Lima');
  const [clientEmail, setClientEmail] = useState('contacto@andina.com.pe');
  const [lookingUpDoc, setLookingUpDoc] = useState(false);
  const [clientSunatStatus, setClientSunatStatus] = useState<{ estado: string; condicion: string; ubigeo?: string } | null>(null);

  // Cálculo Dinámico en Tiempo Real del Correlativo Atómico Siguiente en SUNAT
  const currentSeriesMatch = companySeries.find(
    s => s.document_type === docType && s.series.toUpperCase() === series.trim().toUpperCase()
  ) || companySeries.find(
    s => s.document_type === docType
  );
  const currentLastNum = currentSeriesMatch ? Number(currentSeriesMatch.current_number) : 0;
  const nextCorrelativeNum = currentLastNum + 1;
  const nextCorrelativeFull = `${series.trim().toUpperCase()}-${String(nextCorrelativeNum).padStart(8, '0')}`;

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
      fetchCompanySeries(currentCompany);
      updateDefaultSeries(docType);
      if (currentCompany.direccion && !puntoPartidaDireccion) {
        setPuntoPartidaDireccion(currentCompany.direccion);
      }
      if (currentCompany.ubigeo && (!puntoPartidaUbigeo || puntoPartidaUbigeo === '150101')) {
        setPuntoPartidaUbigeo(currentCompany.ubigeo);
      }
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
    } else if (type === '09') {
      setSeries('T001');
    }
  };

  // Conmutación sincronizada de Tipo de Comprobante (Factura, Boleta, NC, ND, Guía)
  const handleDocTypeChange = (newType: '01' | '03' | '07' | '08' | '09') => {
    setDocType(newType);
    updateDefaultSeries(newType);

    if (newType === '01') {
      // Factura exige RUC (6)
      setClientDocType('6');
      if (clientDocNumber.length === 8) {
        setClientDocNumber('');
        setClientName('');
        setClientAddress('');
        setClientSunatStatus(null);
      }
    } else if (newType === '03') {
      // Boleta permite DNI (1) o RUC (6) o Sin Documento (0)
      if (clientDocType !== '1' && clientDocType !== '0' && clientDocType !== '6') {
        setClientDocType('1');
      }
    } else if (newType === '07') {
      // Nota de Crédito: sincronizar serie y serie de referencia
      const s = refDocType === '01' ? 'FC01' : 'BC01';
      setSeries(s);
      setRefSeries(refDocType === '01' ? 'F001' : 'B001');
      if (refDocType === '01') {
        setClientDocType('6');
      } else if (clientDocType !== '1' && clientDocType !== '0' && clientDocType !== '6') {
        setClientDocType('1');
      }
    } else if (newType === '08') {
      // Nota de Débito: sincronizar serie y serie de referencia
      const s = refDocType === '01' ? 'FD01' : 'BD01';
      setSeries(s);
      setRefSeries(refDocType === '01' ? 'F001' : 'B001');
      if (refDocType === '01') {
        setClientDocType('6');
      } else if (clientDocType !== '1' && clientDocType !== '0' && clientDocType !== '6') {
        setClientDocType('1');
      }
    } else if (newType === '09') {
      setSeries('T001');
    }
  };

  // Autocompletado maestro a partir de un comprobante original
  const populateFromDoc = (found: DocumentRecord, targetRefType: '01' | '03') => {
    setLinkedRefDoc(found);
    setRefDocType(targetRefType);
    setRefSeries(found.series);
    setRefNumber(found.number);
    setRefNumberStr(String(found.number));

    // Sincronizar serie de la Nota de Crédito o Débito
    if (docType === '07') {
      setSeries(targetRefType === '01' ? 'FC01' : 'BC01');
      setRefReasonCode('01');
      setRefReasonDesc(`Anulación de la operación ${found.full_number}`);
    } else if (docType === '08') {
      setSeries(targetRefType === '01' ? 'FD01' : 'BD01');
      setRefReasonCode('01');
      setRefReasonDesc(`Intereses por mora de ${found.full_number}`);
    }

    // Datos del cliente
    setClientDocType(found.client_doc_type || (targetRefType === '01' ? '6' : '1'));
    setClientDocNumber(found.client_doc_number || '');
    setClientName(found.client_name || '');
    if (found.client_address) setClientAddress(found.client_address);
    if (found.client_email) setClientEmail(found.client_email);
    setCurrency((found.currency as any) || 'PEN');

    // Detectar afectación tributaria real del comprobante de origen
    const refExonerada = Number(found.total_exonerada || 0);
    const refInafecta = Number(found.total_inafecta || 0);
    const refIgv = Number(found.total_igv || 0);
    let originalAffectation = '10';
    if (refExonerada > 0 && refIgv === 0) {
      originalAffectation = '20';
    } else if (refInafecta > 0 && refIgv === 0) {
      originalAffectation = '30';
    }

    // Si el comprobante original tiene líneas detalladas, cargarlas exactamente
    if (found.items && found.items.length > 0) {
      setItems(found.items.map(it => ({
        code: it.code || 'ANUL',
        description: it.description,
        unit_measure: it.unit_measure || 'NIU',
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        igv_affectation_type: it.igv_affectation_type || originalAffectation
      })));
    } else {
      setItems([{
        code: 'ANUL-01',
        description: `Anulación de la operación de ${found.full_number}`,
        unit_measure: 'ZZ',
        quantity: 1,
        unit_price: Number(found.total_amount),
        igv_affectation_type: originalAffectation
      }]);
    }
  };

  // Cambio sincronizado del comprobante modificado (Factura vs Boleta) con ajuste estricto de serie y receptor
  const handleRefDocTypeChange = (newRefType: '01' | '03') => {
    setRefDocType(newRefType);
    setSunatConsultResult(null);
    setLinkedRefDoc(null);
    if (newRefType === '01') {
      setRefSeries('F001');
      setClientDocType('6');
      if (docType === '07') setSeries('FC01');
      if (docType === '08') setSeries('FD01');
    } else {
      setRefSeries('B001');
      setClientDocType('1');
      if (docType === '07') setSeries('BC01');
      if (docType === '08') setSeries('BD01');
    }
  };

  // Consulta en vivo a los servidores de SUNAT (billConsultService getStatusCdr)
  const handleConsultarSunatEnVivo = async (customSeries?: string, customNumber?: number, customType?: '01' | '03') => {
    let s = (customSeries || refSeries).trim().toUpperCase();
    let n = Number(customNumber || refNumber || parseInt(refNumberStr, 10) || 1);
    let t = customType || refDocType;

    // Si el usuario ingresó o pegó formato con guión ej. B001-000001 o B001-21
    if (s.includes('-')) {
      const parts = s.split('-');
      s = parts[0].trim().toUpperCase();
      const parsedNum = parseInt(parts[1], 10);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        n = parsedNum;
        setRefNumber(parsedNum);
        setRefNumberStr(parts[1].trim());
      }
      setRefSeries(s);
    }

    // Auto-detección inteligente del tipo por la letra inicial de la serie
    if (s.startsWith('F')) {
      t = '01';
      setRefDocType('01');
      if (docType === '07') setSeries('FC01');
      if (docType === '08') setSeries('FD01');
    } else if (s.startsWith('B')) {
      t = '03';
      setRefDocType('03');
      if (docType === '07') setSeries('BC01');
      if (docType === '08') setSeries('BD01');
    }

    if (!s || !n || n <= 0) {
      setFeedbackAlert({
        type: 'error',
        message: 'Ingresa una serie válida (ej. B001 o F001) y un número correlativo mayor a 0 para consultar en SUNAT.'
      });
      return;
    }

    if (!currentCompany?.api_key) {
      setFeedbackAlert({
        type: 'error',
        message: 'Debe seleccionar una empresa activa con API Key para realizar la consulta oficial a SUNAT.'
      });
      return;
    }

    setSearchingRefDoc(true);
    setSunatConsultResult(null);

    try {
      const res = await fetch(`${API_BASE}/documents/consultar-validez-sunat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': currentCompany.api_key,
        },
        body: JSON.stringify({
          docType: t,
          series: s,
          number: n,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al conectar con los servidores de SUNAT');
      }

      setSunatConsultResult(data);

      if (data.official_status === 'ACEPTADO') {
        if (data.document) {
          setLinkedRefDoc(data.document);
          populateFromDoc(data.document, t);
          setDocuments(prev => [data.document, ...prev.filter(d => d.id !== data.document.id)]);
        } else {
          // Documento existe en SUNAT pero fue emitido directamente en el portal web de SUNAT (externo) o en Control Finanzas
          setLinkedRefDoc(null);
          // Si SUNAT o el backend devolvió los datos del cliente desde el CDR oficial:
          if (data.recipient?.doc_number) {
            const rType = data.recipient.doc_type || (t === '01' ? '6' : '1');
            setClientDocType(rType);
            setClientDocNumber(data.recipient.doc_number);
            if (data.recipient.name) {
              setClientName(data.recipient.name);
            } else {
              handleLookupDoc(data.recipient.doc_number, rType);
            }
          }
          if (data.recipient?.address) {
            setClientAddress(data.recipient.address);
          }
          // Cargar los bienes y productos vendidos para la Nota de Crédito / Débito
          if (data.items && data.items.length > 0) {
            setItems(data.items.map((it: any) => ({
              code: it.code || 'PROD-01',
              description: it.description,
              unit_measure: it.unit_measure || 'NIU',
              quantity: Number(it.quantity) || 1,
              unit_price: Number(it.unit_price) || 0,
              igv_affectation_type: '10',
            })));
          } else if (data.total_amount && Number(data.total_amount) > 0) {
            setItems([{
              code: 'REF-01',
              description: `Operación comercial ${data.full_number}`,
              unit_measure: 'NIU',
              quantity: 1,
              unit_price: Number(data.total_amount),
              igv_affectation_type: '10',
            }]);
          }
        }

        setFeedbackAlert({
          type: 'success',
          message: `✓ SUNAT VERIFICADO: ${data.full_number} (${t === '01' ? 'Factura' : 'Boleta'}) aceptada en servidores de SUNAT con CDR Oficial.`
        });
      } else if (data.official_status === 'EN_PROCESO') {
        setFeedbackAlert({
          type: 'info',
          message: `SUNAT: El comprobante ${data.full_number} se encuentra en proceso en SUNAT (Código ${data.sunat_response_code}).`
        });
      } else if (data.requires_sol_credentials || data.official_status === 'REQUIERE_CREDENCIALES_SOL') {
        setLinkedRefDoc(null);
        setFeedbackAlert({
          type: 'info',
          message: `Credenciales de Producción Requeridas: Configure su Usuario Secundario SOL y Clave SOL en el perfil de la empresa para consultar en tiempo real a SUNAT.`
        });
      } else {
        setLinkedRefDoc(null);
        setFeedbackAlert({
          type: 'error',
          message: `⚠️ SUNAT Oficial: El comprobante ${data.full_number} NO existe en SUNAT (Código ${data.sunat_response_code}: ${data.sunat_description || 'No encontrado'}).`
        });
      }
    } catch (err: any) {
      setFeedbackAlert({
        type: 'error',
        message: `Error consultando en SUNAT: ${err.message}`
      });
    } finally {
      setSearchingRefDoc(false);
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

  // Consulta de series y correlativos oficiales de la empresa
  const fetchCompanySeries = async (comp?: Company | null) => {
    const target = comp || currentCompany;
    if (!target?.api_key) return;
    try {
      const res = await fetch(`${API_BASE}/series`, {
        headers: { 'x-api-key': target.api_key },
      });
      if (res.ok) {
        const data = await res.json();
        setCompanySeries(data || []);
      }
    } catch (err) {
      console.error('Error cargando series:', err);
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
      await fetchCompanySeries(currentCompany);
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

  // Consulta inteligente RUC / DNI ante SUNAT y RENIEC con Auto-Detección
  const handleLookupDoc = async (customNum?: string, customType?: string) => {
    const rawInput = (customNum !== undefined ? customNum : clientDocNumber).trim().replace(/\D/g, '');
    if (!rawInput) {
      setFeedbackAlert({
        type: 'error',
        message: 'Debe ingresar un número de documento para consultar.'
      });
      return;
    }

    let detectedType = customType || clientDocType;

    // Auto-detección inteligente por longitud de caracteres
    if (rawInput.length === 11) {
      detectedType = '6';
      setClientDocType('6');
    } else if (rawInput.length === 8) {
      if (docType === '01') {
        setFeedbackAlert({
          type: 'error',
          message: 'ATENCIÓN SUNAT: Factura Electrónica (01) requiere obligatoriamente RUC de 11 dígitos. Un DNI de 8 dígitos solo es válido para Boletas de Venta (03).'
        });
        return;
      }
      detectedType = '1';
      setClientDocType('1');
    }

    setLookingUpDoc(true);
    try {
      if (detectedType === '6') {
        if (rawInput.length !== 11) {
          throw new Error('El RUC debe tener exactamente 11 dígitos numéricos.');
        }
        const res = await fetch(`${API_BASE}/consultas/ruc/${rawInput}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || `RUC ${rawInput} no encontrado en el padrón nacional de SUNAT.`);
        }
        const data = await res.json();
        setClientName(data.razon_social);
        if (data.direccion) setClientAddress(data.direccion);
        setClientSunatStatus({
          estado: data.estado || 'ACTIVO',
          condicion: data.condicion || 'HABIDO',
          ubigeo: data.ubigeo
        });
        setFeedbackAlert({
          type: 'success',
          message: `RUC ${rawInput} verificado ante SUNAT: ${data.razon_social} [${data.estado || 'ACTIVO'} / ${data.condicion || 'HABIDO'}]`
        });
      } else if (detectedType === '1') {
        if (rawInput.length !== 8) {
          throw new Error('El DNI debe tener exactamente 8 dígitos numéricos.');
        }
        const res = await fetch(`${API_BASE}/consultas/dni/${rawInput}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || `DNI ${rawInput} no encontrado en RENIEC.`);
        }
        const data = await res.json();
        setClientName(data.nombre_completo);
        if (data.direccion) setClientAddress(data.direccion);
        setClientSunatStatus(null);
        setFeedbackAlert({
          type: 'success',
          message: `DNI ${rawInput} verificado ante RENIEC: ${data.nombre_completo}`
        });
      }
    } catch (err: any) {
      setFeedbackAlert({
        type: 'error',
        message: err.message
      });
    } finally {
      setLookingUpDoc(false);
    }
  };

  // Motor de Validación y Diagnóstico Fiscal SUNAT en Tiempo Real
  const getSunatValidationDiagnostics = () => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const cleanDoc = clientDocNumber.trim();
    const totalsCalc = calculateTotals();
    const totalMonto = Number(totalsCalc.total);

    // Reglas por tipo de comprobante
    if (docType === '01') {
      if (!series.startsWith('F')) {
        errors.push(`Serie inválida: Para Facturas Electrónicas la serie debe iniciar con 'F' (ej. F001, F002).`);
      }
      if (clientDocType !== '6') {
        errors.push(`Tipo de documento receptor inválido: Factura exige RUC (Tipo 6). No se permite emitir con DNI ni Sin Documento.`);
      }
      if (cleanDoc.length !== 11 || !/^\d{11}$/.test(cleanDoc)) {
        errors.push(`RUC de receptor incompleto: El RUC debe contener exactamente 11 dígitos numéricos.`);
      }
      if (!clientName.trim()) {
        errors.push(`Razón Social del receptor es obligatoria para emisión de Factura.`);
      }
    } else if (docType === '03') {
      if (!series.startsWith('B')) {
        errors.push(`Serie inválida: Para Boletas de Venta la serie debe iniciar con 'B' (ej. B001, B002).`);
      }
      if (totalMonto > 700 && clientDocType === '0') {
        errors.push(`Bloqueo SUNAT (R.S. 007-99): Boletas con importe mayor a S/ 700.00 requieren identificar obligatoriamente al adquiriente con DNI o RUC.`);
      }
      if (clientDocType === '1' && (cleanDoc.length !== 8 || !/^\d{8}$/.test(cleanDoc))) {
        errors.push(`DNI de receptor inválido: El DNI debe contener exactamente 8 dígitos numéricos.`);
      }
      if (clientDocType === '6' && (cleanDoc.length !== 11 || !/^\d{11}$/.test(cleanDoc))) {
        warnings.push(`Si emite Boleta a un RUC, verifique que el cliente no requiera crédito fiscal (en tal caso debe ser Factura).`);
      }
      if (!clientName.trim() && clientDocType !== '0') {
        errors.push(`El nombre o razón social del cliente es obligatorio.`);
      }
    } else if (docType === '07') {
      const expectedPrefix = refDocType === '01' ? 'FC' : 'BC';
      if (!series.startsWith(expectedPrefix)) {
        errors.push(`Serie inválida para Nota de Crédito: Modifica ${refDocType === '01' ? 'Factura' : 'Boleta'}, por tanto su serie debe iniciar con '${expectedPrefix}' (ej. ${expectedPrefix}01).`);
      }
      if (!refSeries.trim()) {
        errors.push(`Serie del comprobante que modifica es obligatoria.`);
      }
      if (!refNumber || refNumber <= 0) {
        errors.push(`Número correlativo del comprobante que modifica es obligatorio.`);
      }
      if (!refReasonCode) {
        errors.push(`Código de motivo de Nota de Crédito (Catálogo 09 SUNAT) es obligatorio.`);
      }
    } else if (docType === '08') {
      const expectedPrefix = refDocType === '01' ? 'FD' : 'BD';
      if (!series.startsWith(expectedPrefix)) {
        errors.push(`Serie inválida para Nota de Débito: Modifica ${refDocType === '01' ? 'Factura' : 'Boleta'}, por tanto su serie debe iniciar con '${expectedPrefix}' (ej. ${expectedPrefix}01).`);
      }
      if (!refSeries.trim() || !refNumber || refNumber <= 0) {
        errors.push(`Datos del comprobante modificado son obligatorios.`);
      }
    } else if (docType === '09') {
      if (!series.startsWith('T')) {
        errors.push(`Serie inválida: Para Guía de Remisión Remitente la serie debe iniciar con 'T' (ej. T001).`);
      }
      if (!puntoPartidaDireccion.trim()) {
        errors.push(`Dirección del punto de partida es obligatoria.`);
      }
      if (!puntoPartidaUbigeo || !/^\d{6}$/.test(puntoPartidaUbigeo.trim())) {
        errors.push(`Ubigeo de partida debe contener 6 dígitos numéricos (ej. 150101).`);
      }
      if (!puntoLlegadaDireccion.trim()) {
        errors.push(`Dirección del punto de llegada es obligatoria.`);
      }
      if (!puntoLlegadaUbigeo || !/^\d{6}$/.test(puntoLlegadaUbigeo.trim())) {
        errors.push(`Ubigeo de llegada debe contener 6 dígitos numéricos (ej. 150101).`);
      }
      if (Number(pesoBrutoTotal) <= 0) {
        errors.push(`El peso bruto total de la carga debe ser mayor a 0 KGM.`);
      }
      if (modalidadTraslado === '01') {
        if (!transportistaDoc.trim() || transportistaDoc.trim().length !== 11) {
          errors.push(`Transporte Público: RUC de 11 dígitos de la empresa transportista es obligatorio.`);
        }
        if (!transportistaNombre.trim()) {
          errors.push(`Razón social de la empresa transportista es obligatoria.`);
        }
      } else {
        if (!conductorDoc.trim() || conductorDoc.trim().length !== 8) {
          errors.push(`Transporte Privado: DNI de 8 dígitos del conductor es obligatorio.`);
        }
        if (!vehiculoPlaca.trim()) {
          errors.push(`Placa del vehículo de transporte es obligatoria.`);
        }
      }
    }

    // Reglas de Ítems
    if (items.length === 0) {
      errors.push(`Debe ingresar al menos un ítem o producto en el comprobante.`);
    }
    items.forEach((it, idx) => {
      if (!it.description.trim()) {
        errors.push(`Ítem #${idx + 1}: Descripción vacía.`);
      }
      if (Number(it.quantity) <= 0) {
        errors.push(`Ítem #${idx + 1}: Cantidad debe ser mayor a 0.`);
      }
      if (docType !== '09' && Number(it.unit_price) < 0) {
        errors.push(`Ítem #${idx + 1}: Precio unitario no puede ser negativo.`);
      }
    });

    if (currentCompany?.env_mode === 'PRODUCCION') {
      recommendations.push(`Entorno PRODUCCIÓN: Esta emisión generará afectación legal oficial en SUNAT y en el SIRE.`);
    } else {
      recommendations.push(`Entorno BETA: Emisión de prueba en ambiente de homologación SUNAT (sin efecto fiscal).`);
    }

    return {
      errors,
      warnings,
      recommendations,
      isValid: errors.length === 0
    };
  };

  // Cálculos matemáticos en tiempo real conforme a la normativa SUNAT UBL 2.1 (Catálogo 07)
  const calculateTotals = () => {
    let gravada = 0;
    let exonerada = 0;
    let inafecta = 0;
    let gratuita = 0;
    let igv = 0;
    let total = 0;

    items.forEach(it => {
      const qty = Number(it.quantity) || 0;
      const price = Number(it.unit_price) || 0;
      const lineTotal = Number((qty * price).toFixed(2));
      const aff = it.igv_affectation_type || '10';

      if (aff === '10') {
        // Gravado - 18% IGV (Precio unitario incluye IGV según norma de ventas al consumidor)
        const base = Number((lineTotal / 1.18).toFixed(2));
        const lineIgv = Number((lineTotal - base).toFixed(2));
        gravada += base;
        igv += lineIgv;
        total += lineTotal;
      } else if (aff === '20') {
        // Exonerado - 0% IGV (Ley de Amazonía N° 27037 / Apéndice I y II Ley del IGV)
        exonerada += lineTotal;
        total += lineTotal;
      } else if (aff === '30' || aff === '40') {
        // Inafecto / Exportación - 0% IGV
        inafecta += lineTotal;
        total += lineTotal;
      } else {
        // Transferencias a título gratuito: no se cobra al cliente en el total a pagar
        gratuita += lineTotal;
      }
    });

    return {
      gravada: gravada.toFixed(2),
      exonerada: exonerada.toFixed(2),
      inafecta: inafecta.toFixed(2),
      gratuita: gratuita.toFixed(2),
      subtotal: (gravada + exonerada + inafecta).toFixed(2),
      igv: igv.toFixed(2),
      total: total.toFixed(2),
      hasGravada: gravada > 0,
      hasExonerada: exonerada > 0,
      hasInafecta: inafecta > 0,
      hasGratuita: gratuita > 0,
    };
  };

  // Aplicar afectación global a todas las líneas del comprobante
  const handleApplyGlobalAffectation = (affType: string) => {
    setItems(items.map(it => ({
      ...it,
      igv_affectation_type: affType
    })));
    setFeedbackAlert({
      type: 'info',
      message: `Régimen actualizado a ${affType === '20' ? 'Exonerado (0% IGV - Ley Amazonía / Apéndice)' : affType === '30' ? 'Inafecto (0% IGV)' : 'Gravado (18% IGV)'} para todos los ítems.`
    });
  };

  const handleAddItem = () => {
    const lastAff = items.length > 0 ? items[items.length - 1].igv_affectation_type : '10';
    setItems([
      ...items,
      {
        code: `PRD-${items.length + 1}`,
        description: '',
        unit_measure: 'NIU',
        quantity: 1,
        unit_price: 10.00,
        igv_affectation_type: lastAff
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
      await fetchCompanySeries();
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

    if (docType === '09') {
      if (!puntoPartidaDireccion.trim()) {
        setFeedbackAlert({
          type: 'error',
          message: 'Debe ingresar la dirección del Punto de Partida para la Guía de Remisión.'
        });
        return;
      }
      if (!puntoPartidaUbigeo || !/^\d{6}$/.test(puntoPartidaUbigeo.trim())) {
        setFeedbackAlert({
          type: 'error',
          message: 'El Ubigeo de partida debe ser un código de 6 dígitos numéricos (ej. 150101).'
        });
        return;
      }
      if (!puntoLlegadaDireccion.trim()) {
        setFeedbackAlert({
          type: 'error',
          message: 'Debe ingresar la dirección del Punto de Llegada para la Guía de Remisión.'
        });
        return;
      }
      if (!puntoLlegadaUbigeo || !/^\d{6}$/.test(puntoLlegadaUbigeo.trim())) {
        setFeedbackAlert({
          type: 'error',
          message: 'El Ubigeo de llegada debe ser un código de 6 dígitos numéricos (ej. 150101).'
        });
        return;
      }
      if (Number(pesoBrutoTotal) <= 0) {
        setFeedbackAlert({
          type: 'error',
          message: 'El Peso Bruto Total debe ser mayor a 0 KGM.'
        });
        return;
      }
      if (modalidadTraslado === '01') {
        if (!transportistaDoc.trim() || transportistaDoc.trim().length !== 11) {
          setFeedbackAlert({
            type: 'error',
            message: 'Para Transporte Público debe ingresar el RUC de 11 dígitos de la empresa transportista.'
          });
          return;
        }
        if (!transportistaNombre.trim()) {
          setFeedbackAlert({
            type: 'error',
            message: 'Debe ingresar la Razón Social de la empresa transportista.'
          });
          return;
        }
      } else {
        if (!conductorDoc.trim() || conductorDoc.trim().length !== 8) {
          setFeedbackAlert({
            type: 'error',
            message: 'Para Transporte Privado debe ingresar el DNI de 8 dígitos del conductor.'
          });
          return;
        }
        if (!vehiculoPlaca.trim()) {
          setFeedbackAlert({
            type: 'error',
            message: 'Debe ingresar el número de placa del vehículo de transporte.'
          });
          return;
        }
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

    if (docType === '09') {
      const guiaPayload: any = {
        motivo_traslado: motivoTraslado,
        motivo_traslado_descripcion: motivoTrasladoDesc,
        modalidad_traslado: modalidadTraslado,
        fecha_inicio_traslado: fechaInicioTraslado,
        peso_bruto_total: Number(pesoBrutoTotal),
        unidad_peso: 'KGM',
        numero_bultos: Number(numeroBultos),
        punto_partida: {
          ubigeo: puntoPartidaUbigeo.trim(),
          direccion: puntoPartidaDireccion.trim(),
        },
        punto_llegada: {
          ubigeo: puntoLlegadaUbigeo.trim(),
          direccion: puntoLlegadaDireccion.trim(),
        },
      };

      if (modalidadTraslado === '01') {
        guiaPayload.transportista = {
          tipo_documento: '6',
          numero_documento: transportistaDoc.trim(),
          razon_social: transportistaNombre.trim(),
          numero_mtc: transportistaMtc.trim() || undefined,
        };
      } else {
        guiaPayload.conductor = {
          tipo_documento: '1',
          numero_documento: conductorDoc.trim(),
          nombres: conductorNombre.trim(),
          licencia: conductorLicencia.trim(),
        };
        guiaPayload.vehiculo = {
          placa: vehiculoPlaca.trim().toUpperCase(),
        };
      }

      payload.guia_datos = guiaPayload;
      payload.metadata = { guia_datos: guiaPayload };
    }

    const docName = docType === '01' ? 'Factura Electrónica' : docType === '03' ? 'Boleta de Venta Electrónica' : docType === '07' ? 'Nota de Crédito' : docType === '08' ? 'Nota de Débito' : 'Guía de Remisión Remitente (09)';
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
        { label: 'Serie y Correlativo Oficial', value: `${nextCorrelativeFull} (Continuación Atómica SUNAT)` },
        { label: docType === '09' ? 'Destinatario' : 'Cliente Receptor', value: `${clientName} (${clientDocType === '6' ? 'RUC' : clientDocType === '1' ? 'DNI' : 'Doc'}: ${cleanDocNum})` },
        ...(docType === '09' ? [
          { label: 'Motivo Traslado', value: `${motivoTraslado} - ${motivoTrasladoDesc}` },
          { label: 'Modalidad', value: modalidadTraslado === '01' ? 'Pública (Empresa Transportista)' : 'Privada (Vehículo Propio)' },
          { label: 'Carga', value: `${pesoBrutoTotal} KGM (${numeroBultos} bultos)` },
        ] : [
          { label: 'Total a Cobrar', value: `${currency} ${totals.total}` },
        ]),
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

  // Anulación fiscal oficial SUNAT: Comunicación de Baja (≤ 7 días) vs Nota de Crédito (Tipo 01)
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

    if (!isAcceptedBySunat) {
      // Si es borrador o local sin aceptación, descarte local directo
      setConfirmConfig({
        isOpen: true,
        title: 'Descartar Registro Local',
        subtitle: 'BORRADOR / LOCAL',
        variant: 'danger',
        message: `El comprobante ${doc.full_number} no fue emitido ni aceptado por SUNAT. ¿Desea descartar su registro local de la base de datos?`,
        details: [
          { label: 'Comprobante', value: doc.full_number },
          { label: 'Cliente Receptor', value: doc.client_name },
          { label: 'Monto Total', value: `S/ ${Number(doc.total_amount).toFixed(2)}` },
        ],
        confirmText: 'Descartar Comprobante',
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
            if (!res.ok) throw new Error(data.message || 'Error eliminando comprobante');
            setFeedbackAlert({
              type: 'success',
              message: `Comprobante ${doc.full_number} descartado exitosamente.`
            });
            await fetchDocuments();
            await fetchQueueStats();
          } catch (err: any) {
            setFeedbackAlert({ type: 'error', message: err.message });
          } finally {
            setLoading(false);
          }
        }
      });
      return;
    }

    // Normativa SUNAT UBL 2.1 (CERO BAJAS): Todo comprobante aceptado se anula con Nota de Crédito Tipo 01
    setFiscalAnnulModal({
      isOpen: true,
      doc,
      method: 'NOTA_CREDITO',
      deliveredToClient: true,
      motivo: 'ANULACION DE LA OPERACION (MOTIVO 01)',
      loading: false,
    });
  };

  const handleConfirmFiscalAnnulment = async () => {
    if (!currentCompany || !fiscalAnnulModal.doc) return;
    setFiscalAnnulModal(prev => ({ ...prev, loading: true }));
    const doc = fiscalAnnulModal.doc;

    try {
      const endpoint = `${API_BASE}/documents/${doc.id}/anular-fiscal`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': currentCompany.api_key,
        },
        body: JSON.stringify({
          motivo: fiscalAnnulModal.motivo,
          deliveredToClient: fiscalAnnulModal.deliveredToClient,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al procesar anulación en SUNAT');
      }

      setFeedbackAlert({
        type: 'success',
        message: `ÉXITO: ${data.message || 'Comprobante anulado formalmente con Nota de Crédito ante SUNAT.'}`
      });

      setFiscalAnnulModal(prev => ({ ...prev, isOpen: false, doc: null, loading: false }));
      await fetchDocuments();
      await fetchQueueStats();
    } catch (err: any) {
      setFeedbackAlert({
        type: 'error',
        message: `ERROR: ${err.message}`
      });
      setFiscalAnnulModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Edición Inteligente con Diff Engine (SUNAT UBL 2.1)
  const handleOpenSmartEdit = (doc: DocumentRecord) => {
    let itemsArr: Array<{ name: string; quantity: number; price: number }> = [];
    if (doc.items && Array.isArray(doc.items)) {
      itemsArr = doc.items.map((it: any) => ({
        name: it.description || it.name || 'Ítem',
        quantity: Number(it.quantity) || 1,
        price: Number(it.unit_price || it.price) || 0,
      }));
    } else {
      itemsArr = [
        {
          name: `Servicio / Venta ${doc.full_number}`,
          quantity: 1,
          price: Number(doc.total_amount) || 0,
        },
      ];
    }

    setSmartEditModal({
      isOpen: true,
      doc,
      clientDocType: doc.client_doc_type || '1',
      clientDocNumber: doc.client_doc_number || '',
      clientName: doc.client_name || '',
      clientAddress: doc.client_address || '',
      clientEmail: doc.client_email || '',
      issueDate: doc.issue_date ? doc.issue_date.split('T')[0] : new Date().toISOString().split('T')[0],
      items: itemsArr,
      loading: false,
    });
  };

  const handleConfirmSmartEdit = async () => {
    if (!currentCompany || !smartEditModal.doc) return;
    setSmartEditModal(prev => ({ ...prev, loading: true }));
    const doc = smartEditModal.doc;

    try {
      const res = await fetch(`${API_BASE}/documents/${doc.id}/smart-edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': currentCompany.api_key,
        },
        body: JSON.stringify({
          client_doc_type: smartEditModal.clientDocType,
          client_doc_number: smartEditModal.clientDocNumber,
          client_name: smartEditModal.clientName,
          client_address: smartEditModal.clientAddress,
          client_email: smartEditModal.clientEmail,
          issue_date: smartEditModal.issueDate,
          items: smartEditModal.items.map(it => ({
            name: it.name,
            quantity: Number(it.quantity),
            price: Number(it.price),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al procesar edición inteligente con Diff Engine');
      }

      setFeedbackAlert({
        type: 'success',
        message: `ÉXITO (${data.caso}): ${data.mensaje || 'Comprobante y notas procesados correctamente.'}`,
      });

      setSmartEditModal(prev => ({ ...prev, isOpen: false, doc: null, loading: false }));
      await fetchDocuments();
      await fetchQueueStats();
    } catch (err: any) {
      setFeedbackAlert({
        type: 'error',
        message: `ERROR: ${err.message}`,
      });
      setSmartEditModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Emisión Manual de Nota (Catálogo 09 / 10)
  const handleOpenManualNote = (doc: DocumentRecord) => {
    setManualNoteModal({
      isOpen: true,
      doc,
      noteType: '07',
      reasonCode: '01',
      reasonText: '',
      amount: Number(doc.total_amount),
      issueDate: new Date().toISOString().split('T')[0],
      loading: false,
    });
  };

  const handleConfirmManualNote = async () => {
    if (!currentCompany || !manualNoteModal.doc) return;
    setManualNoteModal(prev => ({ ...prev, loading: true }));
    const doc = manualNoteModal.doc;

    try {
      const res = await fetch(`${API_BASE}/documents/${doc.id}/manual-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': currentCompany.api_key,
        },
        body: JSON.stringify({
          note_type: manualNoteModal.noteType,
          reason_code: manualNoteModal.reasonCode,
          reason_text: manualNoteModal.reasonText,
          amount: Number(manualNoteModal.amount),
          issue_date: manualNoteModal.issueDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al emitir nota oficial');
      }

      setFeedbackAlert({
        type: 'success',
        message: `ÉXITO: Nota ${data.nota?.full_number || ''} emitida correctamente ante SUNAT.`,
      });

      setManualNoteModal(prev => ({ ...prev, isOpen: false, doc: null, loading: false }));
      await fetchDocuments();
      await fetchQueueStats();
    } catch (err: any) {
      setFeedbackAlert({
        type: 'error',
        message: `ERROR: ${err.message}`,
      });
      setManualNoteModal(prev => ({ ...prev, loading: false }));
    }
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
  const queuedCount = Math.max(
    documents.filter(d => d.status === 'QUEUED' || d.status === 'SENDING').length,
    Number(queueStats.counts?.find((c: any) => c.status === 'PENDING')?.count || queueStats.counts?.find((c: any) => c.status === 'PENDING')?._count?.id || queueStats.queuedDocsCount || 0),
  );
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

          {/* BOTÓN CONFIGURAR SERIES Y CORRELATIVOS SUNAT */}
          {currentCompany && (
            <button
              onClick={() => {
                setSeriesConfigCompany(currentCompany);
                setShowSeriesModal(true);
              }}
              title="Configurar e inicializar correlativos de emisión para no duplicar en SUNAT"
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-indigo-700 text-xs px-3 py-2 rounded-xl border border-indigo-200 shadow-2xs font-bold transition cursor-pointer"
            >
              <Hash className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden lg:inline">Series & Correlativos</span>
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
          onClick={() => { setActiveTab('guias'); fetchDocuments(); }}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'guias'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4 text-indigo-600" /> Guías de Remisión ({documents.filter(d => d.document_type === '09').length})
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
                  Emite Facturas (01), Boletas (03), Notas de Crédito (07), Notas de Débito (08) y Guías de Remisión (09)
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

            {(() => {
              const diagnostics = getSunatValidationDiagnostics();
              return (
                <form onSubmit={handleSubmitEmission} className="space-y-6">
                  {/* BARRA SUPERIOR DE CORRELATIVO Y SECUENCIA FISCAL SUNAT */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs shadow-2xs">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-slate-600 font-medium">Secuencia Fiscal SUNAT:</span>
                      <span className="font-mono font-black text-indigo-950 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200 shadow-2xs">
                        Próximo comprobante: {nextCorrelativeFull}
                      </span>
                      <span className="text-slate-400 font-medium text-[11px]">
                        (Último registrado: #{currentLastNum})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSeriesConfigCompany(currentCompany);
                        setShowSeriesModal(true);
                      }}
                      className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200 shadow-2xs transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                      title="Inicializar correlativos para continuar la numeración oficial emitida en SUNAT"
                    >
                      <Hash className="w-3.5 h-3.5 text-indigo-600" />
                      <span>⚙️ Inicializar Correlativo SUNAT</span>
                    </button>
                  </div>

                  {/* Selector de Tipo y Serie */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de Comprobante</label>
                      <select
                        value={docType}
                        onChange={(e) => handleDocTypeChange(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:border-indigo-600 outline-none transition cursor-pointer"
                      >
                        <option value="01">01 - FACTURA ELECTRÓNICA</option>
                        <option value="03">03 - BOLETA DE VENTA</option>
                        <option value="07">07 - NOTA DE CRÉDITO</option>
                        <option value="08">08 - NOTA DE DÉBITO</option>
                        <option value="09">09 - GUÍA DE REMISIÓN REMITENTE</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-700">Serie Fiscal</label>
                        <span className="text-[10px] font-mono text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          #{currentLastNum + 1}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={series}
                        onChange={(e) => setSeries(e.target.value.toUpperCase())}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition"
                        placeholder={docType === '01' ? 'F001' : docType === '03' ? 'B001' : docType === '07' ? (refDocType === '01' ? 'FC01' : 'BC01') : docType === '08' ? (refDocType === '01' ? 'FD01' : 'BD01') : 'T001'}
                        required
                      />
                      <p className="text-[10px] text-slate-500 mt-1 truncate">
                        {docType === '01' ? 'Facturas: F001 a F999' :
                         docType === '03' ? 'Boletas: B001 a B999' :
                         docType === '07' ? (refDocType === '01' ? 'NC: FC01 a FC99' : 'NC: BC01 a BC99') :
                         docType === '08' ? (refDocType === '01' ? 'ND: FD01 a FD99' : 'ND: BD01 a BD99') :
                         'Guías: T001 a T999'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Moneda</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as any)}
                        disabled={docType === '09'}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:border-indigo-600 outline-none transition cursor-pointer disabled:opacity-50"
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
                        disabled={docType === '09'}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:border-indigo-600 outline-none transition cursor-pointer disabled:opacity-50"
                      >
                        <option value="Contado">Contado</option>
                        <option value="Credito">Crédito a 30 días</option>
                      </select>
                    </div>
                  </div>

                  {/* ASISTENTE TRIBUTARIO Y MONITOR DE REGLAS SUNAT EN VIVO */}
                  <div className={`p-4 rounded-2xl border transition ${
                    !diagnostics.isValid
                      ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-black/5">
                      <div className="flex items-center gap-2">
                        {!diagnostics.isValid ? (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        <span className="font-bold text-xs uppercase tracking-wider">
                          {!diagnostics.isValid
                            ? `Validaciones SUNAT Pendientes (${diagnostics.errors.length} requisitos por subsanar)`
                            : 'Comprobante 100% Conforme con SUNAT UBL 2.1 (Válido para Transmisión Fiscal)'}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        !diagnostics.isValid
                          ? 'bg-rose-200 text-rose-800'
                          : 'bg-emerald-200 text-emerald-800'
                      }`}>
                        {currentCompany?.env_mode === 'PRODUCCION' ? 'Validez Legal SIRE' : 'Homologación Beta'}
                      </span>
                    </div>

                    {!diagnostics.isValid ? (
                      <ul className="mt-2 space-y-1 text-xs text-rose-800">
                        {diagnostics.errors.map((err, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 font-medium">
                            <span className="text-rose-500 font-bold">•</span>
                            <span>{err}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                        <span className="bg-white/90 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" /> Serie: {series}
                        </span>
                        <span className="bg-white/90 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" /> Receptor: {clientDocType === '6' ? 'RUC' : clientDocType === '1' ? 'DNI' : 'Doc'} {clientDocNumber}
                        </span>
                        {totals.hasExonerada && (
                          <span className="bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 border border-emerald-300">
                            <Leaf className="w-3 h-3 text-emerald-600" /> Régimen: Exonerado 0% IGV (Ley Amazonía)
                          </span>
                        )}
                        {totals.hasInafecta && (
                          <span className="bg-purple-100 text-purple-900 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 border border-purple-300">
                            <FileText className="w-3 h-3 text-purple-600" /> Régimen: Inafecto 0% IGV
                          </span>
                        )}
                        {totals.hasGravada && (
                          <span className="bg-white/90 text-indigo-900 px-2.5 py-1 rounded-lg border border-indigo-200 font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3 text-indigo-600" /> IGV 18%: {currency === 'USD' ? '$' : 'S/'} {totals.igv}
                          </span>
                        )}
                        {clientSunatStatus && (
                          <span className="bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 border border-emerald-300">
                            <Award className="w-3 h-3 text-emerald-600" /> SUNAT: {clientSunatStatus.estado} - {clientSunatStatus.condicion}
                          </span>
                        )}
                        <span className="bg-white/90 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" /> Certificado X.509 Listo
                        </span>
                      </div>
                    )}

                    {diagnostics.warnings.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-black/5 text-xs text-amber-800 space-y-1">
                        {diagnostics.warnings.map((w, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SECCIÓN NOTAS DE CRÉDITO Y DÉBITO: VERIFICACIÓN Y CONSULTA EN VIVO A SUNAT */}
                  {(docType === '07' || docType === '08') && (
                    <div className="border-2 border-indigo-200/80 bg-gradient-to-br from-indigo-50/50 via-slate-50 to-white rounded-3xl p-5 md:p-6 shadow-sm space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/20 shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-slate-900 font-extrabold text-sm tracking-tight flex items-center gap-2">
                              <span>Consulta y Verificación Oficial en SUNAT (En Vivo)</span>
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                WebService billConsultService
                              </span>
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                              Valida el comprobante original en los servidores de SUNAT para asegurar validez del CDR antes de emitir la {docType === '07' ? 'Nota de Crédito' : 'Nota de Débito'}.
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] bg-indigo-100 text-indigo-800 font-bold px-3 py-1 rounded-full border border-indigo-200 shrink-0 self-start sm:self-auto">
                          Catálogo {docType === '07' ? '09 NC' : '10 ND'} SUNAT
                        </span>
                      </div>

                      {/* Selector de Tipo (Pills) + Serie + Correlativo + Botón Consulta */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                        {/* Tipo de Comprobante */}
                        <div className="md:col-span-4 space-y-1.5">
                          <label className="block text-slate-800 font-bold text-xs">
                            Comprobante Afectado / Modificado *
                          </label>
                          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleRefDocTypeChange('03')}
                              className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                refDocType === '03'
                                  ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>03 - Boleta</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRefDocTypeChange('01')}
                              className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                refDocType === '01'
                                  ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <Building2 className="w-3.5 h-3.5" />
                              <span>01 - Factura</span>
                            </button>
                          </div>
                        </div>

                        {/* Serie Original */}
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="block text-slate-800 font-bold text-xs">
                            Serie en SUNAT *
                          </label>
                          <input
                            type="text"
                            value={refSeries}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              if (val.includes('-')) {
                                const parts = val.split('-');
                                setRefSeries(parts[0].trim());
                                const parsedNum = parseInt(parts[1], 10);
                                if (!isNaN(parsedNum) && parsedNum > 0) {
                                  setRefNumber(parsedNum);
                                  setRefNumberStr(parts[1].trim());
                                }
                                if (parts[0].startsWith('F')) handleRefDocTypeChange('01');
                                else if (parts[0].startsWith('B')) handleRefDocTypeChange('03');
                              } else {
                                setRefSeries(val);
                                if (val.startsWith('F') && refDocType !== '01') handleRefDocTypeChange('01');
                                else if (val.startsWith('B') && refDocType !== '03') handleRefDocTypeChange('03');
                              }
                              setSunatConsultResult(null);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-black text-slate-900 text-center uppercase outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
                            placeholder={refDocType === '01' ? 'F001' : 'B001'}
                            required
                          />
                        </div>

                        {/* Correlativo Original */}
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="block text-slate-800 font-bold text-xs">
                            Nº Correlativo *
                          </label>
                          <input
                            type="text"
                            value={refNumberStr}
                            onChange={(e) => {
                              const rawVal = e.target.value;
                              setRefNumberStr(rawVal);
                              const parsed = parseInt(rawVal, 10);
                              setRefNumber(isNaN(parsed) ? 1 : parsed);
                              setSunatConsultResult(null);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-black text-slate-900 text-center outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
                            placeholder="Ej: 1 o 21"
                            required
                          />
                        </div>

                        {/* Botón de Consulta Oficial */}
                        <div className="md:col-span-4">
                          <button
                            type="button"
                            onClick={() => handleConsultarSunatEnVivo()}
                            disabled={searchingRefDoc}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-blue-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-indigo-600/25 transition cursor-pointer disabled:opacity-50"
                          >
                            {searchingRefDoc ? (
                              <>
                                <RotateCw className="w-4 h-4 animate-spin text-white" />
                                <span>Consultando en SUNAT...</span>
                              </>
                            ) : (
                              <>
                                <Search className="w-4 h-4" />
                                <span>⚡ Consultar Validez en SUNAT</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* RESULTADO OFICIAL EN VIVO DE SUNAT */}
                      {sunatConsultResult && (
                        <div className="animate-in fade-in-50 duration-200">
                          {sunatConsultResult.requires_sol_credentials || sunatConsultResult.official_status === 'REQUIERE_CREDENCIALES_SOL' ? (
                            <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 text-xs space-y-2.5 shadow-2xs">
                              <div className="flex items-center gap-2 font-black text-amber-900 text-sm">
                                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                                <span>Credenciales Secundarias SOL de Producción Requeridas para Consulta en Vivo</span>
                              </div>
                              <p className="text-amber-800 leading-relaxed font-medium">
                                {sunatConsultResult.sunat_description || 'Para consultar comprobantes emitidos en el portal de SUNAT directamente en tiempo real, configure su Usuario Secundario SOL y Clave SOL en el perfil de su empresa.'}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/80">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCompanyToEdit(currentCompany);
                                    setShowCompanyFormModal(true);
                                  }}
                                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                                >
                                  ⚙️ Configurar Credenciales SOL de Empresa
                                </button>
                                <span className="text-amber-700 text-[11px] font-medium">
                                  ✓ El comprobante referenciado {refSeries}-{refNumber} se enviará legalmente a SUNAT al emitir la Nota.
                                </span>
                              </div>
                            </div>
                          ) : sunatConsultResult.official_status === 'ACEPTADO' ? (
                            <div className="bg-white border-2 border-emerald-500/80 rounded-2xl p-4 shadow-sm space-y-3.5">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-800 border-2 border-emerald-300 flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                                    {refDocType === '01' ? 'FAC' : 'BOL'}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-black text-slate-900 text-sm tracking-tight">
                                        {sunatConsultResult.full_number}
                                      </span>
                                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        SUNAT CDR: CÓDIGO {sunatConsultResult.sunat_response_code || '0'} (ACEPTADO)
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 font-medium">
                                      {sunatConsultResult.sunat_description || 'El comprobante ha sido aceptado por SUNAT.'}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {linkedRefDoc && (
                                    <button
                                      type="button"
                                      onClick={() => openPreview(linkedRefDoc)}
                                      className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md shadow-indigo-500/20 transition cursor-pointer"
                                      title="Visualizar la representación oficial de SUNAT con código QR y constancia de recepción"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>👁️ Ver Boleta Oficial SUNAT</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSunatConsultResult(null);
                                      setLinkedRefDoc(null);
                                    }}
                                    className="text-slate-400 hover:text-slate-700 text-xs font-semibold px-2.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
                                    title="Limpiar consulta"
                                  >
                                    ✕ Limpiar
                                  </button>
                                </div>
                              </div>

                              {/* Ficha de Datos Tributarios Verificados */}
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-200/60">
                                  <div>
                                    <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Cliente Adquirente</span>
                                    <span className="font-extrabold text-slate-900 block truncate text-xs">
                                      {(linkedRefDoc?.client_doc_type || sunatConsultResult.recipient?.doc_type) === '6' ? 'RUC' : 'DNI'}{' '}
                                      {linkedRefDoc?.client_doc_number || sunatConsultResult.recipient?.doc_number || '-'}
                                    </span>
                                    <p className="text-slate-700 truncate font-medium text-[11px]">
                                      {linkedRefDoc?.client_name || sunatConsultResult.recipient?.name || clientName || 'Receptor Verificado'}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Fecha & Estado SUNAT</span>
                                    <span className="font-extrabold text-slate-900 block text-xs">
                                      {sunatConsultResult.issue_date || linkedRefDoc?.issue_date || 'Fecha registrada en SUNAT'}
                                    </span>
                                    <p className="text-emerald-700 text-[11px] font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" /> CDR Oficial Aceptado
                                    </p>
                                  </div>
                                  <div className="text-left sm:text-right sm:border-l sm:border-emerald-200/80 sm:pl-3 flex flex-col justify-center">
                                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Monto Total Declarado</span>
                                    <span className="text-xl font-black font-mono text-emerald-700">
                                      S/ {Number(sunatConsultResult.total_amount || linkedRefDoc?.total_amount || 0).toFixed(2)}
                                    </span>
                                  </div>
                                </div>

                                {/* Tabla de Bienes / Productos Vendidos */}
                                {((linkedRefDoc?.items && linkedRefDoc.items.length > 0) || (sunatConsultResult.items && sunatConsultResult.items.length > 0)) ? (
                                  <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden shadow-2xs">
                                    <div className="bg-emerald-50/80 px-3 py-2 border-b border-emerald-200 flex items-center justify-between">
                                      <span className="font-bold text-[11px] text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                                        📦 Bienes / Productos Vendidos en este Comprobante ({sunatConsultResult.full_number})
                                      </span>
                                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                                        ✓ Precargados en la Nota
                                      </span>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-100">
                                          <tr>
                                            <th className="px-3 py-1.5">Bien / Producto Vendido</th>
                                            <th className="px-3 py-1.5 text-center">Cant.</th>
                                            <th className="px-3 py-1.5 text-right">Precio Unit.</th>
                                            <th className="px-3 py-1.5 text-right">Total</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {((linkedRefDoc?.items && linkedRefDoc.items.length > 0) ? linkedRefDoc.items : sunatConsultResult.items).map((it: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50/50">
                                              <td className="px-3 py-2 font-bold text-slate-800">{it.description}</td>
                                              <td className="px-3 py-2 text-center font-mono font-semibold text-slate-700">{it.quantity}</td>
                                              <td className="px-3 py-2 text-right font-mono text-slate-700">S/ {Number(it.unit_price).toFixed(2)}</td>
                                              <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">S/ {Number(it.total || (Number(it.quantity) * Number(it.unit_price))).toFixed(2)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot className="bg-emerald-50/40 border-t border-emerald-200 font-bold text-xs">
                                          <tr>
                                            <td colSpan={3} className="px-3 py-2 text-right text-slate-700 uppercase font-black">Total Declarado:</td>
                                            <td className="px-3 py-2 text-right font-mono font-black text-emerald-800 text-sm">
                                              S/ {Number(sunatConsultResult.total_amount || linkedRefDoc?.total_amount || 0).toFixed(2)}
                                            </td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-2.5 bg-emerald-50/70 border border-emerald-300 rounded-xl text-[11px] text-emerald-900 flex items-center justify-between">
                                    <span>
                                      ✓ Comprobante <b>{sunatConsultResult.full_number}</b> verificado en servidores de SUNAT por un total de <b>S/ {Number(sunatConsultResult.total_amount || 0).toFixed(2)}</b>.
                                    </span>
                                    <span className="font-bold text-emerald-800">
                                      Listo para emitir Nota
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : sunatConsultResult.official_status === 'EN_PROCESO' ? (
                            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-xs space-y-1">
                              <div className="flex items-center gap-2 font-bold text-amber-900">
                                <RotateCw className="w-4 h-4 animate-spin text-amber-600" />
                                <span>SUNAT: Comprobante en Proceso de Validación (Código {sunatConsultResult.sunat_response_code})</span>
                              </div>
                              <p className="text-amber-800 font-medium">
                                {sunatConsultResult.sunat_description || 'SUNAT aún está procesando el comprobante. Vuelve a consultar en unos minutos.'}
                              </p>
                            </div>
                          ) : (
                            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 text-xs space-y-1.5">
                              <div className="flex items-center gap-2 font-black text-rose-900 text-sm">
                                <AlertCircle className="w-4 h-4 text-rose-600" />
                                <span>Comprobante no existe en SUNAT ({sunatConsultResult.full_number})</span>
                              </div>
                              <p className="text-rose-800 font-medium">
                                SUNAT respondió: <b>{sunatConsultResult.sunat_description || 'El ticket no existe'}</b> (Código SUNAT: {sunatConsultResult.sunat_response_code || '0127'}).
                              </p>
                              <div className="bg-white/80 p-2.5 rounded-xl border border-rose-200 text-rose-700 text-[11px]">
                                <strong>Validación Oficial SUNAT:</strong> El comprobante no figura como emitido ni aceptado en los servidores de SUNAT. Verifique la serie y el número ingresados. No se ha generado ningún registro ficticio en el sistema.
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-800 font-bold mb-1">
                        Código de Motivo SUNAT ({docType === '07' ? 'Catálogo 09 NC' : 'Catálogo 10 ND'}) *
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
                          className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-900 font-semibold outline-none focus:ring-2 focus:ring-amber-400"
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
                          className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-900 font-semibold outline-none focus:ring-2 focus:ring-amber-400"
                        >
                          <option value="01">01 - Intereses por mora</option>
                          <option value="02">02 - Aumento en el valor</option>
                          <option value="03">03 - Penalidades / otros conceptos</option>
                        </select>
                      )}
                      <p className="text-[10px] text-amber-800 mt-1">
                        Causa tributaria formal estandarizada por SUNAT
                      </p>
                    </div>

                    <div>
                      <label className="block text-slate-800 font-bold mb-1">
                        Sustento Detallado del Motivo (Aparece en XML y PDF) *
                      </label>
                      <input
                        type="text"
                        value={refReasonDesc}
                        onChange={(e) => setRefReasonDesc(e.target.value)}
                        className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-amber-400"
                        placeholder="Ej: Anulación de la venta por devolución de mercadería"
                        required
                      />
                      <p className="text-[10px] text-amber-800 mt-1">
                        Descripción legible que se transmitirá a SUNAT y al cliente
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECCIÓN GUÍA DE REMISIÓN REMITENTE (09) */}
              {docType === '09' && (
                <div className="border border-indigo-200 bg-indigo-50/40 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                    <Truck className="w-4 h-4 text-indigo-600" />
                    <span>Datos de Traslado y Despacho (Guía de Remisión Remitente - UBL 2.1)</span>
                  </div>

                  {/* Parámetros Básicos del Traslado */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Motivo de Traslado</label>
                      <select
                        value={motivoTraslado}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMotivoTraslado(val);
                          const labels: Record<string, string> = {
                            '01': 'Venta',
                            '02': 'Compra',
                            '04': 'Traslado entre establecimientos de la misma empresa',
                            '08': 'Importación',
                            '09': 'Exportación',
                            '13': 'Otros traslados',
                          };
                          setMotivoTrasladoDesc(labels[val] || 'Venta');
                        }}
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-slate-900 font-semibold outline-none"
                      >
                        <option value="01">01 - Venta</option>
                        <option value="02">02 - Compra</option>
                        <option value="04">04 - Traslado entre locales</option>
                        <option value="08">08 - Importación</option>
                        <option value="09">09 - Exportación</option>
                        <option value="13">13 - Otros motivos</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Modalidad de Traslado</label>
                      <select
                        value={modalidadTraslado}
                        onChange={(e) => setModalidadTraslado(e.target.value as any)}
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-slate-900 font-semibold outline-none"
                      >
                        <option value="02">02 - Privado (Vehículo y Conductor Propio)</option>
                        <option value="01">01 - Público (Empresa Transportista)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Fecha Inicio de Traslado</label>
                      <input
                        type="date"
                        value={fechaInicioTraslado}
                        onChange={(e) => setFechaInicioTraslado(e.target.value)}
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-slate-900 font-semibold outline-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Peso (KGM)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={pesoBrutoTotal}
                          onChange={(e) => setPesoBrutoTotal(parseFloat(e.target.value) || 0)}
                          className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">N° Bultos</label>
                        <input
                          type="number"
                          min="1"
                          value={numeroBultos}
                          onChange={(e) => setNumeroBultos(parseInt(e.target.value, 10) || 1)}
                          className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 outline-none"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Puntos de Partida y Llegada */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                    <div className="bg-white/90 p-3.5 rounded-xl border border-indigo-100 space-y-2">
                      <div className="flex items-center gap-1.5 text-indigo-700 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Punto de Partida (Origen de la Carga)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-[11px] text-slate-500 font-medium mb-1">Ubigeo (6 dígitos)</label>
                          <input
                            type="text"
                            maxLength={6}
                            value={puntoPartidaUbigeo}
                            onChange={(e) => setPuntoPartidaUbigeo(e.target.value.replace(/\D/g, ''))}
                            placeholder="150101"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900 outline-none"
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[11px] text-slate-500 font-medium mb-1">Dirección de Partida</label>
                          <input
                            type="text"
                            value={puntoPartidaDireccion}
                            onChange={(e) => setPuntoPartidaDireccion(e.target.value)}
                            placeholder="Av. Ejemplo 123, Lima"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/90 p-3.5 rounded-xl border border-indigo-100 space-y-2">
                      <div className="flex items-center gap-1.5 text-indigo-700 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Punto de Llegada (Destino de la Carga)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-[11px] text-slate-500 font-medium mb-1">Ubigeo (6 dígitos)</label>
                          <input
                            type="text"
                            maxLength={6}
                            value={puntoLlegadaUbigeo}
                            onChange={(e) => setPuntoLlegadaUbigeo(e.target.value.replace(/\D/g, ''))}
                            placeholder="150101"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900 outline-none"
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[11px] text-slate-500 font-medium mb-1">Dirección de Llegada</label>
                          <input
                            type="text"
                            value={puntoLlegadaDireccion}
                            onChange={(e) => setPuntoLlegadaDireccion(e.target.value)}
                            placeholder="Av. Destino 456, Callao"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operador de Transporte según Modalidad */}
                  {modalidadTraslado === '01' ? (
                    <div className="bg-white/90 p-3.5 rounded-xl border border-indigo-100 space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 text-indigo-700 font-bold">
                        <Truck className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Datos de la Empresa Transportista (Transporte Público)</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-500 font-medium mb-1">RUC Transportista (11 dígitos)</label>
                          <input
                            type="text"
                            maxLength={11}
                            value={transportistaDoc}
                            onChange={(e) => setTransportistaDoc(e.target.value.replace(/\D/g, ''))}
                            placeholder="20123456789"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900 outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 font-medium mb-1">Razón Social Transportista</label>
                          <input
                            type="text"
                            value={transportistaNombre}
                            onChange={(e) => setTransportistaNombre(e.target.value)}
                            placeholder="TRANSPORTES LOGISTICOS S.A.C."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 font-medium mb-1">N° Registro MTC (Opcional)</label>
                          <input
                            type="text"
                            value={transportistaMtc}
                            onChange={(e) => setTransportistaMtc(e.target.value)}
                            placeholder="MTC-12345"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/90 p-3.5 rounded-xl border border-indigo-100 space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 text-indigo-700 font-bold">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Datos del Conductor y Vehículo (Transporte Privado)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-500 font-medium mb-1">DNI Conductor (8 dígitos)</label>
                          <input
                            type="text"
                            maxLength={8}
                            value={conductorDoc}
                            onChange={(e) => setConductorDoc(e.target.value.replace(/\D/g, ''))}
                            placeholder="45678901"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900 outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 font-medium mb-1">Nombres y Apellidos</label>
                          <input
                            type="text"
                            value={conductorNombre}
                            onChange={(e) => setConductorNombre(e.target.value)}
                            placeholder="JUAN PEREZ CHOQUE"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 font-medium mb-1">Licencia de Conducir</label>
                          <input
                            type="text"
                            value={conductorLicencia}
                            onChange={(e) => setConductorLicencia(e.target.value.toUpperCase())}
                            placeholder="Q45678901"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900 outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 font-medium mb-1">Placa del Vehículo</label>
                          <input
                            type="text"
                            value={vehiculoPlaca}
                            onChange={(e) => setVehiculoPlaca(e.target.value.toUpperCase())}
                            placeholder="ABC-123"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-bold text-xs text-slate-900 outline-none"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {docType === '09' ? 'Datos del Destinatario (Receptor de la Carga)' : 'Datos del Adquiriente / Cliente'}
                  </h4>
                  {linkedRefDoc && (
                    <span className="text-[11px] text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full font-bold border border-emerald-300 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Datos cargados automáticamente desde {linkedRefDoc.full_number}
                    </span>
                  )}
                </div>
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
                        onClick={() => handleLookupDoc()}
                        disabled={lookingUpDoc}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                        title="Consultar y autocompletar razón social"
                      >
                        {lookingUpDoc ? <RotateCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                        <span>Consultar SUNAT / RENIEC</span>
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
                        if (val.length === 11) {
                          if (clientDocType !== '6') {
                            setClientDocType('6');
                          }
                          handleLookupDoc(val, '6');
                        } else if (val.length === 8) {
                          if (docType !== '01') {
                            if (clientDocType !== '1') {
                              setClientDocType('1');
                            }
                            handleLookupDoc(val, '1');
                          }
                        }
                      }}
                      placeholder={clientDocType === '6' ? "Ingresa RUC (11 dígitos)" : clientDocType === '1' ? "Ingresa DNI (8 dígitos)" : "Número de documento"}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                      required={clientDocType !== '0'}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">Razón Social / Nombre Completo</label>
                      {clientSunatStatus && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          clientSunatStatus.estado === 'ACTIVO' && clientSunatStatus.condicion === 'HABIDO'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-amber-50 text-amber-700 border-amber-300'
                        }`}>
                          SUNAT: {clientSunatStatus.estado} - {clientSunatStatus.condicion}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 outline-none"
                      required={clientDocType !== '0'}
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Líneas de Detalle / Productos o Servicios
                    </h4>
                    {totals.hasExonerada && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                        <Leaf className="w-3 h-3 text-emerald-600" /> Exonerado (0% IGV Activo)
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-xs font-bold text-indigo-600 px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Línea
                  </button>
                </div>

                {/* SELECTOR RÁPIDO DE RÉGIMEN TRIBUTARIO GLOBAL */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Régimen de IGV Rápido para el comprobante:
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Cambia la tasa de IGV de todas las líneas en un solo clic
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleApplyGlobalAffectation('10')}
                      className="px-2.5 py-1 rounded-lg border text-xs font-bold bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border-slate-200 transition cursor-pointer"
                    >
                      💼 Gravado (18%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyGlobalAffectation('20')}
                      className="px-2.5 py-1 rounded-lg border text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 transition cursor-pointer flex items-center gap-1"
                    >
                      <Leaf className="w-3 h-3 text-emerald-600" /> Exonerado (0% Amazonía)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyGlobalAffectation('30')}
                      className="px-2.5 py-1 rounded-lg border text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-300 transition cursor-pointer"
                    >
                      📄 Inafecto (0%)
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {items.map((it, idx) => (
                    <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="grid grid-cols-12 gap-3 items-center">
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
                          <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Descripción del Ítem</label>
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
                          <label className="block text-[10px] text-slate-500 mb-1 font-semibold">
                            {it.igv_affectation_type === '20'
                              ? 'Precio (Exonerado 0%)'
                              : it.igv_affectation_type === '30'
                              ? 'Precio (Inafecto 0%)'
                              : 'Precio (Inc. 18% IGV)'}
                          </label>
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
                          <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Afectación IGV SUNAT</label>
                          <select
                            value={it.igv_affectation_type}
                            onChange={(e) => handleItemChange(idx, 'igv_affectation_type', e.target.value)}
                            className={`w-full border rounded-lg px-2 py-1.5 text-xs font-bold outline-none cursor-pointer ${
                              it.igv_affectation_type === '20'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : it.igv_affectation_type === '30'
                                ? 'bg-purple-50 text-purple-800 border-purple-300'
                                : 'bg-slate-50 text-slate-800 border-slate-200'
                            }`}
                          >
                            <option value="10">10 - Gravado (18%)</option>
                            <option value="20">20 - Exonerado (0%)</option>
                            <option value="30">30 - Inafecto (0%)</option>
                            <option value="40">40 - Exportación (0%)</option>
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

                      {/* Desglose dinámico en vivo por ítem */}
                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
                        <div>
                          {it.igv_affectation_type === '20' ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <Leaf className="w-3 h-3 text-emerald-600" />
                              Operación Exonerada: Tasa 0.00% IGV • Base: {currency === 'USD' ? '$' : 'S/'} {(Number(it.quantity) * Number(it.unit_price)).toFixed(2)}
                            </span>
                          ) : it.igv_affectation_type === '30' ? (
                            <span className="text-purple-700 font-bold flex items-center gap-1">
                              Operación Inafecta: Tasa 0.00% IGV • Base: {currency === 'USD' ? '$' : 'S/'} {(Number(it.quantity) * Number(it.unit_price)).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-medium">
                              Base Imponible: <span className="font-mono font-bold text-slate-800">{currency === 'USD' ? '$' : 'S/'} {((Number(it.quantity) * Number(it.unit_price)) / 1.18).toFixed(2)}</span> • IGV (18%): <span className="font-mono font-bold text-indigo-700">{currency === 'USD' ? '$' : 'S/'} {((Number(it.quantity) * Number(it.unit_price)) - ((Number(it.quantity) * Number(it.unit_price)) / 1.18)).toFixed(2)}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-slate-700 font-semibold">
                          Total Línea: <span className="font-mono font-bold text-slate-900">{currency === 'USD' ? '$' : 'S/'} {(Number(it.quantity) * Number(it.unit_price)).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resumen de Totales Dinámico SUNAT */}
                <div className="flex justify-end pt-3">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 w-80 space-y-2 text-xs shadow-xs">
                    {Number(totals.gravada) > 0 && (
                      <div className="flex justify-between text-slate-600 font-medium">
                        <span>Operación Gravada (Base):</span>
                        <span className="font-mono font-bold text-slate-900">{currency === 'USD' ? '$' : 'S/'} {totals.gravada}</span>
                      </div>
                    )}
                    {Number(totals.exonerada) > 0 && (
                      <div className="flex justify-between text-emerald-800 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                        <span className="flex items-center gap-1">
                          <Leaf className="w-3 h-3 text-emerald-600" /> Op. Exonerada (0% IGV):
                        </span>
                        <span className="font-mono font-bold">{currency === 'USD' ? '$' : 'S/'} {totals.exonerada}</span>
                      </div>
                    )}
                    {Number(totals.inafecta) > 0 && (
                      <div className="flex justify-between text-purple-800 font-bold bg-purple-50 px-2 py-1 rounded-lg border border-purple-200">
                        <span>Op. Inafecta (0% IGV):</span>
                        <span className="font-mono font-bold">{currency === 'USD' ? '$' : 'S/'} {totals.inafecta}</span>
                      </div>
                    )}
                    {Number(totals.gratuita) > 0 && (
                      <div className="flex justify-between text-amber-800 font-bold bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                        <span>Op. Gratuita:</span>
                        <span className="font-mono font-bold">{currency === 'USD' ? '$' : 'S/'} {totals.gratuita}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600 font-medium">
                      <span>I.G.V. {Number(totals.gravada) > 0 ? '(18%)' : '(0.00)'}:</span>
                      <span className={`font-mono font-bold ${Number(totals.igv) > 0 ? 'text-indigo-700' : 'text-slate-500'}`}>
                        {currency === 'USD' ? '$' : 'S/'} {totals.igv}
                      </span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-slate-900">
                      <span>TOTAL A PAGAR:</span>
                      <span className="font-mono text-emerald-600">{currency === 'USD' ? '$' : 'S/'} {totals.total}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón de Emisión con Control Estricto */}
              <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3 pt-2">
                <div className="text-xs">
                  {!diagnostics.isValid ? (
                    <span className="text-rose-700 font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      Hay {diagnostics.errors.length} observaciones pendientes de cumplir según normativa SUNAT.
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Comprobante validado y listo para generar XML UBL 2.1 firmado.
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !diagnostics.isValid}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg shadow-indigo-500/25 transition cursor-pointer"
                >
                  {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{loading ? 'Firmando y Transmitiendo...' : 'Firmar y Emitir Comprobante a SUNAT'}</span>
                </button>
              </div>
            </form>
          );
        })()}
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
                          {doc.document_type === '01' ? 'Factura' : doc.document_type === '03' ? 'Boleta' : doc.document_type === '07' ? 'Nota Crédito' : doc.document_type === '08' ? 'Nota Débito' : 'Guía Remisión'}
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

                            {doc.status.includes('ACCEPTED') && doc.status !== 'ANULADO' && (doc.document_type === '01' || doc.document_type === '03') && (
                              <>
                                <button
                                  onClick={() => handleOpenSmartEdit(doc)}
                                  className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition cursor-pointer"
                                  title="Edición Inteligente con Diff Engine (SUNAT UBL 2.1) - Detección automática de Casos A, B, C y D"
                                >
                                  <Wand2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenManualNote(doc)}
                                  className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition cursor-pointer"
                                  title="Emisión Manual de Nota de Crédito o Débito (Catálogo 09 y 10 SUNAT)"
                                >
                                  <FileSpreadsheet className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {doc.status.includes('ACCEPTED') && doc.status !== 'ANULADO' && (
                              <button
                                onClick={() => handleAnularDocument(doc)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition cursor-pointer"
                                title="Anulación Formal Directa ante SUNAT (Emite Nota de Crédito Motivo 01)"
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
        {/* TAB: GUÍAS DE REMISIÓN ELECTRÓNICA (GRE - TIPO 09) */}
        {/* ================================================================== */}
        {activeTab === 'guias' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-6 h-6 text-indigo-600" />
                  Módulo Oficial de Guías de Remisión Electrónica (GRE Remitente)
                </h2>
                <p className="text-xs text-slate-500">
                  Despacho oficial de mercaderías con XML UBL 2.1 DespatchAdvice, firma digital X.509 y CDR de SUNAT
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchDocuments}
                  className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-2xs transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-600" /> Actualizar
                </button>
                <button
                  onClick={() => {
                    setDocType('09');
                    updateDefaultSeries('09');
                    setActiveTab('emitir');
                  }}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" /> Emitir Guía de Remisión
                </button>
              </div>
            </div>

            {/* Tarjetas KPI para Guías */}
            {(() => {
              const guias = documents.filter(d => d.document_type === '09');
              const guiasAceptadas = guias.filter(d => d.status.includes('ACCEPTED')).length;
              const guiasPendientes = guias.filter(d => d.status === 'QUEUED' || d.status === 'SENDING').length;
              const guiasRechazadas = guias.filter(d => d.status === 'REJECTED' || d.status === 'FAILED_RETRY').length;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider">Total Guías</span>
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Truck className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 font-mono">
                      {guias.length}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Guías Remitente tipo <span className="font-bold text-indigo-600">09</span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider">Aceptadas SUNAT</span>
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-emerald-600 font-mono">
                      {guiasAceptadas}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Con CDR de Aprobación Oficial
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider">En Cola / Transmisión</span>
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-amber-600 font-mono">
                      {guiasPendientes}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Endpoint <span className="font-bold text-amber-600">e-guiaremision</span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider">Observadas / Rechazadas</span>
                      <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-rose-600 font-mono">
                      {guiasRechazadas}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Con diagnóstico de corrección
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Tabla de Guías de Remisión */}
            <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/80 font-bold">
                      <th className="py-3 px-4">Guía Remisión</th>
                      <th className="py-3 px-4">Destinatario (Receptor)</th>
                      <th className="py-3 px-4">Fecha Emisión</th>
                      <th className="py-3 px-4 text-center">Estado SUNAT</th>
                      <th className="py-3 px-4 text-right">Acciones Oficiales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documents
                      .filter(d => d.document_type === '09')
                      .map(doc => (
                        <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-indigo-600">{doc.full_number}</div>
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-semibold border border-indigo-200">
                              GRE Remitente
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{doc.client_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{doc.client_doc_number}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {doc.issue_date} {doc.issue_time}
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
                                title="Ver / Imprimir Representación Oficial de Guía"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              <a
                                href={`${API_BASE}/documents/${doc.id}/xml`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition"
                                title="Descargar XML DespatchAdvice UBL 2.1 Firmado"
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
                                  title="Consultar CDR Oficial en SUNAT"
                                >
                                  <Search className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {doc.status !== 'ACCEPTED' && doc.status !== 'ANULADO' && (
                                <button
                                  onClick={() => handleRetry(doc.id)}
                                  className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition cursor-pointer"
                                  title="Reintentar Envío a SUNAT Guías"
                                >
                                  <RotateCw className="w-3.5 h-3.5" />
                                </button>
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
                    {documents.filter(d => d.document_type === '09').length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p>No hay Guías de Remisión emitidas todavía.</p>
                          <button
                            onClick={() => {
                              setDocType('09');
                              updateDefaultSeries('09');
                              setActiveTab('emitir');
                            }}
                            className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                          >
                            + Emitir la primera Guía de Remisión ahora
                          </button>
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
                        setSeriesConfigCompany(comp);
                        setShowSeriesModal(true);
                      }}
                      className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs px-3 py-1.5 rounded-xl font-bold transition cursor-pointer"
                      title="Configurar series fiscales y correlativos iniciales para evitar duplicados en SUNAT"
                    >
                      <Hash className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Series & Correlativos</span>
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
                  {Number(queueStats.counts?.find((c: any) => c.status === 'PENDING')?.count ?? queueStats.counts?.find((c: any) => c.status === 'PENDING')?._count?.id ?? queueStats.queuedDocsCount ?? 0)}
                </div>
                <p className="text-[11px] text-slate-500">Comprobantes listos para entrega inmediata a SUNAT</p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-xs">
                <span className="text-xs text-slate-500 font-bold uppercase">Reintentos por Caída SUNAT</span>
                <div className="text-3xl font-black text-rose-600 font-mono">
                  {Number(queueStats.counts?.find((c: any) => c.status === 'FAILED_RETRY')?.count ?? queueStats.counts?.find((c: any) => c.status === 'FAILED_RETRY')?._count?.id ?? 0)}
                </div>
                <p className="text-[11px] text-slate-500">Retroceso exponencial (15s, 1m, 5m, 15m, 1h)</p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-xs">
                <span className="text-xs text-slate-500 font-bold uppercase">Entregados con Éxito</span>
                <div className="text-3xl font-black text-emerald-600 font-mono">
                  {Number(queueStats.counts?.find((c: any) => c.status === 'COMPLETED')?.count ?? queueStats.counts?.find((c: any) => c.status === 'COMPLETED')?._count?.id ?? 0)}
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
                    {queueStats.queuedDocs?.map((qDoc: any) => (
                      <tr key={`queued-doc-${qDoc.id}`} className="bg-amber-50/30">
                        <td className="py-2.5 px-3 text-slate-500">{qDoc.id.substring(0, 8)}... (DOC)</td>
                        <td className="py-2.5 px-3 text-indigo-600 font-bold">{qDoc.full_number}</td>
                        <td className="py-2.5 px-3 text-slate-700">1 / 5</td>
                        <td className="py-2.5 px-3 text-slate-500">Inmediato</td>
                        <td className="py-2.5 px-3 text-amber-700 font-sans truncate max-w-[200px]">{qDoc.sunat_description || 'Encolado para despacho'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            PENDING (DOC)
                          </span>
                        </td>
                      </tr>
                    ))}
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
                    {(!queueStats.recentJobs || queueStats.recentJobs.length === 0) && (!queueStats.queuedDocs || queueStats.queuedDocs.length === 0) && (
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

      {/* MODAL 1.5: CONFIGURACIÓN E INICIALIZACIÓN DE SERIES Y CORRELATIVOS SUNAT */}
      <SeriesModal
        isOpen={showSeriesModal}
        onClose={() => {
          setShowSeriesModal(false);
          setSeriesConfigCompany(null);
        }}
        company={seriesConfigCompany || currentCompany}
        apiBase={API_BASE}
        onSaved={async () => {
          await fetchDocuments();
          await fetchCompanies();
          await fetchCompanySeries();
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

      {/* MODAL OFICIAL DE ANULACIÓN SUNAT (NOTA DE CRÉDITO TIPO 01 - CERO BAJAS) */}
      {fiscalAnnulModal.isOpen && fiscalAnnulModal.doc && (() => {
        const doc = fiscalAnnulModal.doc;
        const isFactura = doc.document_type === '01';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="p-5 flex items-start gap-4 border-b border-rose-100 bg-rose-50/40">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-rose-100 ring-4 ring-rose-50 text-rose-600">
                  <Ban className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border border-rose-200 bg-rose-50 text-rose-700 mb-1">
                    ANULACIÓN TRIBUTARIA SUNAT &bull; UBL 2.1
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    Anular {doc.full_number}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Cliente: <strong>{doc.client_name}</strong> &bull; Total: <strong>S/ {Number(doc.total_amount).toFixed(2)}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFiscalAnnulModal(prev => ({ ...prev, isOpen: false, doc: null }))}
                  disabled={fiscalAnnulModal.loading}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl text-xs space-y-1.5">
                  <span className="font-black text-blue-900 block">Normativa SUNAT Vigente:</span>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    El comprobante se anulará formalmente emitiendo una <strong>Nota de Crédito Electrónica ({isFactura ? 'FC01' : 'BC01'})</strong> bajo el Catálogo 09 Motivo 01 (Anulación de la operación).
                  </p>
                </div>

                {/* Motivo de Anulación */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Sustento del Motivo ante SUNAT:
                  </label>
                  <input
                    type="text"
                    value={fiscalAnnulModal.motivo}
                    onChange={(e) => setFiscalAnnulModal(prev => ({ ...prev, motivo: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setFiscalAnnulModal(prev => ({ ...prev, isOpen: false, doc: null }))}
                  disabled={fiscalAnnulModal.loading}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmFiscalAnnulment}
                  disabled={fiscalAnnulModal.loading}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 rounded-xl transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {fiscalAnnulModal.loading ? 'Emitiendo Nota en SUNAT...' : 'Emitir Nota de Crédito Oficial'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL INTELIGENTE: EDICIÓN CON DIFF ENGINE (SUNAT UBL 2.1) */}
      {smartEditModal.isOpen && smartEditModal.doc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 flex items-start gap-4 border-b border-indigo-100 bg-indigo-50/40">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                <Wand2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border border-indigo-200 bg-indigo-50 text-indigo-700 mb-1">
                  DIFF ENGINE INTELIGENTE &bull; SUNAT UBL 2.1
                </span>
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  Edición Inteligente de {smartEditModal.doc.full_number}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  El motor detectará si corresponde Caso A (Anulación + Reemisión), Caso B (NC Descuento/Devolución), Caso C (ND Aumento) o Caso D (Descripción).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSmartEditModal(prev => ({ ...prev, isOpen: false, doc: null }))}
                disabled={smartEditModal.loading}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo Doc.</label>
                  <select
                    value={smartEditModal.clientDocType}
                    onChange={(e) => setSmartEditModal(prev => ({ ...prev, clientDocType: e.target.value }))}
                    className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg p-2"
                  >
                    <option value="1">1 - DNI</option>
                    <option value="6">6 - RUC</option>
                    <option value="4">4 - CARNET EXT.</option>
                    <option value="7">7 - PASAPORTE</option>
                    <option value="0">0 - SIN DOC.</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">N° Documento</label>
                  <input
                    type="text"
                    value={smartEditModal.clientDocNumber}
                    onChange={(e) => setSmartEditModal(prev => ({ ...prev, clientDocNumber: e.target.value }))}
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha Emisión</label>
                  <input
                    type="date"
                    value={smartEditModal.issueDate}
                    onChange={(e) => setSmartEditModal(prev => ({ ...prev, issueDate: e.target.value }))}
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg p-2"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Razón Social / Nombre</label>
                  <input
                    type="text"
                    value={smartEditModal.clientName}
                    onChange={(e) => setSmartEditModal(prev => ({ ...prev, clientName: e.target.value }))}
                    className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg p-2"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-700 uppercase">Detalle de Ítems</h4>
                  <button
                    type="button"
                    onClick={() => setSmartEditModal(prev => ({
                      ...prev,
                      items: [...prev.items, { name: '', quantity: 1, price: 0 }]
                    }))}
                    className="px-2.5 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-[10px] text-slate-500 font-bold uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Descripción</th>
                        <th className="py-2 px-3 w-20 text-center">Cant.</th>
                        <th className="py-2 px-3 w-24 text-right">Precio</th>
                        <th className="py-2 px-3 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {smartEditModal.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-1.5 px-3">
                            <input
                              type="text"
                              value={it.name}
                              onChange={(e) => {
                                const next = [...smartEditModal.items];
                                next[idx].name = e.target.value;
                                setSmartEditModal(prev => ({ ...prev, items: next }));
                              }}
                              className="w-full text-xs bg-transparent border-b border-transparent focus:border-indigo-500 outline-none"
                            />
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="number"
                              step="0.01"
                              value={it.quantity}
                              onChange={(e) => {
                                const next = [...smartEditModal.items];
                                next[idx].quantity = parseFloat(e.target.value) || 0;
                                setSmartEditModal(prev => ({ ...prev, items: next }));
                              }}
                              className="w-full text-xs text-center font-bold bg-white border border-slate-200 rounded py-0.5"
                            />
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="number"
                              step="0.01"
                              value={it.price}
                              onChange={(e) => {
                                const next = [...smartEditModal.items];
                                next[idx].price = parseFloat(e.target.value) || 0;
                                setSmartEditModal(prev => ({ ...prev, items: next }));
                              }}
                              className="w-full text-xs text-right font-bold bg-white border border-slate-200 rounded py-0.5"
                            />
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (smartEditModal.items.length <= 1) return;
                                setSmartEditModal(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
                              }}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSmartEditModal(prev => ({ ...prev, isOpen: false, doc: null }))}
                disabled={smartEditModal.loading}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSmartEdit}
                disabled={smartEditModal.loading}
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 rounded-xl transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {smartEditModal.loading ? 'Procesando Diff Engine...' : 'Ejecutar Edición Inteligente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AVANZADO: EMISIÓN MANUAL DE NOTA (CATÁLOGO 09 Y 10 SUNAT) */}
      {manualNoteModal.isOpen && manualNoteModal.doc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 flex items-start gap-4 border-b border-purple-100 bg-purple-50/40">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-purple-600 text-white shadow-md shadow-purple-600/20">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border border-purple-200 bg-purple-50 text-purple-700 mb-1">
                  EMISIÓN MANUAL DE NOTA &bull; MODO CONTADOR
                </span>
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  Nota para {manualNoteModal.doc.full_number}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Comprobante base: {manualNoteModal.doc.full_number} &bull; Total: S/ {Number(manualNoteModal.doc.total_amount).toFixed(2)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualNoteModal(prev => ({ ...prev, isOpen: false, doc: null }))}
                disabled={manualNoteModal.loading}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setManualNoteModal(prev => ({ ...prev, noteType: '07', reasonCode: '01' }))}
                  className={`py-2 text-xs font-black rounded-lg transition ${
                    manualNoteModal.noteType === '07' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Nota de Crédito (Tipo 07)
                </button>
                <button
                  type="button"
                  onClick={() => setManualNoteModal(prev => ({ ...prev, noteType: '08', reasonCode: '02' }))}
                  className={`py-2 text-xs font-black rounded-lg transition ${
                    manualNoteModal.noteType === '08' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Nota de Débito (Tipo 08)
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Motivo Oficial ({manualNoteModal.noteType === '07' ? 'Catálogo 09 SUNAT' : 'Catálogo 10 SUNAT'}):
                </label>
                <select
                  value={manualNoteModal.reasonCode}
                  onChange={(e) => setManualNoteModal(prev => ({ ...prev, reasonCode: e.target.value }))}
                  className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {(manualNoteModal.noteType === '07' ? SUNAT_CAT_09 : SUNAT_CAT_10).map(r => (
                    <option key={r.code} value={r.code}>
                      {r.code} - {r.desc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Sustento Detallado (XML SUNAT):
                </label>
                <input
                  type="text"
                  value={manualNoteModal.reasonText}
                  onChange={(e) => setManualNoteModal(prev => ({ ...prev, reasonText: e.target.value }))}
                  placeholder="Sustento tributario del motivo..."
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Importe Nota (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualNoteModal.amount}
                    onChange={(e) => setManualNoteModal(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha Emisión</label>
                  <input
                    type="date"
                    value={manualNoteModal.issueDate}
                    onChange={(e) => setManualNoteModal(prev => ({ ...prev, issueDate: e.target.value }))}
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg p-2"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setManualNoteModal(prev => ({ ...prev, isOpen: false, doc: null }))}
                disabled={manualNoteModal.loading}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmManualNote}
                disabled={manualNoteModal.loading}
                className="px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-600/20 rounded-xl transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {manualNoteModal.loading ? 'Emitiendo en SUNAT...' : 'Emitir Nota Oficial'}
              </button>
            </div>
          </div>
        </div>
      )}

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
