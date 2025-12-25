'use client'
import { useState } from "react";
import { FiCalendar, FiArrowLeft, FiArrowRight, FiPlus, FiLoader, FiUnlock, FiLock, FiTrash2 } from "react-icons/fi";

const formatThaiDateAdmin = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split('-');
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
};

// ✅ เพิ่ม prop: loading
export default function DateManager({
    manageDates, viewDate, setViewDate, newDate, setNewDate,
    addingDate, onAddDate, onAddWeekends, onDeleteDate, onToggleStatus,
    loading // <--- รับค่า loading
}) {
    const [isFocused, setIsFocused] = useState(false);

    // --- ส่วน Skeleton (แสดงเมื่อ loading = true) ---
    if (loading) {

        return (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 w-full animate-pulse">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                    <div className="h-7 w-28 bg-gray-200 rounded-lg"></div> {/* Month Nav */}
                </div>
                {/* Input Area */}
                <div className="flex gap-2 mb-3">
                    <div className="h-[38px] flex-1 bg-gray-100 rounded-lg border border-gray-200"></div>
                    <div className="h-[38px] w-16 bg-gray-200 rounded-lg"></div>
                </div>
                <div className="h-[38px] w-full bg-blue-50 rounded-xl mb-4 border border-blue-100"></div>
                {/* List Grid เลียนแบบจริง */}
                <div className="border border-gray-100 rounded-xl bg-gray-50/50 p-2 h-[260px]">
                    <div className="grid grid-cols-2 gap-2">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-[45px] bg-white rounded-lg border border-gray-100 shadow-sm flex items-center justify-between px-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                                    <div className="w-16 h-3 bg-gray-200 rounded"></div>
                                </div>
                                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // --- Logic เดิม ---
    const handlePrevMonth = () => { const d = new Date(viewDate); d.setMonth(d.getMonth() - 1); setViewDate(d); };
    const handleNextMonth = () => { const d = new Date(viewDate); d.setMonth(d.getMonth() + 1); setViewDate(d); };
    const handleCurrentMonth = () => { setViewDate(new Date()); };

    const currentMonthDates = manageDates.filter(item => {
        const d = new Date(item.date);
        return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
    });

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 w-full">
            {/* ... (Code ส่วนแสดงผลเดิม ใส่เหมือนเดิมเป๊ะๆ) ... */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-600 flex items-center gap-2">
                    <FiCalendar className="text-emerald-600" />
                    จัดการวันเปิดให้บริการ
                </h3>
                <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border border-gray-200">
                    <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white hover:text-emerald-600 rounded-md text-gray-400 transition-all shadow-sm hover:shadow">
                        <FiArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="px-3 min-w-[110px] text-center cursor-pointer select-none" onClick={handleCurrentMonth} title="กลับมาเดือนปัจจุบัน">
                        <span className="text-xs font-bold text-gray-700 block">
                            {viewDate.toLocaleDateString('th-TH', { month: 'long' })}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium block -mt-0.5">
                            {viewDate.toLocaleDateString('th-TH', { year: 'numeric' })}
                        </span>
                    </div>
                    <button onClick={handleNextMonth} className="p-1.5 hover:bg-white hover:text-emerald-600 rounded-md text-gray-400 transition-all shadow-sm hover:shadow">
                        <FiArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex gap-2 mb-3">
                <div className="relative flex-1 border border-gray-200 rounded-lg bg-white focus-within:ring-1 focus-within:ring-emerald-500 overflow-hidden h-[38px]">
                    <input type="date" value={newDate}
                        onChange={e => setNewDate(e.target.value)}
                        onClick={(e) => e.target.showPicker && e.target.showPicker()}
                        onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
                        style={{ colorScheme: 'light' }}
                        className={`text-gray-900 w-full h-full px-2 text-xs outline-none bg-transparent border-none relative z-10 ${!newDate ? 'text-transparent' : 'text-gray-900'}`} />
                    {(!newDate && !isFocused) &&
                        <span className="absolute left-2 top-2.5 text-xs text-gray-400 pointer-events-none z-0">--เลือกวันที่เปิดให้บริการ--</span>}
                </div>
                <button onClick={onAddDate} disabled={!newDate || addingDate}
                    className="bg-emerald-600 text-white px-3 rounded-lg text-xs hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 h-[38px] transition-colors shadow-sm font-medium whitespace-nowrap">
                    {addingDate ? <FiLoader className="animate-spin" /> : <FiPlus />} เพิ่ม
                </button>
            </div>

            <div className="mb-4">
                <button onClick={onAddWeekends} disabled={addingDate}
                    className="w-full py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-medium hover:bg-blue-100 hover:border-blue-300 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]">
                    <FiCalendar className="text-lg" />
                    <span>เพิ่มเสาร์-อาทิตย์ (ตามเดือนที่เลือก)</span>
                </button>
            </div>

            <div className="border border-gray-100 rounded-xl bg-gray-50/50 p-2">
                <div className="max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-2">
                        {currentMonthDates.length > 0 ? currentMonthDates.map((item) => (
                            <div key={item.date}
                                className={`flex items-center justify-between px-2 py-1.5 md:px-3 md:py-2 rounded-lg border transition-all h-[45px] 
                            bg-white shadow-sm ${item.status === "OPEN" ? "border-emerald-200" : "border-gray-200 opacity-75"}`}>
                                <div className="flex items-center gap-2 md:gap-3">
                                    <button onClick={() => onToggleStatus(item)} className={`p-1 md:p-1.5 rounded-full transition-colors ${item.status === "OPEN" ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200" : "bg-gray-200 text-gray-500 hover:bg-gray-300"}`}>
                                        {item.status === "OPEN" ? <FiUnlock className="w-3 h-3 md:w-3.5 md:h-3.5" /> : <FiLock className="w-3 h-3 md:w-3.5 md:h-3.5" />}
                                    </button>
                                    <span className={`text-xs md:text-sm font-medium ${item.status === "OPEN" ? "text-emerald-900" : "text-gray-500 line-through decoration-gray-400"}`}>
                                        {formatThaiDateAdmin(item.date)}
                                    </span>
                                </div>
                                <button onClick={() => onDeleteDate(item.date)} className="text-gray-400 hover:text-rose-500 p-1 rounded-md hover:bg-rose-50 transition-colors">
                                    <FiTrash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                </button>
                            </div>
                        )) : (
                            <div className="col-span-2 text-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-white flex flex-col items-center justify-center gap-2">
                                <FiCalendar className="text-gray-300 text-3xl" />
                                <p className="text-xs text-gray-400">ไม่มีรายการในเดือน <br /><span className="font-bold text-gray-500">{viewDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</span></p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}