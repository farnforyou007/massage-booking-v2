'use client'
import { FiLayers, FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";

// ✅ เพิ่ม prop: loading
export default function SlotManager({ slots, onAddSlot, onEditSlot, onDeleteSlot, loading }) {
    
    // --- ส่วน Skeleton ---
   if (loading) {
        return (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col h-[370px] animate-pulse">
                {/* Header เลียนแบบของจริง */}
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-200 rounded"></div> {/* Icon */}
                        <div className="h-4 w-32 bg-gray-200 rounded"></div> {/* Title */}
                    </div>
                    <div className="h-7 w-16 bg-gray-200 rounded-lg"></div> {/* Button */}
                </div>
                
                {/* Slots List เลียนแบบ Card ของจริง */}
                <div className="space-y-3 flex-1 overflow-hidden">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <div className="h-4 w-24 bg-gray-200 rounded"></div> {/* Label */}
                                <div className="flex gap-1">
                                    <div className="w-5 h-5 bg-gray-200 rounded"></div>
                                    <div className="w-5 h-5 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-1.5"></div>
                            <div className="flex justify-between mt-1">
                                <div className="h-2 w-16 bg-gray-200 rounded"></div>
                                <div className="h-2 w-12 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // --- ส่วนแสดงผลจริง (เหมือนเดิม) ---
    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col h-[370px]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-600 flex items-center gap-2">
                    <FiLayers className="text-blue-600" /> จัดการช่วงเวลา / คิว ({Array.isArray(slots) ? slots.length : 0})
                </h3>
                <button onClick={onAddSlot} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-700 flex items-center gap-2 transition-colors shadow-sm">
                    <FiPlus /> เพิ่ม
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {Array.isArray(slots) && slots.length > 0 ? (
                    slots.map((s) => (
                        <div key={s.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col gap-2 group hover:border-emerald-200 transition-colors">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-sm text-gray-700">{s.label}</span>
                                <div className="flex gap-1">
                                    <button onClick={() => onEditSlot(s)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all" title="แก้ไข">
                                        <FiEdit2 size={12} />
                                    </button>
                                    <button onClick={() => onDeleteSlot(s)} className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all" title="ลบ">
                                        <FiTrash2 size={12} />
                                    </button>
                                </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${s.remaining === 0 ? 'bg-rose-500' : (s.booked / s.capacity) >= 0.6 ? 'bg-orange-500' : 'bg-emerald-500'}`} 
                                     style={{ width: `${(s.booked / s.capacity) * 100}%` }}></div>
                            </div>
                            <div className="flex justify-between text-[11px] text-gray-500">
                                <span>จอง {s.booked}/{s.capacity}</span>
                                <span>{s.remaining === 0 ? 'เต็ม' : 'ว่าง ' + s.remaining}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-gray-400 text-xs mt-10">
                        <p>ไม่พบข้อมูลรอบเวลา</p>
                        <button onClick={onAddSlot} className="mt-2 text-emerald-600 underline hover:text-emerald-700">+ เพิ่มรอบแรก</button>
                    </div>
                )}
            </div>
        </div>
    );
}