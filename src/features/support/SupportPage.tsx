import React, { useState } from 'react';
import { Headphones, Search, MessageSquare, AlertTriangle, CheckCircle2, Phone, Mail, Clock } from 'lucide-react';

export const SupportPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const tickets = [
    {
      id: 'TCK-001',
      sender: 'Budi Santoso (Penumpang)',
      order_id: 'KAW-20250420-001',
      subject: 'Barang tertinggal di helm mitra pengemudi',
      priority: 'high',
      status: 'open',
      created_at: '15 menit lalu',
      phone: '0812-5555-1001',
    },
    {
      id: 'TCK-002',
      sender: 'Ahmad Fauzi (Mitra Driver)',
      order_id: 'KAW-20250420-003',
      subject: 'Kendala sinyal saat update titik antar Kurir',
      priority: 'medium',
      status: 'in_progress',
      created_at: '1 jam lalu',
      phone: '0812-5555-2002',
    },
    {
      id: 'TCK-003',
      sender: 'Dewi Lestari (Penumpang)',
      order_id: 'KAW-20250420-004',
      subject: 'Permintaan struk resmi perjalanan dinas kantor',
      priority: 'low',
      status: 'resolved',
      created_at: '3 jam lalu',
      phone: '0812-5555-1004',
    },
  ];

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch = 
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.order_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Headphones className="w-5 h-5 text-red-600" />
            Pusat Bantuan &amp; Layanan Pengaduan (Support 0511)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Penanganan tiket bantuan pelanggan, laporan keselamatan darurat, dan koordinasi mitra driver.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-red-50 text-red-600 font-bold px-3 py-1.5 rounded-xl border border-red-200">
            Emergency Hotline: 0811-500-0511
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-100 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari subjek tiket, nama pelapor, kode trip..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-400"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Prioritas:</span>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none"
          >
            <option value="all">Semua Prioritas</option>
            <option value="high">Tinggi (High / Urgent)</option>
            <option value="medium">Sedang (Medium)</option>
            <option value="low">Rendah (Low)</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="grid grid-cols-1 gap-3">
        {filteredTickets.map((ticket) => (
          <div key={ticket.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                    {ticket.id}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{ticket.subject}</h3>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>Pelapor: <strong className="text-slate-700">{ticket.sender}</strong></span>
                  <span>•</span>
                  <span>Trip: <span className="font-mono text-slate-700">{ticket.order_id}</span></span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono text-slate-600">
                    <Phone className="w-3 h-3 text-slate-400" /> {ticket.phone}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  ticket.priority === 'high' 
                    ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                    : ticket.priority === 'medium'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  Prioritas {ticket.priority.toUpperCase()}
                </span>

                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  ticket.status === 'open' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : ticket.status === 'in_progress'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {ticket.status === 'open' ? 'Terbuka' : ticket.status === 'in_progress' ? 'Diproses' : 'Selesai'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
