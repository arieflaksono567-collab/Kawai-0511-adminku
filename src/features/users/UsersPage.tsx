import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  Calendar, 
  ShieldAlert, 
  CheckCircle2, 
  Ban, 
  RefreshCw, 
  ShoppingBag, 
  CreditCard, 
  AlertTriangle 
} from 'lucide-react';
import { AppUser } from '../../types/database';

interface UsersPageProps {
  users: AppUser[];
  isSimulation: boolean;
  onUpdateUserStatus: (userId: string, newStatus: 'active' | 'suspended', reason: string) => void;
}

export const UsersPage: React.FC<UsersPageProps> = ({ 
  users, 
  isSimulation, 
  onUpdateUserStatus 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<AppUser | null>(null);

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.includes(searchTerm)) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Simulation Banner */}
      {isSimulation && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              <strong>Indikator Data Simulasi:</strong> Data pengguna saat ini bersumber dari dataset uji operasional internal Banjarmasin.
            </span>
          </div>
          <span className="text-[10px] bg-amber-200/80 text-amber-800 px-2 py-0.5 rounded font-mono font-bold">
            Demo Mode
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-red-600" />
            Manajemen Pengguna &amp; Penumpang (KAWAI 0511)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pantau akun penumpang, riwayat pesanan, status suspensi kecurangan (fraud), dan saldo dompet.
          </p>
        </div>

        <div className="text-xs bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200 font-mono">
          Total Terdaftar: <strong className="text-red-600 font-bold">{users.length}</strong>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-100 p-3.5 rounded-xl text-xs shadow-2xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama penumpang, nomor HP, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">Status Akun:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">Semua Status ({users.length})</option>
            <option value="active">Aktif Normal</option>
            <option value="suspended">Ditangguhkan (Suspended)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100 font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Nama Penumpang</th>
                <th className="py-3 px-4">Kontak (HP &amp; Email)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Total Trip</th>
                <th className="py-3 px-4">Saldo Dompet</th>
                <th className="py-3 px-4">Terdaftar</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada penumpang yang sesuai dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">{user.full_name}</p>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {user.id}</span>
                    </td>

                    <td className="py-3.5 px-4 space-y-0.5">
                      <p className="font-mono text-slate-700 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {user.phone}
                      </p>
                      {user.email && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" /> {user.email}
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        user.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {user.status === 'active' ? 'Aktif' : 'Suspended'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900">{user.total_orders}</span>
                      <span className="text-[10px] text-slate-400 ml-1">Trip</span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {formatIDR(user.wallet_balance)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(user.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedUserForDetail(user)}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] transition-colors font-medium border border-slate-200"
                        >
                          Detail
                        </button>
                        {user.status === 'active' ? (
                          <button
                            onClick={() => onUpdateUserStatus(user.id, 'suspended', 'Ditangguhkan karena laporan aktivitas mencurigakan')}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] transition-colors font-medium"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => onUpdateUserStatus(user.id, 'active', 'Pemulihan akun penumpang setelah verifikasi')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] transition-colors font-bold shadow-2xs"
                          >
                            Aktifkan
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUserForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-red-600" />
                Profil Pengguna: {selectedUserForDetail.full_name}
              </h3>
              <button 
                onClick={() => setSelectedUserForDetail(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">ID Pengguna:</span>
                <span className="font-mono text-slate-800">{selectedUserForDetail.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nomor Telepon:</span>
                <span className="font-mono text-slate-800 font-semibold">{selectedUserForDetail.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="text-slate-800">{selectedUserForDetail.email || 'Tidak dicantumkan'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status Akun:</span>
                <span className="font-bold text-slate-900 capitalize">{selectedUserForDetail.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Pesanan:</span>
                <span className="font-bold text-slate-900">{selectedUserForDetail.total_orders} Pesanan</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Saldo Dompet KAWAI:</span>
                <span className="font-bold text-emerald-600">{formatIDR(selectedUserForDetail.wallet_balance)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedUserForDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
