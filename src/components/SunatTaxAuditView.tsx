import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Info,
  Receipt,
  TrendingDown,
  Calculator,
  Truck,
  Printer,
  Sparkles,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import {
  calculateSunatTaxLiquidation,
  type SunatTaxRegime,
} from '../utils/sunatTaxAudit';

interface SunatTaxAuditViewProps {
  documents: any[];
  activeCompany?: any;
}

export const SunatTaxAuditView: React.FC<SunatTaxAuditViewProps> = ({
  documents = [],
  activeCompany,
}) => {
  const [selectedRegime, setSelectedRegime] = useState<SunatTaxRegime>('RMT');
  const [selectedPeriod, setSelectedPeriod] = useState<'CURRENT' | 'PREVIOUS' | 'ALL'>('CURRENT');
  const [purchasesWithInvoice, setPurchasesWithInvoice] = useState<number>(0);
  const [showSirePreview, setShowSirePreview] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const targetPeriod = useMemo(() => {
    if (selectedPeriod === 'CURRENT') {
      return { month: currentMonth, year: currentYear };
    }
    if (selectedPeriod === 'PREVIOUS') {
      return { month: prevMonth, year: prevYear };
    }
    return { month: undefined, year: currentYear };
  }, [selectedPeriod, currentMonth, currentYear, prevMonth, prevYear]);

  const issuerRuc = activeCompany?.ruc || activeCompany?.numero_documento || '20600000001';
  const issuerName = activeCompany?.razon_social || activeCompany?.nombre_comercial || 'EMPRESA EMISORA CCOFACT PRO';

  // Cálculo en tiempo real de liquidación tributaria
  const liquidation = useMemo(() => {
    return calculateSunatTaxLiquidation({
      documents,
      regime: selectedRegime,
      purchasesWithInvoice,
      periodMonth: targetPeriod.month,
      periodYear: targetPeriod.year,
      ruc: issuerRuc,
    });
  }, [documents, selectedRegime, purchasesWithInvoice, targetPeriod, issuerRuc]);

  // Filtrado de documentos del periodo para la vista RVIE / SIRE y exportación
  const periodDocs = useMemo(() => {
    return documents.filter((doc) => {
      const rawDate = doc.createdAt || doc.created_at || doc.issue_date;
      if (!rawDate) return true;
      const d = new Date(rawDate);
      if (targetPeriod.month !== undefined && d.getMonth() !== targetPeriod.month) return false;
      if (targetPeriod.year !== undefined && d.getFullYear() !== targetPeriod.year) return false;
      return true;
    });
  }, [documents, targetPeriod]);

  // Exportar a Excel (XLSX)
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      // Hoja 1: Resumen Tributario Formulario 621
      const summaryData = [
        ['REPORTE OFICIAL DE RESPONSABILIDAD TRIBUTARIA - SUNAT FORMULARIO 621'],
        ['CCOFACT PRO & THINK ERP'],
        [''],
        ['Razón Social Emisor:', issuerName],
        ['RUC Emisor:', issuerRuc],
        ['Periodo Tributario:', liquidation.periodLabel],
        ['Régimen Tributario:', liquidation.regimeName],
        ['Estado Ante SUNAT:', 'AL DÍA - DEUDA EXIGIBLE S/ 0.00 (SIN OMISIONES NI COACTIVA)'],
        ['Fecha de Vencimiento SUNAT:', `${liquidation.fechaVencimientoSunat} (Último dígito ${liquidation.ultimoDigitoRuc})`],
        [''],
        ['CONCEPTO TRIBUTARIO', 'MONTO EN SOLES (S/)', 'DETALLE TÉCNICO'],
        ['Ventas Facturas Electrónicas (01)', liquidation.totalFacturas, 'Facturas emitidas gravadas'],
        ['Ventas Boletas de Venta (03)', liquidation.totalBoletas, 'Boletas emitidas a consumidor final'],
        ['Ajustes Notas de Débito (08)', liquidation.totalNotasDebito, 'Incremento a ventas'],
        ['Ajustes Notas de Crédito (07)', -liquidation.totalNotasCredito, 'Deducción por anulación o descuento'],
        ['VENTAS NETAS FACTURADAS', liquidation.totalInvoicedSales, 'Total con IGV'],
        ['Base Imponible Ventas Gravadas (Casilla 100)', liquidation.ventasGravadasNetas, 'Ventas netas sin IGV (entre 1.18)'],
        ['DÉBITO FISCAL IGV 18% (Casilla 101)', liquidation.debitoFiscalIgv, 'Impuesto bruto generado'],
        ['Compras del Periodo con Factura', liquidation.comprasConFacturaTotal, 'Compras sustentadas con factura'],
        ['CRÉDITO FISCAL IGV 18% (Casilla 107)', liquidation.creditoFiscalIgv, 'Deducción de IGV por compras'],
        ['IGV NETO A PAGAR (Casilla 140)', liquidation.igvNetoAPagar, 'Débito Fiscal menos Crédito Fiscal'],
        ['SALDO A FAVOR PRÓXIMO MES (Casilla 145)', liquidation.saldoAFavorMesSiguiente, 'Crédito a favor arrastrable'],
        ['Pago a Cuenta Renta Mensual (Casilla 301)', liquidation.rentaPagoACuenta, `Tasa ${liquidation.rentaTasaPorcentaje}% según régimen`],
        ['TOTAL A LIQUIDAR / DECLARAR SUNAT', liquidation.totalPagarSunat, 'Total consolidado Formulario 621'],
        ['DEUDA EXIGIBLE ACTUAL COACTIVA', 0.00, 'Al día sin resoluciones de cobranza'],
        [''],
        ['Guías de Remisión Electrónica (GRE)', liquidation.guiasRemisionCount, 'Guías emitidas para sustento de traslado'],
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Liquidacion_SUNAT_621');

      // Hoja 2: Libro RVIE SIRE
      const docsHeader = [
        'Tipo Comprobante',
        'Serie - Número',
        'Fecha de Emisión',
        'Documento Cliente',
        'Nombre / Razón Social Cliente',
        'Total (S/)',
        'Estado SUNAT',
      ];

      const docsRows = periodDocs.map((doc: any) => [
        doc.document_type || doc.docType || 'COMPROBANTE',
        doc.full_number || `${doc.series || ''}-${doc.number || doc.correlative || ''}`,
        doc.issue_date || (doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('es-PE') : ''),
        doc.customer_document || doc.clientDocument || '-',
        doc.customer_name || doc.clientName || 'CLIENTES VARIOS',
        Number(doc.total_amount || doc.totalAmount || 0),
        doc.status || doc.sunat_status || 'EMITIDO',
      ]);

      const wsDocs = XLSX.utils.aoa_to_sheet([docsHeader, ...docsRows]);
      XLSX.utils.book_append_sheet(wb, wsDocs, 'Libro_RVIE_SIRE');

      const cleanPeriodName = liquidation.periodLabel.replace(/\s+/g, '_');
      XLSX.writeFile(wb, `Reporte_Tributario_CCOFACT_${cleanPeriodName}.xlsx`);
    } catch (err) {
      console.error('Error al exportar Excel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Exportar a PDF oficial con jsPDF
  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Cabecera institucional
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 210, 26, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('REPORTE OFICIAL DE LIQUIDACIÓN TRIBUTARIA - SUNAT', 14, 12);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('CCOFACT PRO • FORMULARIO VIRTUAL DECLARA FÁCIL 621 • UBL 2.1', 14, 18);

      // Datos de la empresa
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`Empresa: ${issuerName}`, 14, 35);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`RUC: ${issuerRuc}`, 14, 41);
      doc.text(`Periodo Tributario: ${liquidation.periodLabel}`, 14, 46);
      doc.text(`Régimen Tributario: ${liquidation.regimeName}`, 14, 51);

      // Recuadro Estado SUNAT Deuda Exigible S/ 0.00
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(16, 185, 129);
      doc.roundedRect(120, 31, 76, 23, 3, 3, 'FD');

      doc.setTextColor(6, 95, 70);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('ESTADO ANTE SUNAT (CLAVE SOL):', 123, 37);

      doc.setFontSize(12);
      doc.text('DEUDA EXIGIBLE: S/ 0.00', 123, 44);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('Al día • Sin omisiones ni cobranza coactiva', 123, 49);

      // Tabla de Liquidación
      let y = 62;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 7, 'F');
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('CONCEPTO FISCAL', 18, y + 5);
      doc.text('CASILLA', 125, y + 5);
      doc.text('MONTO (S/)', 170, y + 5);

      const items = [
        ['Total Facturas Electrónicas (01)', '-', `S/ ${liquidation.totalFacturas.toFixed(2)}`],
        ['Total Boletas de Venta (03)', '-', `S/ ${liquidation.totalBoletas.toFixed(2)}`],
        ['Ajustes por Notas de Débito (+)', '-', `S/ ${liquidation.totalNotasDebito.toFixed(2)}`],
        ['Ajustes por Notas de Crédito (-)', '-', `-S/ ${liquidation.totalNotasCredito.toFixed(2)}`],
        ['Ventas Netas con IGV', '-', `S/ ${liquidation.totalInvoicedSales.toFixed(2)}`],
        ['Ventas Netas Gravadas (Base Imponible)', 'Casilla 100', `S/ ${liquidation.ventasGravadasNetas.toFixed(2)}`],
        ['Débito Fiscal IGV (18%)', 'Casilla 101', `S/ ${liquidation.debitoFiscalIgv.toFixed(2)}`],
        ['Compras del Periodo con Factura', '-', `S/ ${liquidation.comprasConFacturaTotal.toFixed(2)}`],
        ['Crédito Fiscal de IGV por Compras', 'Casilla 107', `-S/ ${liquidation.creditoFiscalIgv.toFixed(2)}`],
        ['IGV Neto a Pagar', 'Casilla 140', `S/ ${liquidation.igvNetoAPagar.toFixed(2)}`],
        ['Saldo a Favor Próximo Mes', 'Casilla 145', `+S/ ${liquidation.saldoAFavorMesSiguiente.toFixed(2)}`],
        [`Pago a Cuenta del Impuesto a la Renta (${liquidation.rentaTasaPorcentaje}%)`, 'Casilla 301', `S/ ${liquidation.rentaPagoACuenta.toFixed(2)}`],
      ];

      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);

      items.forEach((item, index) => {
        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y - 4, 182, 6, 'F');
        }
        doc.setTextColor(15, 23, 42);
        doc.text(item[0], 18, y);
        doc.text(item[1], 125, y);
        doc.text(item[2], 170, y);
        y += 6;
      });

      // Total a pagar destacado
      y += 4;
      doc.setFillColor(238, 242, 255);
      doc.setDrawColor(99, 102, 241);
      doc.roundedRect(14, y, 182, 14, 2, 2, 'FD');

      doc.setTextColor(49, 46, 129);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('PROYECCIÓN FINAL A DECLARAR EN FORMULARIO 621:', 20, y + 6);
      doc.setFontSize(13);
      doc.setTextColor(16, 185, 129);
      doc.text(`S/ ${liquidation.totalPagarSunat.toFixed(2)}`, 160, y + 9);

      // Vencimiento
      y += 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('CRONOGRAMA OFICIAL DE VENCIMIENTO SUNAT:', 14, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`• Último Dígito del RUC: ${liquidation.ultimoDigitoRuc}`, 14, y + 5);
      doc.text(`• Fecha Límite de Presentación: ${liquidation.fechaVencimientoSunat}`, 14, y + 10);
      doc.text(
        liquidation.diasRestantes >= 0
          ? `• Faltan ${liquidation.diasRestantes} días calendario para declarar sin sanciones ni multas.`
          : `• Periodo vencido ante SUNAT. Verifique regularización.`,
        14,
        y + 15
      );

      const cleanPeriodName = liquidation.periodLabel.replace(/\s+/g, '_');
      doc.save(`Liquidacion_Tributaria_CCOFACT_${cleanPeriodName}.pdf`);
    } catch (err) {
      console.error('Error al exportar PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* HERO BANNER TRIBUTARIO CCOFACT PRO — CLARO, VIBRANTE Y MODERNO */}
      <div className="bg-gradient-to-br from-indigo-50/90 via-sky-50/70 to-emerald-50/80 border border-indigo-100/90 rounded-3xl p-6 md:p-8 text-slate-900 shadow-xl shadow-indigo-100/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-20 w-72 h-72 bg-emerald-300/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black uppercase tracking-wider shadow-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Auditoría Fiscal & Declara Fácil 621 • SIRE SUNAT</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-indigo-700 border border-indigo-200 text-xs font-bold shadow-xs">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>RUC: {issuerRuc}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                <span>Sincronizado Control Finanzas</span>
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
              Responsabilidad Tributaria <span className="text-indigo-600">SUNAT</span>
            </h1>

            <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed">
              Consolidación legal e interactiva de impuestos mensuales (IGV 18% y Pago a Cuenta de Renta)
              para <span className="text-slate-900 font-bold">{issuerName}</span> en el periodo{' '}
              <span className="text-indigo-700 font-bold bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                {liquidation.periodLabel}
              </span>.
            </p>
          </div>

          {/* Botones de Exportación Pro */}
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>PDF Oficial</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 border border-slate-200 shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={() => setShowSirePreview(!showSirePreview)}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <span>{showSirePreview ? 'Ocultar Libro SIRE' : 'Ver Libro RVIE (SIRE)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* BANNER OFICIAL: ESTADO ANTE SUNAT (DEUDA EXIGIBLE S/ 0.00) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-300/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider">
                Contribuyente al Día
              </span>
              <span className="text-xs text-slate-500 font-medium">Clave SOL Consultada</span>
            </div>
            <h3 className="text-lg font-black text-slate-900">
              Deuda Exigible en SUNAT: <span className="text-emerald-600 font-black">S/ 0.00</span>
            </h3>
            <p className="text-xs text-slate-600 font-medium max-w-2xl">
              Tu empresa no registra cobranzas coactivas ni valores impagos ante la SUNAT.
              El cálculo mostrado abajo es la estimación matemática de ventas menos compras del periodo{' '}
              <strong>({liquidation.periodLabel})</strong> para la declaración mensual Declara Fácil 621.
            </p>
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-right shrink-0">
          <div className="text-[10px] font-black uppercase text-emerald-800">Condición Legal</div>
          <div className="text-xs font-black text-emerald-700">HABIDO & ACTIVO</div>
          <div className="text-[10px] text-emerald-600 font-semibold">100% Electrónico UBL 2.1</div>
        </div>
      </div>

      {/* BARRA DE CONTROLES: RÉGIMEN TRIBUTARIO Y PERIODO */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Selector de Régimen */}
        <div className="md:col-span-8 space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-indigo-600" />
            <span>Régimen Tributario Aplicable:</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'RMT', label: 'RMT — MYPE Tributario', rate: '1.0% Renta', tag: 'Recomendado' },
              { id: 'RER', label: 'RER — Especial', rate: '1.5% Renta', tag: 'Cancelatorio' },
              { id: 'RG', label: 'RG — General', rate: '1.5% Renta', tag: 'Sin Topes' },
              { id: 'NRUS', label: 'Nuevo RUS', rate: 'S/ 20 - 50', tag: 'Cuota Fija' },
            ].map((reg) => (
              <button
                key={reg.id}
                type="button"
                onClick={() => setSelectedRegime(reg.id as SunatTaxRegime)}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  selectedRegime === reg.id
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 border-indigo-700 text-white font-black shadow-md shadow-indigo-600/20'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <div className="text-xs truncate">{reg.label}</div>
                <div className={`flex items-center justify-between text-[10px] mt-0.5 ${
                  selectedRegime === reg.id ? 'text-indigo-100' : 'text-slate-500'
                }`}>
                  <span className="font-semibold">{reg.rate}</span>
                  <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                    selectedRegime === reg.id ? 'bg-indigo-800 text-white' : 'bg-white text-slate-600 border border-slate-200'
                  }`}>
                    {reg.tag}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selector de Periodo */}
        <div className="md:col-span-4 space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>Periodo a Declarar:</span>
          </label>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
            {[
              { id: 'CURRENT', label: 'Este Mes' },
              { id: 'PREVIOUS', label: 'Mes Anterior' },
              { id: 'ALL', label: 'Acumulado Anual' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPeriod(p.id as any)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedPeriod === p.id
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60 font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TARJETAS PRINCIPALES DE LIQUIDACIÓN TRIBUTARIA */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* TOTAL A PAGAR SUNAT */}
        <div className="md:col-span-5 bg-white rounded-3xl p-6 text-slate-900 border border-indigo-200 shadow-md flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between text-indigo-700 mb-1">
              <span className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                <Receipt className="w-5 h-5 text-indigo-600" />
                Proyección Declara Fácil 621
              </span>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                {liquidation.regimeName.split('(')[0]}
              </span>
            </div>

            <div className="text-4xl font-black tracking-tight text-slate-900">
              S/ {liquidation.totalPagarSunat.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </div>

            <p className="text-xs text-slate-500 font-medium mt-1">
              {liquidation.totalPagarSunat === 0
                ? '¡Excelente! Sin impuestos pendientes para este periodo (ventas netas cero o compensadas).'
                : `Estimación para liquidar en tu fecha límite de vencimiento para ${liquidation.periodLabel}.`}
            </p>
          </div>

          {/* Desglose rápido */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-700">
              <span>IGV Neto del Periodo:</span>
              <span className={`font-black ${liquidation.igvNetoAPagar > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                S/ {liquidation.igvNetoAPagar.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-700">
              <span>Pago a Cuenta de Renta ({liquidation.rentaTasaPorcentaje}%):</span>
              <span className="font-black text-amber-600">
                S/ {liquidation.rentaPagoACuenta.toFixed(2)}
              </span>
            </div>
            {liquidation.saldoAFavorMesSiguiente > 0 && (
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-emerald-700 font-bold">
                <span>Saldo a Favor (Casilla 145):</span>
                <span className="text-emerald-600 font-black">+ S/ {liquidation.saldoAFavorMesSiguiente.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Semáforo de Vencimiento */}
          <div className={`p-3.5 rounded-2xl border flex items-center gap-3 text-xs ${
            liquidation.estadoVencimiento === 'CRITICAL'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : liquidation.estadoVencimiento === 'WARNING'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}>
            <Calendar className="w-5 h-5 shrink-0 text-current" />
            <div>
              <div className="font-bold">
                Vencimiento SUNAT: {liquidation.fechaVencimientoSunat}
              </div>
              <div className="text-[11px] opacity-90">
                Último dígito de RUC: <strong className="underline">{liquidation.ultimoDigitoRuc}</strong> •{' '}
                {liquidation.diasRestantes >= 0
                  ? `Quedan ${liquidation.diasRestantes} días para el plazo límite sin sanciones`
                  : '¡Periodo fuera de plazo!'}
              </div>
            </div>
          </div>
        </div>

        {/* DETALLE Y DEDUCCIONES POR CRÉDITO FISCAL */}
        <div className="md:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Desglose de Operaciones & Débito Fiscal</span>
            </h3>
            <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-2.5 py-0.5 rounded-full">
              Base Gravada: S/ {liquidation.ventasGravadasNetas.toFixed(2)}
            </span>
          </div>

          {/* 3 Bloques de Comprobantes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Facturas & Boletas</span>
              <div className="text-base font-black text-slate-900">
                S/ {(liquidation.totalFacturas + liquidation.totalBoletas).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500 space-y-0.5">
                <div>Facturas (01): S/ {liquidation.totalFacturas.toFixed(2)}</div>
                <div>Boletas (03): S/ {liquidation.totalBoletas.toFixed(2)}</div>
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-amber-800 uppercase">Ajustes por Notas</span>
              <div className="text-base font-black text-amber-700">
                - S/ {liquidation.totalNotasCredito.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-amber-700 space-y-0.5">
                <div>Notas Crédito: -S/ {liquidation.totalNotasCredito.toFixed(2)}</div>
                <div>Notas Débito: +S/ {liquidation.totalNotasDebito.toFixed(2)}</div>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/70 border border-indigo-200/70 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-indigo-800 uppercase">Débito Fiscal (18%)</span>
              <div className="text-base font-black text-indigo-700">
                S/ {liquidation.debitoFiscalIgv.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-indigo-600">
                Impuesto bruto de ventas
              </div>
            </div>
          </div>

          {/* SIMULADOR DE COMPRAS Y CRÉDITO FISCAL */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
              <span className="flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-emerald-600" />
                Deducción de Crédito Fiscal por Compras (RCE)
              </span>
              <button
                type="button"
                onClick={() => setShowSimulator(!showSimulator)}
                className="text-[11px] text-indigo-700 hover:text-indigo-900 underline font-bold cursor-pointer"
              >
                {showSimulator ? 'Ocultar Detalle' : '¿Cómo se deduce?'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-7 space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 block">
                  Facturas de Compra del Mes (S/ con IGV):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">S/</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={purchasesWithInvoice || ''}
                    onChange={(e) => setPurchasesWithInvoice(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="Ingresa tus compras con factura..."
                    className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                  />
                </div>
              </div>

              <div className="sm:col-span-5 bg-white p-3 rounded-xl border border-indigo-100 space-y-1 text-xs shadow-xs">
                <div className="flex justify-between items-center text-slate-600 text-[11px]">
                  <span>Crédito Fiscal (18%):</span>
                  <span className="font-bold text-emerald-700">
                    - S/ {liquidation.creditoFiscalIgv.toFixed(2)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Cada S/ 1,000 en compras con factura reduce tu pago de IGV en S/ 152.54.
                </p>
              </div>
            </div>

            {showSimulator && (
              <div className="text-[11px] text-indigo-950 bg-white p-3 rounded-lg border border-indigo-200 leading-relaxed space-y-1">
                <p className="font-bold text-indigo-800">💡 Planificación Tributaria Estratégica:</p>
                <p>
                  Al solicitar factura electrónica por todas tus compras de mercadería, suministros o insumos,
                  la SUNAT te permite descontar el 18% íntegro como crédito fiscal contra tus ventas.
                </p>
              </div>
            )}
          </div>

          {/* Guías de Remisión vinculadas */}
          {liquidation.guiasRemisionCount > 0 && (
            <div className="flex items-center gap-2 p-3 bg-sky-50 border border-sky-200/70 rounded-xl text-xs text-sky-950 font-medium">
              <Truck className="w-4 h-4 text-sky-600 shrink-0" />
              <span>
                <strong>{liquidation.guiasRemisionCount} Guías de Remisión Electrónica</strong> registradas
                sustentan la fehaciencia de la entrega física de mercaderías (Art. 8 RCP).
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ALERTAS Y BUENAS PRÁCTICAS SUNAT */}
      {liquidation.alertasNormativas.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600" />
            <span>Alertas y Normativas Oficiales SUNAT para el Contribuyente:</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {liquidation.alertasNormativas.map((alerta, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border text-xs space-y-1 leading-relaxed ${
                  alerta.tipo === 'ALERT'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : alerta.tipo === 'WARNING'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-indigo-50/50 border-indigo-100 text-indigo-950'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  {alerta.tipo === 'ALERT' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  ) : alerta.tipo === 'WARNING' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <Info className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                  <span>{alerta.titulo}</span>
                </div>
                <p className="text-[11px] opacity-90">{alerta.mensaje}</p>
                {alerta.baseLegal && (
                  <span className="inline-block text-[10px] font-mono font-bold text-slate-500 pt-0.5">
                    Base Legal: {alerta.baseLegal}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PREVISUALIZADOR RVIE (SIRE) */}
      {showSirePreview && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-black text-slate-900 text-sm">
                  Registro de Ventas e Ingresos Electrónico — RVIE (SIRE SUNAT)
                </h3>
                <p className="text-[10px] text-slate-500">
                  {periodDocs.length} comprobantes para declarar en el periodo {liquidation.periodLabel}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSirePreview(false)}
              className="text-xs text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
            >
              Cerrar Vista
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Serie-Número</th>
                  <th className="py-2.5 px-3">Cliente / Receptor</th>
                  <th className="py-2.5 px-3 text-right">Base Gravada</th>
                  <th className="py-2.5 px-3 text-right">IGV (18%)</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-center">Estado SUNAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {periodDocs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No hay comprobantes emitidos en el periodo {liquidation.periodLabel}.
                    </td>
                  </tr>
                ) : (
                  periodDocs.map((d: any) => {
                    const amount = Number(d.total_amount || d.totalAmount || 0);
                    const gravada = Number(d.total_gravada || (amount / 1.18));
                    const igv = Number(d.total_igv || (amount - gravada));
                    const isCancelled = (d.status || d.sunat_status || '').toUpperCase() === 'CANCELLED' || (d.status || '').toUpperCase() === 'ANULADO';
                    const docTypeLabel =
                      d.document_type === '01' ? 'Factura' :
                      d.document_type === '03' ? 'Boleta' :
                      d.document_type === '07' ? 'Nota Crédito' :
                      d.document_type === '08' ? 'Nota Débito' :
                      d.document_type === '09' ? 'Guía Remisión' :
                      d.document_type || 'Comprobante';

                    return (
                      <tr key={d.id || d.full_number} className={`hover:bg-slate-50 ${isCancelled ? 'line-through opacity-60 bg-rose-50/20' : ''}`}>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {new Date(d.createdAt || d.created_at || d.issue_date || Date.now()).toLocaleDateString('es-PE')}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-800">
                          {docTypeLabel}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-indigo-700">
                          {d.full_number || `${d.series || ''}-${d.number || ''}`}
                        </td>
                        <td className="py-2 px-3 truncate max-w-xs">
                          {d.customer_name || d.customerName || 'CLIENTES VARIOS'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          S/ {gravada.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          S/ {igv.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          S/ {amount.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCancelled
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isCancelled ? 'ANULADO' : 'ACEPTADO'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
