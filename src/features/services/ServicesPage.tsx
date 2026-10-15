import React from 'react';
import { LayoutGrid, Bike, Car, Box, Utensils, CheckCircle2, Sliders, Shield } from 'lucide-react';

export const ServicesPage: React.FC = () => {
  const serviceCatalog = [
    {
      id: 'ride_motor',
      title: 'KAWAI Ride (Motor)',
      category: 'Transportasi Roda 2',
      description: 'Layanan transportasi ojek motor cepat untuk mobilitas perkotaan Banjarmasin & sekitarnya.',
      icon: Bike,
      iconColor: 'bg-red-500 text-white',
      baseFare: 'Rp 8.000 (3 km pertama)',
      perKm: 'Rp 2.500 / km',
      status: 'Aktif',
      activeDrivers: 24,
    },
    {
      id: 'ride_car',
      title: 'KAWAI Car (Mobil)',
      category: 'Transportasi Roda 4',
      description: 'Layanan transportasi mobil ber-AC nyaman untuk perorangan, keluarga, dan rombongan kecil.',
      icon: Car,
      iconColor: 'bg-blue-500 text-white',
      baseFare: 'Rp 16.000 (3 km pertama)',
      perKm: 'Rp 4.500 / km',
      status: 'Aktif',
      activeDrivers: 14,
    },
    {
      id: 'delivery',
      title: 'KAWAI Send (Kurir Express)',
      category: 'Logistik Cepat',
      description: 'Layanan pengiriman paket, dokumen, dan logistik instan dalam kota kode area 0511.',
      icon: Box,
      iconColor: 'bg-amber-500 text-white',
      baseFare: 'Rp 9.000 (3 km pertama)',
      perKm: 'Rp 2.500 / km',
      status: 'Aktif',
      activeDrivers: 18,
    },
    {
      id: 'food',
      title: 'KAWAI Food (Kuliner Lokal)',
      category: 'Pesan Antar Makanan',
      description: 'Pesan antar kuliner khas Banjar dan aneka merchant mitra UMKM terverifikasi.',
      icon: Utensils,
      iconColor: 'bg-emerald-500 text-white',
      baseFare: 'Rp 8.000 (3 km pertama)',
      perKm: 'Rp 2.200 / km',
      status: 'Persiapan Rilis',
      activeDrivers: 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-red-600" />
            Katalog Layanan &amp; Konfigurasi Produk (0511)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi tarif dasar, ketersediaan armada, dan jenis layanan operasional KAWAI 0511.
          </p>
        </div>

        <div className="text-xs bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200 font-mono">
          4 Layanan Terdaftar
        </div>
      </div>

      {/* Grid of Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {serviceCatalog.map((svc) => {
          const Icon = svc.icon;
          return (
            <div key={svc.id} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-xl ${svc.iconColor} flex items-center justify-center shrink-0 shadow-2xs`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{svc.title}</h3>
                    <p className="text-xs text-slate-400">{svc.category}</p>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  svc.status === 'Aktif' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${svc.status === 'Aktif' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {svc.status}
                </span>
              </div>

              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                {svc.description}
              </p>

              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-medium block">Tarif Dasar</span>
                  <span className="font-bold text-slate-800">{svc.baseFare}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-medium block">Tarif per Kilometer</span>
                  <span className="font-bold text-slate-800">{svc.perKm}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>Mitra Tersedia: <strong className="text-slate-800">{svc.activeDrivers} driver</strong></span>
                <span className="font-mono text-[10px] text-slate-400">service_types ID: {svc.id}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
