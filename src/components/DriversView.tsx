import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldAlert, 
  Star, 
  Phone, 
  FileText, 
  Plus, 
  Check, 
  Ban, 
  RefreshCw,
  Car,
  Bike,
  UserCheck
} from 'lucide-react';
import { 
  Driver, 
  DriverStatus, 
  getDriverName, 
  getDriverPlate, 
  normalizeVehicleType 
} from '../types/database';

interface DriversViewProps {
  drivers: Driver[];
  onUpdateDriverStatus: (id: string, newStatus: DriverStatus, logAction: string) => void;
  onApproveDocuments: (id: string) => void;
  onAddDriver: (newDriver: Partial<Driver>) => void;
}

export const DriversView: React.FC<DriversViewProps> = ({
  drivers,
  onUpdateDriverStatus,
  onApproveDocuments,
  onAddDriver,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modal states
  const [selectedDriverForDoc, setSelectedDriverForDoc] = useState<Driver | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newVehicleType, setNewVehicleType] = useState<'motor' | 'mobil'>('motor');
  const [newPlateNumber, setNewPlateNumber] = useState('');
  const [newVehicleBrand, setNewVehicleBrand] = useState('');
  const [newVehicleYear, setNewVehicleYear] = useState('2023');

  const filteredDrivers = drivers.filter((driver) => {
    const name = getDriverName(driver).toLowerCase();
    const plate = getDriverPlate(driver).toLowerCase();
    const matchesSearch = 
      name.includes(searchTerm.toLowerCase()) ||
      plate.includes(searchTerm.toLowerCase()) ||
      (driver.phone ? driver.phone.includes(searchTerm) : false);

    const matchesStatus = statusFilter === 'all' || driver.status === statusFilter;
    const matchesType = typeFilter === 'all' || normalizeVehicleType(driver.vehicle_type) === normalizeVehicleType(typeFilter);

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newPhone || !newPlateNumber) return;

    onAddDriver({
      full_name: newFullName,
      phone: newPhone,
      vehicle_type: newVehicleType,
      plate_number: newPlateNumber.toUpperCase(),
      vehicle_brand: newVehicleBrand || (newVehicleType === 'motor' ? 'Honda Vario' : 'Toyota Avanza'),
      vehicle_year: parseInt(newVehicleYear) || 2023,
      status: 'pending_verification',
      rating: 5.0,
      total_trips: 0,
      wallet_balance: 0,
      documents: { ktp: 'pending', sim: 'pending', stnk: 'pending', skck: 'pending' },
    });

    setIsAddModalOpen(false);
    setNewFullName('');
    setNewPhone('');
    setNewPlateNumber('');
    setNewVehicleBrand('');
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
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-red-600" />
            Manajemen Mitra Pengemudi (KAWAI 0511)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Verifikasi berkas, pantau rating operasional, status suspensi, dan saldo dompet mitra.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-red-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Daftarkan Driver Baru
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-100 p-3.5 rounded-xl shadow-2xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, nomor plat DA, nomor HP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <span className="text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-700 focus:outline-none font-medium text-xs cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif On-Duty</option>
              <option value="pending_verification">Menunggu Verifikasi</option>
              <option value="suspended">Ditangguhkan (Suspended)</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>

          {/* Vehicle Type Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <span className="text-slate-500">Armada:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-slate-700 focus:outline-none font-medium text-xs cursor-pointer"
            >
              <option value="all">Semua Armada</option>
              <option value="motor">Motor (Roda 2)</option>
              <option value="mobil">Mobil (Roda 4)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100 font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Mitra Pengemudi</th>
                <th className="py-3 px-4">Kendaraan</th>
                <th className="py-3 px-4">Status Akun</th>
                <th className="py-3 px-4">Performa</th>
                <th className="py-3 px-4">Saldo Dompet</th>
                <th className="py-3 px-4">Dokumen Resmi</th>
                <th className="py-3 px-4 text-right">Aksi Operasional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada driver yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => {
                  const isVerified = 
                    driver.documents.ktp === 'verified' &&
                    driver.documents.sim === 'verified' &&
                    driver.documents.stnk === 'verified' &&
                    driver.documents.skck === 'verified';

                  return (
                    <tr key={driver.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Driver info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            normalizeVehicleType(driver.vehicle_type) === 'motorcycle' 
                              ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          }`}>
                            {normalizeVehicleType(driver.vehicle_type) === 'motorcycle' ? <Bike className="w-4 h-4" /> : <Car className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{getDriverName(driver)}</p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {driver.phone || '-'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Vehicle info */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-800">
                          {getDriverPlate(driver)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {driver.vehicle_brand || 'Standar'} ({driver.vehicle_year || 2023})
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          driver.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          driver.status === 'pending_verification'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                          driver.status === 'suspended'
                            ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            driver.status === 'active' ? 'bg-emerald-500' :
                            driver.status === 'pending_verification' ? 'bg-amber-500' :
                            driver.status === 'suspended' ? 'bg-rose-500' : 'bg-slate-400'
                          }`} />
                          {driver.status === 'active' ? 'Aktif On-Duty' :
                           driver.status === 'pending_verification' ? 'Verifikasi Berkas' :
                           driver.status === 'suspended' ? 'Ditangguhkan' : 'Nonaktif'}
                        </span>
                      </td>

                      {/* Performance */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{driver.rating.toFixed(2)}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {driver.total_trips} Trip Berhasil
                        </div>
                      </td>

                      {/* Wallet Balance */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">
                          {formatIDR(driver.wallet_balance)}
                        </div>
                        <span className="text-[10px] text-slate-400">Dompet KAWAI</span>
                      </td>

                      {/* Documents */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setSelectedDriverForDoc(driver)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                            isVerified 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          <FileText className="w-3 h-3" />
                          <span>{isVerified ? 'Berkas Lengkap' : 'Review Berkas'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {driver.status === 'suspended' ? (
                            <button
                              onClick={() => onUpdateDriverStatus(driver.id, 'active', `Mengaktifkan kembali akun driver ${driver.full_name}`)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition-colors"
                              title="Cabut suspensi & aktifkan"
                            >
                              Aktifkan
                            </button>
                          ) : driver.status === 'active' ? (
                            <button
                              onClick={() => onUpdateDriverStatus(driver.id, 'suspended', `Menangguhkan akun driver ${driver.full_name} untuk investigasi`)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium rounded-lg text-[11px] transition-colors"
                              title="Tangguhkan akun"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => onApproveDocuments(driver.id)}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-[11px] transition-colors shadow-2xs"
                            >
                              Setujui Mitra
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Review Modal */}
      {selectedDriverForDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-red-600" />
                Audit Dokumen: {getDriverName(selectedDriverForDoc)}
              </h3>
              <button 
                onClick={() => setSelectedDriverForDoc(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {[
                { label: 'KTP (Kartu Tanda Penduduk)', key: 'ktp', status: selectedDriverForDoc.documents.ktp },
                { label: 'SIM (Surat Izin Mengemudi C/A)', key: 'sim', status: selectedDriverForDoc.documents.sim },
                { label: 'STNK (Pajak Aktif Kalimantan Selatan)', key: 'stnk', status: selectedDriverForDoc.documents.stnk },
                { label: 'SKCK / Catatan Kepolisian', key: 'skck', status: selectedDriverForDoc.documents.skck },
              ].map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="font-semibold text-slate-800">{doc.label}</p>
                    <p className="text-[10px] text-slate-500">Pemeriksaan integritas berkas digital</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    doc.status === 'verified'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {doc.status === 'verified' ? 'Terverifikasi' : 'Pending Review'}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedDriverForDoc(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  onApproveDocuments(selectedDriverForDoc.id);
                  setSelectedDriverForDoc(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm"
              >
                Verifikasi &amp; Setujui Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-red-600" />
                Pendaftaran Mitra Baru (0511)
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDriver} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Nama Lengkap Sesuai KTP</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Gusti Muhammad"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Nomor WhatsApp Aktif</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 0812-5550-XXXX"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Jenis Armada</label>
                  <select
                    value={newVehicleType}
                    onChange={(e) => setNewVehicleType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-red-500"
                  >
                    <option value="motor">Motor (Roda 2)</option>
                    <option value="mobil">Mobil (Roda 4)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Nomor Plat (DA)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: DA 2341 XY"
                    value={newPlateNumber}
                    onChange={(e) => setNewPlateNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 uppercase focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Merek &amp; Model</label>
                  <input
                    type="text"
                    placeholder="Contoh: Honda Vario 160"
                    value={newVehicleBrand}
                    onChange={(e) => setNewVehicleBrand(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Tahun Perakitan</label>
                  <input
                    type="number"
                    value={newVehicleYear}
                    onChange={(e) => setNewVehicleYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm shadow-red-500/20"
                >
                  Simpan Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
