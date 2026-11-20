import { useState, useEffect } from 'react';
import {
  Hash,
  X,
  Check,
  RotateCw,
  AlertCircle,
  FileText,
  Truck,
  Sparkles,
} from 'lucide-react';

interface Company {
  id: string;
  ruc: string;
  razon_social: string;
  api_key: string;
}

interface SeriesConfigItem {
  id_key: string;
  document_type: string;
  label: string;
  description: string;
  default_series: string;
  series: string;
  current_number: number;
}

interface SeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  apiBase: string;
  onSaved?: () => void;
}

export function SeriesModal({ isOpen, onClose, company, apiBase, onSaved }: SeriesModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [seriesList, setSeriesList] = useState<SeriesConfigItem[]>([
    {
      id_key: '01',
      document_type: '01',
      label: 'Factura Electrónica (01)',
      description: 'Exclusiva para empresas y personas con RUC (crédito fiscal). La serie debe iniciar con F.',
      default_series: 'F001',
      series: 'F001',
      current_number: 0,
    },
    {
      id_key: '03',
      document_type: '03',
      label: 'Boleta de Venta (03)',
      description: 'Para personas naturales y consumidores finales. La serie debe iniciar con B.',
      default_series: 'B001',
      series: 'B001',
      current_number: 0,
    },
    {
      id_key: '07_F',
      document_type: '07',
      label: 'Nota de Crédito para Factura (07)',
      description: 'Modifica o anula Facturas Electrónicas. La serie debe iniciar con FC.',
      default_series: 'FC01',
      series: 'FC01',
      current_number: 0,
    },
    {
      id_key: '07_B',
      document_type: '07',
      label: 'Nota de Crédito para Boleta (07)',
      description: 'Modifica o anula Boletas de Venta. La serie debe iniciar con BC.',
      default_series: 'BC01',
      series: 'BC01',
      current_number: 0,
    },
    {
      id_key: '08_F',
      document_type: '08',
      label: 'Nota de Débito para Factura (08)',
      description: 'Intereses o aumentos sobre Facturas. La serie debe iniciar con FD.',
      default_series: 'FD01',
      series: 'FD01',
      current_number: 0,
    },
    {
      id_key: '08_B',
      document_type: '08',
      label: 'Nota de Débito para Boleta (08)',
      description: 'Intereses o aumentos sobre Boletas. La serie debe iniciar con BD.',
      default_series: 'BD01',
      series: 'BD01',
      current_number: 0,
    },
    {
      id_key: '09',
      document_type: '09',
      label: 'Guía de Remisión Remitente (09)',
      description: 'Para traslado físico de mercadería. La serie debe iniciar con T.',
      default_series: 'T001',
      series: 'T001',
      current_number: 0,
    },
  ]);

  useEffect(() => {
    if (isOpen && company?.api_key) {
      fetchSeries();
    }
  }, [isOpen, company]);

  const fetchSeries = async () => {
    if (!company?.api_key) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/series`, {
        headers: { 'x-api-key': company.api_key },
      });
      if (!res.ok) throw new Error('Error al consultar series registradas.');
      const data: Array<{ document_type: string; series: string; current_number: number }> = await res.json();

      setSeriesList((prev) =>
        prev.map((item) => {
          // Buscar coincidencia exacta por tipo y serie
          const found = data.find((d) => d.document_type === item.document_type && d.series.toUpperCase() === item.series.toUpperCase())
            || data.find((d) => d.document_type === item.document_type && d.series.toUpperCase().startsWith(item.default_series.slice(0, 2)));

          if (found) {
            return {
              ...item,
              series: found.series,
              current_number: Number(found.current_number) || 0,
            };
          }
          return item;
        }),
      );
    } catch (err: any) {
      console.warn('Usando configuración por defecto de series:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSeriesChange = (id_key: string, field: 'series' | 'current_number', value: any) => {
    setSeriesList((prev) =>
      prev.map((item) => {
        if (item.id_key === id_key) {
          return {
            ...item,
            [field]: field === 'series' ? String(value).toUpperCase().trim() : Math.max(0, parseInt(value, 10) || 0),
          };
        }
        return item;
      }),
    );
  };

  const handleSave = async () => {
    if (!company?.api_key) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    // Validar reglas SUNAT de series
    for (const item of seriesList) {
      const s = item.series.toUpperCase();
      if (item.document_type === '01' && !s.startsWith('F')) {
        setError(`La serie de Factura (${item.label}) debe iniciar con 'F' (ej. F001).`);
        setSaving(false);
        return;
      }
      if (item.document_type === '03' && !s.startsWith('B')) {
        setError(`La serie de Boleta (${item.label}) debe iniciar con 'B' (ej. B001).`);
        setSaving(false);
        return;
      }
      if (item.id_key === '07_F' && !s.startsWith('FC')) {
        setError(`La serie de Nota de Crédito para Factura debe iniciar con 'FC' (ej. FC01).`);
        setSaving(false);
        return;
      }
      if (item.id_key === '07_B' && !s.startsWith('BC')) {
        setError(`La serie de Nota de Crédito para Boleta debe iniciar con 'BC' (ej. BC01).`);
        setSaving(false);
        return;
      }
      if (item.id_key === '08_F' && !s.startsWith('FD')) {
        setError(`La serie de Nota de Débito para Factura debe iniciar con 'FD' (ej. FD01).`);
        setSaving(false);
        return;
      }
      if (item.id_key === '08_B' && !s.startsWith('BD')) {
        setError(`La serie de Nota de Débito para Boleta debe iniciar con 'BD' (ej. BD01).`);
        setSaving(false);
        return;
      }
      if (item.document_type === '09' && !s.startsWith('T')) {
        setError(`La serie de Guía de Remisión debe iniciar con 'T' (ej. T001).`);
        setSaving(false);
        return;
      }
    }

    try {
      const payload = {
        series: seriesList.map((item) => ({
          document_type: item.document_type,
          series: item.series.toUpperCase(),
          current_number: Number(item.current_number) || 0,
        })),
      };

      const res = await fetch(`${apiBase}/series/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': company.api_key,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al guardar series en el servidor.');
      }

      setSuccessMsg('¡Series y correlativos guardados exitosamente! La siguiente emisión utilizará la numeración configurada.');
      if (onSaved) onSaved();

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Fallo al guardar series.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !company) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Cabecera Luminosa */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
              <Hash className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight flex items-center gap-2">
                <span>Inicializar Series y Correlativos SUNAT</span>
                <span className="text-[10px] bg-white/20 font-mono px-2 py-0.5 rounded-full">
                  RUC {company.ruc}
                </span>
              </h3>
              <p className="text-xs text-indigo-100">
                {company.razon_social} — Configura desde qué número continuará emitiendo tu empresa para evitar choques o duplicidades con SUNAT.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Alerta Informativa */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-amber-950">¿Cómo funciona la inicialización de correlativos?</div>
              <p className="text-amber-800 leading-relaxed">
                Ingresa el <strong>Último Correlativo emitido en SUNAT</strong>. El facturador CCOFACT PRO comenzará a emitir de manera atómica a partir del siguiente número (ej. si colocas <code className="bg-amber-100 px-1 py-0.5 rounded font-bold font-mono">21</code>, la siguiente emisión legal será <code className="bg-amber-100 px-1 py-0.5 rounded font-bold font-mono">22</code>).
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
              <RotateCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span>Consultando series configuradas en la base de datos...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {seriesList.map((item) => {
                const nextNumber = (Number(item.current_number) || 0) + 1;
                const nextFormatted = `${item.series}-${String(nextNumber).padStart(8, '0')}`;

                return (
                  <div
                    key={item.id_key}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                          {item.document_type === '09' ? <Truck className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <span className="font-bold text-xs text-slate-900">{item.label}</span>
                      </div>
                      <span className="text-[10px] bg-slate-200/70 text-slate-700 font-mono font-bold px-2 py-0.5 rounded">
                        Tipo {item.document_type}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500">{item.description}</p>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                          Serie Fiscal
                        </label>
                        <input
                          type="text"
                          value={item.series}
                          onChange={(e) => handleSeriesChange(item.id_key, 'series', e.target.value)}
                          maxLength={4}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-xs text-slate-900 outline-none focus:border-indigo-600"
                          placeholder={item.default_series}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                          Último en SUNAT
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.current_number}
                          onChange={(e) => handleSeriesChange(item.id_key, 'current_number', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-xs text-slate-900 outline-none focus:border-indigo-600"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
                      <span className="text-slate-600 text-[11px]">Siguiente emisión atómica:</span>
                      <span className="font-mono font-bold text-indigo-700">{nextFormatted}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pie de Acciones */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? <RotateCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{saving ? 'Guardando Series...' : 'Guardar e Inicializar Correlativos'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
