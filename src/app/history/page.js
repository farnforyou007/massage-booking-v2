'use client'
import { useEffect, useState } from "react";
import liff from "@line/liff"; // อย่าลืม npm install @line/liff
import Swal from "sweetalert2";
import { FiCalendar, FiClock, FiMapPin, FiCheckCircle, FiXCircle, FiLoader } from "react-icons/fi";
import Link from "next/link"; // ✅ เพิ่มบรรทัดนี้
// ฟังก์ชันแปลงวันที่ไทย
const formatDateThai = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function MyHistoryPage() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("upcoming"); // upcoming | history
    const [profile, setProfile] = useState(null);

    // 1. เริ่มต้น LIFF เพื่อเอา User ID
    // src/app/history/page.js

    useEffect(() => {
        const initLiff = async () => {
            try {
                // ⚠️ ใส่ LIFF ID ของคุณตรงนี้ (ถ้ายังไม่มี ให้เว้นว่างไว้ก่อนก็ได้ถ้าจะทดสอบแบบ Hardcode)
                await liff.init({ liffId: "YOUR_LIFF_ID" });

                if (liff.isLoggedIn()) {
                    const profile = await liff.getProfile();
                    setProfile(profile);
                    fetchMyBookings(profile.userId);
                } else {
                    // ❌ ถ้าไม่ได้ Login (เช่น เปิดบนคอม) ไม่ต้องสั่ง Login ให้เด้งไปมา
                    // liff.login(); 

                    // ✅ ให้ใช้ ID จำลองแทน (สำหรับทดสอบ)
                    console.log("Testing Mode: Using Mock User ID");
                    const mockUserId = "U1234567890..."; // <--- ใส่ User ID ที่มีอยู่จริงใน Database ของคุณตรงนี้
                    fetchMyBookings(mockUserId);
                    setProfile({ displayName: "Test User", pictureUrl: "" });
                }
            } catch (err) {
                console.error("LIFF Error:", err);

                // ✅ กรณี LIFF Error (เช่น ไม่ได้ใส่ ID) ก็ให้ใช้ Mock ID เหมือนกัน
                const mockUserId = "U1234567890..."; // <--- ใส่ User ID เดียวกับข้างบน
                fetchMyBookings(mockUserId);
            }
        };
        initLiff();
    }, []);

    const fetchMyBookings = async (userId) => {
        try {
            const res = await fetch(`/api/my-history?userId=${userId}`).then(r => r.json());
            if (res.ok) {
                setBookings(res.bookings);
            }
        } catch (err) {
            Swal.fire("Error", "โหลดข้อมูลไม่สำเร็จ", "error");
        } finally {
            setLoading(false);
        }
    };

    // แยกข้อมูลตาม Tab
    const upcomingList = bookings.filter(b => b.status === 'BOOKED');
    const historyList = bookings.filter(b => b.status === 'CHECKED_IN' || b.status === 'CANCELLED');
    const currentList = activeTab === 'upcoming' ? upcomingList : historyList;

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 text-emerald-600 gap-3">
            <FiLoader className="animate-spin text-4xl" />
            <p>กำลังโหลดข้อมูลการจอง...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-stone-50 font-sans pb-10">
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap'); .font-sans { font-family: 'Prompt', sans-serif; }`}</style>

            {/* Header */}
            <div className="bg-emerald-600 text-white p-6 rounded-b-3xl shadow-lg relative overflow-hidden">
                <div className="relative z-10 flex items-center gap-4">
                    {profile?.pictureUrl && <img src={profile.pictureUrl} className="w-14 h-14 rounded-full border-2 border-white" />}
                    <div>
                        <h1 className="text-xl font-bold">ประวัติการจอง</h1>
                        <p className="text-emerald-100 text-sm">คุณ {profile?.displayName || "ลูกค้า"}</p>
                    </div>
                </div>
                {/* ลายน้ำตกแต่ง */}
                <FiCalendar className="absolute -right-4 -bottom-4 text-emerald-500 opacity-50 w-32 h-32" />
            </div>

            {/* Tabs */}
            <div className="px-4 mt-6">
                <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex">
                    <button
                        onClick={() => setActiveTab("upcoming")}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'upcoming' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'text-gray-400'}`}
                    >
                        กำลังมาถึง ({upcomingList.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'text-gray-400'}`}
                    >
                        ประวัติย้อนหลัง ({historyList.length})
                    </button>
                </div>
            </div>

            {/* รายการจอง */}
            <div className="px-4 mt-4 space-y-4">
                {currentList.length > 0 ? currentList.map((booking) => (
                    <div key={booking.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
                        {/* แถบสีด้านซ้ายตามสถานะ */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${booking.status === 'BOOKED' ? 'bg-yellow-400' :
                            booking.status === 'CHECKED_IN' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}></div>

                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="flex items-center gap-2 text-emerald-700 font-bold text-lg">
                                    <FiCalendar /> {formatDateThai(booking.booking_date)}
                                </div>
                                <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                                    <FiClock /> {booking.slot_label}
                                </div>
                            </div>
                            {/* Badge สถานะ */}
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${booking.status === 'BOOKED' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                booking.status === 'CHECKED_IN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                {booking.status === 'BOOKED' ? 'รอรับบริการ' :
                                    booking.status === 'CHECKED_IN' ? 'สำเร็จ' : 'ยกเลิก'}
                            </span>
                        </div>

                        <hr className="border-dashed border-gray-100 my-3" />

                        <div className="flex justify-between items-end">
                            <div className="text-xs text-gray-400">
                                <p>รหัสการจอง</p>
                                <p className="text-lg font-mono font-bold text-gray-600 tracking-wider">#{booking.booking_code}</p>
                            </div>
                            {booking.status === 'BOOKED' && (
                                // <button className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200">
                                //     ดูตั๋ว QR Code
                                // </button>
                                <Link
                                    href={`/ticket?code=${booking.booking_code}`} // 👉 ลิงก์ไปหน้า ticket พร้อมแนบรหัส
                                    className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors"
                                >
                                    ดูตั๋ว QR Code
                                </Link>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-2xl">
                            {activeTab === 'upcoming' ? <FiCalendar /> : <FiClock />}
                        </div>
                        <p>ไม่มีรายการ{activeTab === 'upcoming' ? 'ที่กำลังมาถึง' : 'ย้อนหลัง'}</p>
                    </div>
                )}
            </div>
        </div>
    );
}