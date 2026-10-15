import React, { useState } from 'react';
import { MapPin, Sliders, Save, Check, RefreshCw, Zap, ShieldCheck } from 'lucide-react';
import { OperationalZone } from '../types/database';

interface ZonesViewProps {
  zones: OperationalZone[];
  onUpdateZone: (updatedZone: OperationalZone) => void;
}

export const ZonesView: React.FC<ZonesViewProps> = ({ zones, onUpdateZone }) => {
  const [editingZones, setEditingZones] = useState<OperationalZone[]>(zones);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  const handleFieldChange = (id: string, field: keyof OperationalZone, value: any) => {
    setEditingZones(prev => prev.map(z => z.id === id ? { ...z, [field]: value } : z));
  };

  const handleSave = (zone: OperationalZone) => {
    onUpdateZone(zone);
    setSavedSuccessId(zone.id);
    setTimeout(() => setSavedSuccessId(null), 2500);
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-600" />
            Tarif &amp; Zonasi Wilayah KAWAI (Kode Wilayah: 0511)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi tarif dasar, tarif per KM, dan lonjakan harga (surge multiplier) wilayah Banjarmasin Raya.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Tersinkronisasi ke PostgreSQL Supabase</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {editingZones.map((zone) => {
          const isSaved = savedSuccessId === zone.id;

          return (
            <div
              key={zone.id}
              className="bg-white border border-slate-100 hover:border-slate-200 rounded-2xl p-5.5 shadow-sm text-xs space-y-4 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-600" />
                    {zone.name}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">Kode Area: {zone.area_code} ({zone.city})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    zone.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {zone.is_active ? 'Zona Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>

              {/* Tarif Motor */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1">
                  KAWAI Motor (Roda 2)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-500 text-[10px] block mb-1 font-medium">Tarif Dasar Minimum</label>
                    <input
                      type="number"
                      value={zone.base_fare_motor}
                      onChange={(e) => handleFieldChange(zone.id, 'base_fare_motor', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 text-[10px] block mb-1 font-medium">Tarif Per KM</label>
                    <input
                      type="number"
                      value={zone.per_km_motor}
                      onChange={(e) => handleFieldChange(zone.id, 'per_km_motor', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Tarif Mobil */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1">
                  KAWAI Mobil (Roda 4)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-500 text-[10px] block mb-1 font-medium">Tarif Dasar Minimum</label>
                    <input
                      type="number"
                      value={zone.base_fare_car}
                      onChange={(e) => handleFieldChange(zone.id, 'base_fare_car', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 text-[10px] block mb-1 font-medium">Tarif Per KM</label>
                    <input
                      type="number"
                      value={zone.per_km_car}
                      onChange={(e) => handleFieldChange(zone.id, 'per_km_car', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Surge Pricing Multiplier */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-amber-600 text-[11px] flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> Lonjakan Permintaan (Surge)
                  </p>
                  <p className="text-[10px] text-slate-500">Kenaikan otomatis saat cuaca hujan/jam sibuk</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={zone.surge_multiplier}
                    onChange={(e) => handleFieldChange(zone.id, 'surge_multiplier', parseFloat(e.target.value))}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-mono text-xs font-bold focus:outline-none focus:border-red-500"
                  >
                    <option value={1.0}>1.0x (Normal)</option>
                    <option value={1.1}>1.1x (+10%)</option>
                    <option value={1.2}>1.2x (+20%)</option>
                    <option value={1.3}>1.3x (+30%)</option>
                    <option value={1.5}>1.5x (Hujan Lebat / Jam Sibuk)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  onClick={() => handleSave(zone)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                    isSaved
                      ? 'bg-emerald-600 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20'
                  }`}
                >
                  {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  {isSaved ? 'Tersimpan ke Supabase' : 'Terapkan Tarif Zona'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
