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
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            Tarif & Zonasi Wilayah KAWAI (Kode Wilayah: 0511)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Konfigurasi tarif dasar, tarif per KM, dan lonjakan harga (surge multiplier) wilayah Banjarmasin Raya.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded-lg">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Tersinkronisasi ke PostgreSQL Supabase</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {editingZones.map((zone) => {
          const isSaved = savedSuccessId === zone.id;

          return (
            <div
              key={zone.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-sm text-xs space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    {zone.name}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">Kode Area: {zone.area_code} ({zone.city})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    zone.is_active ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {zone.is_active ? 'Zona Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>

              {/* Tarif Motor */}
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 space-y-2">
                <p className="font-bold text-emerald-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
                  KAWAI Motor (Roda 2)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">Tarif Dasar Minimum</label>
                    <input
                      type="number"
                      value={zone.base_fare_motor}
                      onChange={(e) => handleFieldChange(zone.id, 'base_fare_motor', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">Tarif Per KM</label>
                    <input
                      type="number"
                      value={zone.per_km_motor}
                      onChange={(e) => handleFieldChange(zone.id, 'per_km_motor', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Tarif Mobil */}
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 space-y-2">
                <p className="font-bold text-cyan-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
                  KAWAI Mobil (Roda 4)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">Tarif Dasar Minimum</label>
                    <input
                      type="number"
                      value={zone.base_fare_car}
                      onChange={(e) => handleFieldChange(zone.id, 'base_fare_car', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">Tarif Per KM</label>
                    <input
                      type="number"
                      value={zone.per_km_car}
                      onChange={(e) => handleFieldChange(zone.id, 'per_km_car', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Surge Pricing Multiplier */}
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-amber-400 text-[11px] flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> Lonjakan Permintaan (Surge)
                  </p>
                  <p className="text-[10px] text-slate-500">Kenaikan otomatis saat cuaca hujan/jam sibuk</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={zone.surge_multiplier}
                    onChange={(e) => handleFieldChange(zone.id, 'surge_multiplier', parseFloat(e.target.value))}
                    className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono text-xs font-bold"
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
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow ${
                    isSaved
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950'
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
