'use client'
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';
import { FiMessageSquare, FiSave } from 'react-icons/fi';

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
            <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                        <FiSave />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">ขอบคุณสำหรับข้อมูล</h2>
                    <p className="text-gray-500">ทางเราได้รับเหตุผลของคุณเรียบร้อยแล้วครับ</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4 font-sans">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
                <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                        <FiMessageSquare />
                    </div>
                    <h1 className="text-xl font-bold text-gray-800">แบบสอบถาม</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        เนื่องจากท่านไม่ได้เข้ารับบริการตามนัด<br />รบกวนระบุเหตุผลเพื่อปรับปรุงการบริการครับ
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">เหตุผลที่ไม่ได้มาตามนัด</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none bg-gray-50"
                            placeholder="เช่น ติดธุระด่วน, ลืมวันนัด, ป่วย..."
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting || !code}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {isSubmitting ? 'กำลังบันทึก...' : 'ส่งข้อมูล'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function FeedbackPage() {
    return <Suspense fallback={<div>Loading...</div>}><FeedbackContent /></Suspense>;
}