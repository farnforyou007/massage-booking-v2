'use client'
import { FiUsers, FiClock, FiCheckCircle, FiAlertCircle, FiXCircle } from "react-icons/fi";

export default function KPICards({ stats, loading }) {
    // Skeleton Loading (ตอนกำลังโหลด)
    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center h-[88px]">
                        <div className="space-y-2">
                            <div className="h-3 w-16 bg-gray-200 rounded"></div>
                            <div className="h-6 w-10 bg-gray-300 rounded"></div>
                        </div>
                        <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                    </div>
                ))}
            </div>
        );
    }

    // ส่วนแสดงผลจริง
    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                <div><p className="text-xs text-gray-500">ทั้งหมด</p><p className="text-xl font-bold text-gray-900">{stats.total}</p></div>
                <FiUsers className="text-gray-300 text-2xl" />
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                <div><p className="text-xs text-gray-500">รอใช้บริการ</p><p className="text-xl font-bold text-yellow-600">{stats.waiting}</p></div>
                <FiClock className="text-yellow-200 text-2xl" />
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                <div><p className="text-xs text-gray-500">รับบริการแล้ว</p><p className="text-xl font-bold text-emerald-600">{stats.checkedIn}</p></div>
                <FiCheckCircle className="text-emerald-200 text-2xl" />
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                <div><p className="text-xs text-gray-500">ยกเลิกการจอง</p><p className="text-xl font-bold text-rose-600">{stats.cancelled}</p></div>
                <FiAlertCircle className="text-rose-200 text-2xl" />
            </div>
            <div className="col-span-2 md:col-span-1 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                <div><p className="text-xs text-gray-500">ไม่มาตามนัด</p><p className="text-xl font-bold text-gray-500">{stats.noShow}</p></div>
                <FiXCircle className="text-gray-200 text-2xl" />
            </div>
        </div>
    );
}