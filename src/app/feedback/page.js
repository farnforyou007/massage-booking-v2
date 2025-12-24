'use client'
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';
import { FiMessageSquare, FiSave } from 'react-icons/fi';

// --- Component: โครงร่าง Loading (Skeleton) ---
const FeedbackSkeleton = () => (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4 font-sans">
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100 animate-pulse">
            {/* Header Icon */}
            <div className="w-14 h-14 bg-gray-200 rounded-full mx-auto mb-4"></div>

            {/* Title & Description */}
            <div className="space-y-3 mb-8 text-center">
                <div className="h-6 bg-gray-200 rounded-full w-1/2 mx-auto"></div>
                <div className="h-4 bg-gray-200 rounded-full w-3/4 mx-auto"></div>
                <div className="h-4 bg-gray-200 rounded-full w-2/3 mx-auto"></div>
            </div>

            {/* Form Fields */}
            <div className="space-y-5">
                <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-32 bg-gray-200 rounded-xl w-full"></div>
                </div>
                <div className="h-12 bg-gray-200 rounded-xl w-full"></div>
            </div>
        </div>
    </div>
);

function FeedbackContent() {
    const searchParams = useSearchParams();
    const code = searchParams.get('code');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDone, setIsDone] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason.trim()) return Swal.fire('แจ้งเตือน', 'กรุณาระบุเหตุผล', 'warning');

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, reason })
            });
            if (!res.ok) throw new Error('Failed');

            setIsDone(true);
            Swal.fire('ขอบคุณครับ', 'บันทึกข้อมูลเรียบร้อยแล้ว', 'success');
        } catch (err) {
            Swal.fire('ผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isDone) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4 font-sans animate-fade-in-up">
                <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full border border-emerald-100">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm">
                        <FiSave />
                    </div>
                    <h2 className="text-xl font-bold text-emerald-900 mb-2">ขอบคุณสำหรับข้อมูล</h2>
                    <p className="text-gray-500">ทางเราได้รับเหตุผลของคุณเรียบร้อยแล้วครับ</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4 font-sans">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100 animate-fade-in-up">
                <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl shadow-sm">
                        <FiMessageSquare />
                    </div>
                    <h1 className="text-xl font-bold text-gray-800">แบบสอบถาม</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        เนื่องจากท่านไม่ได้เข้ารับบริการตามนัด<br />รบกวนระบุเหตุผลเพื่อปรับปรุงการบริการครับ
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ระบุเหตุผล</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            // 🔥 ปรับสี placeholder ให้เข้มขึ้น (text-gray-500) และปรับพื้นหลังให้ดูสะอาดตา
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none bg-gray-50 placeholder:text-gray-500 text-gray-800"
                            placeholder="เช่น ติดธุระด่วน, ลืมวันนัด, ป่วย..."
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting || !code}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>กำลังบันทึก...</span>
                            </>
                        ) : 'ส่งข้อมูล'}
                    </button>
                </form>
            </div>

            {/* Animation Style */}
            <style jsx global>{`
                .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}

// ✅ ใช้ Skeleton Loading แทนคำว่า Loading... ธรรมดา
export default function FeedbackPage() {
    return <Suspense fallback={<FeedbackSkeleton />}><FeedbackContent /></Suspense>;
}