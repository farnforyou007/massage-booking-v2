'use client'
import { FiSearch, FiFileText, FiCopy, FiCheckSquare, FiXCircle, FiMessageSquare } from "react-icons/fi";

// --- Helper Functions ---
function renderStatusBadge(status) {
    switch (status) {
        case "BOOKED": return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">รอใช้บริการ</span>;
        case "CHECKED_IN": return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">รับบริการแล้ว</span>;
        case "CANCELLED": return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">ยกเลิกจอง</span>;
        case 'NO_SHOW': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">ไม่มาตามนัด</span>;
        default: return <span className="text-gray-500">-</span>;
    }
}

const formatThaiDate = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split('-');
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
};

export default function BookingTable({
    bookings, filteredBookings, loading, // รับ loading มาด้วย
    viewMode, setViewMode,
    searchTerm, setSearchTerm,
    filterStatus, setFilterStatus,
    currentPage, setCurrentPage, totalRecords,
    onExport, onSort, sortConfig,
    onChangeStatus, onViewReason, onCopy
}) {

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <span className="text-gray-300 ml-1 text-[10px]">↕</span>;
        return sortConfig.direction === 'asc'
            ? <span className="text-emerald-600 ml-1 text-[10px]">▲</span>
            : <span className="text-emerald-600 ml-1 text-[10px]">▼</span>;
    };

    return (
        <div className="lg:col-span-8 flex flex-col h-[875px] bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden">
            {/* 1. View Mode Select */}
            <div className="flex bg-gray-100 p-1 rounded-xl w-fit mt-2 ml-4 -mb-2 border border-gray-200">
                {['daily', 'monthly', 'yearly', 'all'].map((mode) => (
                    <button key={mode} onClick={() => { setViewMode(mode); setCurrentPage(1); setSearchTerm(""); }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === mode ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>
                        {mode === 'daily' ? 'รายวัน' : mode === 'monthly' ? 'รายเดือน' : mode === 'yearly' ? 'รายปี' : 'ทั้งหมด'}
                    </button>
                ))}
            </div>

            {/* 2. Filter Bar */}
            <div className="p-4 border-b border-gray-100 flex gap-3 bg-gray-50/50">
                <div className="flex flex-wrap md:flex-nowrap gap-3 flex-1">
                    <div className="relative flex-1 group">
                        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                            <FiSearch className="text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
                        </div>
                        <input type="text" placeholder="ค้นหาชื่อ, เบอร์โทร หรือรหัสจอง..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 text-gray-900 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="relative w-full md:w-[130px] group">
                        <select className="w-full appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-[14px] font-bold hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500/20 text-center"
                            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="ALL">ทั้งหมด</option>
                            <option value="BOOKED">รอรับบริการ</option>
                            <option value="CHECKED_IN">รับบริการแล้ว</option>
                            <option value="CANCELLED">ยกเลิกแล้ว</option>
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={onExport} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-emerald-50 hover:text-emerald-600 transition-all shadow-sm">
                        <FiFileText className="text-emerald-500 text-sm" /> Export Excel
                    </button>
                </div>
            </div>

            {/* 3. Table Content */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 sticky top-0 text-xs font-bold text-gray-500 uppercase">
                        <tr>
                            <th className="px-4 py-3 text-center w-16">ลำดับ</th>
                            {(viewMode === 'monthly' || viewMode === 'yearly' || viewMode === 'all') && (
                                <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => onSort('date')}>
                                    <div className="flex items-center">วันที่จอง {getSortIcon('date')}</div>
                                </th>
                            )}
                            <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => onSort('slot')}>
                                <div className="flex items-center">เวลา {getSortIcon('slot')}</div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => onSort('name')}>
                                <div className="flex items-center">ชื่อ-สกุล / รหัส {getSortIcon('name')}</div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => onSort('phone')}>
                                <div className="flex items-center">เบอร์โทร {getSortIcon('phone')}</div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => onSort('status')}>
                                <div className="flex items-center justify-center gap-1">สถานะ {getSortIcon('status')}</div>
                            </th>
                            <th className="px-4 py-3 text-right">จัดการ</th>
                        </tr>
                    </thead>

                    <tbody className="text-sm divide-y divide-gray-50">
                        {/* 🔥 SKELETON LOADING (แสดงเมื่อ loading=true) 🔥 */}
                        {loading ? (
                            [...Array(10)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-4 py-4 text-center">
                                        <div className="h-4 w-6 bg-gray-200 rounded mx-auto"></div>
                                    </td>
                                    {(viewMode === 'monthly' || viewMode === 'yearly' || viewMode === 'all') && (
                                        <td className="px-4 py-4"><div className="h-4 w-20 bg-gray-200 rounded"></div></td>
                                    )}
                                    <td className="px-4 py-4"><div className="h-4 w-16 bg-gray-200 rounded"></div></td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-col gap-2">
                                            <div className="h-4 w-32 bg-gray-200 rounded"></div>
                                            <div className="h-3 w-16 bg-gray-100 rounded"></div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4"><div className="h-4 w-24 bg-gray-200 rounded"></div></td>
                                    <td className="px-4 py-4 flex justify-center"><div className="h-6 w-20 bg-gray-200 rounded-full"></div></td>
                                    <td className="px-4 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                                            <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : filteredBookings.length > 0 ? (
                            // 🔥 DATA REAL 🔥
                            filteredBookings.map((b, i) => {
                                const rowNumber = ((currentPage - 1) * 50) + (i + 1);
                                return (
                                    <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                                        <td className="px-4 py-3 text-center font-mono text-gray-400 text-xs">{rowNumber}</td>
                                        {(viewMode === 'monthly' || viewMode === 'yearly' || viewMode === 'all') && (
                                            <td className="px-4 py-3 font-medium text-gray-600">{formatThaiDate(b.date)}</td>
                                        )}
                                        <td className="px-4 py-3 font-medium text-emerald-700">{b.slot}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5 group/name">
                                                <span className="font-bold text-gray-800">{b.name}</span>
                                                <button onClick={() => onCopy(b.name, "ชื่อ")} className="text-gray-300 hover:text-emerald-600 transition-colors"><FiCopy size={13} /></button>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5 group/code">
                                                <span className="text-[10px] text-gray-400 font-mono">#{b.code}</span>
                                                <button onClick={() => onCopy(b.code, "รหัสจอง")} className="text-gray-300 hover:text-emerald-500 transition-colors"><FiCopy size={10} /></button>
                                            </div>
                                            <div className="text-[9px] text-emerald-500 mt-1 italic">{b.created_at ? `จองเมื่อ: ${new Date(b.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}` : ''}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5 group/phone">
                                                <span className="font-mono text-gray-600 text-xs">{b.phone}</span>
                                                <button onClick={() => onCopy(b.phone, "เบอร์โทร")} className="text-gray-300 hover:text-blue-500 transition-colors"><FiCopy size={12} /></button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col items-center justify-center gap-1">
                                                {renderStatusBadge(b.status)}
                                                {b.status === 'CHECKED_IN' && b.checked_in_at && (
                                                    <span className="text-[10px] text-gray-400 font-mono">
                                                        ถึง: {new Date(b.checked_in_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {b.status === "BOOKED" &&
                                                <div className="flex justify-end gap-2">
                                                    <button title="ยืนยันผู้มาใช้บริการ" onClick={() => onChangeStatus(b, "CHECKED_IN")}
                                                        className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"><FiCheckSquare /></button>
                                                    <button title="ยกเลิกการจอง" onClick={() => onChangeStatus(b, "CANCELLED")}
                                                        className="p-1.5 bg-rose-100 text-rose-700 rounded hover:bg-rose-200"><FiXCircle /></button>
                                                </div>}
                                            {b.status === 'NO_SHOW' && (
                                                <button onClick={() => onViewReason(b)} className="p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200" title="ดูสาเหตุที่ไม่มา">
                                                    <div className="flex items-center gap-1"><FiMessageSquare /></div>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr className="h-full">
                                <td colSpan="7" className="p-0 align-middle">
                                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3 min-h-[445px]">
                                        <div className="p-4 bg-gray-50 rounded-full"><FiSearch size={48} className="opacity-20" /></div>
                                        <div className="text-center"><p className="text-base font-semibold text-gray-500">ไม่พบข้อมูลที่ค้นหา</p><p className="text-xs opacity-60">ตรวจสอบคำสะกด หรือเปลี่ยนตัวกรองสถานะใหม่</p></div>
                                        <button onClick={() => { setSearchTerm(""); setFilterStatus("ALL"); }} className="mt-2 text-xs text-emerald-600 hover:underline font-medium">ล้างตัวกรองทั้งหมด</button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* 4. Pagination */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between mt-auto">
                <div className="text-[10px] text-gray-500 font-medium">แสดงหน้า {currentPage} (ทั้งหมด {totalRecords} รายการ)</div>
                <div className="flex gap-2">
                    <button disabled={currentPage * 50 >= totalRecords || loading} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-[11px] font-bold disabled:opacity-50 hover:bg-gray-50 transition-colors">ก่อนหน้า</button>
                    <button disabled={bookings.length < 50 || loading} onClick={() => setCurrentPage(prev => prev + 1)} className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-[11px] font-bold disabled:opacity-50 hover:bg-gray-50 transition-colors">ถัดไป</button>
                </div>
            </div>
        </div>
    );
}