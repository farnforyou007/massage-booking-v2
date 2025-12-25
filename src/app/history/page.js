// 'use client'
// import { useState, useEffect } from "react";
// import Link from "next/link";
// import liff from "@line/liff";
// import { FiCalendar, FiClock, FiCheckCircle, FiXCircle, FiGrid, FiList } from "react-icons/fi";


// // ฟังก์ชันแปลงวันที่ไทย
// const formatDateThai = (dateStr) => {
//     if (!dateStr) return "";
//     const date = new Date(dateStr);
//     return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
// };

// export default function MyHistoryPage() {
//     const [bookings, setBookings] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [activeTab, setActiveTab] = useState("upcoming");
//     const [profile, setProfile] = useState(null);

//     const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID;

//     useEffect(() => {
//         const initLiff = async () => {
//             try {
//                 if (!LIFF_ID) throw new Error("LIFF ID is missing");
//                 await liff.init({ liffId: LIFF_ID });

//                 if (liff.isLoggedIn()) {
//                     const p = await liff.getProfile();
//                     setProfile(p);
//                     fetchMyBookings(p.userId);
//                 } else {
//                     if (liff.isInClient()) {
//                         liff.login();
//                     } else {
//                         // โหมดทดสอบบนคอม (Mock)
//                         console.log("Mock Mode");
//                         setProfile({ displayName: "Test User", pictureUrl: "", userId: "MOCK_USER" });
//                         fetchMyBookings("MOCK_USER");
//                     }
//                 }
//             } catch (err) {
//                 console.error(err);
//                 // Fallback Mock Data
//                 setProfile({ displayName: "Test User", pictureUrl: "", userId: "MOCK_USER" });
//                 fetchMyBookings("MOCK_USER");
//             }
//         };
//         initLiff();
//     }, []);

//     const fetchMyBookings = async (userId) => {
//         try {
//             // ถ้าเป็น Mock User ให้ใช้ข้อมูลปลอม
//             if (userId === "MOCK_USER") {
//                 setTimeout(() => {
//                     setBookings([
//                         { id: 1, booking_date: '2025-12-25', slot_label: '09:00-10:00', status: 'BOOKED', booking_code: '0615671014-8899' },
//                         { id: 2, booking_date: '2025-11-10', slot_label: '13:00-14:00', status: 'CHECKED_IN', booking_code: '0615671014-1122' }
//                     ]);
//                     setLoading(false);
//                 }, 1000); // หน่วงเวลาให้เห็น Skeleton
//                 return;
//             }

//             const res = await fetch(`/api/my-history?userId=${userId}`).then(r => r.json());
//             if (res.ok) {
//                 setBookings(res.bookings);
//             }
//         } catch (err) {
//             console.error(err);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const upcomingList = bookings.filter(b => b.status === 'BOOKED');
//     const historyList = bookings.filter(b => b.status !== 'BOOKED');
//     const currentList = activeTab === 'upcoming' ? upcomingList : historyList;

//     return (
//         <div className="min-h-screen bg-stone-50 font-sans pb-20">
//             <style>{`@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap'); .font-sans { font-family: 'Prompt', sans-serif; }`}</style>

//             {/* Header */}
//             <div className="bg-emerald-600 text-white p-6 rounded-b-3xl shadow-lg relative overflow-hidden">
//                 <div className="relative z-10 flex items-center gap-4">
//                     {loading ? (
//                         // Skeleton Profile
//                         <div className="flex items-center gap-4 animate-pulse w-full">
//                             <div className="w-14 h-14 bg-emerald-500/50 rounded-full"></div>
//                             <div className="space-y-2 flex-1">
//                                 <div className="h-4 bg-emerald-500/50 rounded w-1/3"></div>
//                                 <div className="h-3 bg-emerald-500/50 rounded w-1/4"></div>
//                             </div>
//                         </div>
//                     ) : (
//                         <>
//                             {profile?.pictureUrl ? (
//                                 <img src={profile.pictureUrl} className="w-14 h-14 rounded-full border-2 border-white bg-white" alt="Profile" />
//                             ) : (
//                                 <div className="w-14 h-14 rounded-full border-2 border-white bg-emerald-700 flex items-center justify-center text-xl">
//                                     {profile?.displayName?.charAt(0) || "U"}
//                                 </div>
//                             )}
//                             <div>
//                                 <h1 className="text-xl font-bold">ประวัติการจอง</h1>
//                                 <p className="text-emerald-100 text-sm">{profile?.displayName}</p>
//                             </div>
//                         </>
//                     )}
//                 </div>
//                 <FiCalendar className="absolute -right-4 -bottom-4 text-emerald-500 opacity-50 w-32 h-32" />
//             </div>

//             {/* Tabs */}
//             <div className="px-4 mt-6">
//                 <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex">
//                     <button onClick={() => setActiveTab("upcoming")} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'upcoming' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'text-gray-400'}`}>
//                         กำลังมาถึง
//                     </button>
//                     <button onClick={() => setActiveTab("history")} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'text-gray-400'}`}>
//                         ย้อนหลัง
//                     </button>
//                 </div>
//             </div>

//             {/* Content List */}
//             <div className="px-4 mt-4 space-y-4">
//                 {loading ? (
//                     // Skeleton List Items (แสดง 3 อัน)
//                     [...Array(3)].map((_, i) => (
//                         <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden animate-pulse">
//                             <div className="flex justify-between items-start mb-3">
//                                 <div className="space-y-2 w-full">
//                                     <div className="h-5 bg-gray-200 rounded w-1/2"></div>
//                                     <div className="h-4 bg-gray-200 rounded w-1/3"></div>
//                                 </div>
//                                 <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
//                             </div>
//                             <hr className="border-dashed border-gray-100 my-3" />
//                             <div className="flex justify-between items-end">
//                                 <div className="h-8 w-24 bg-gray-200 rounded"></div>
//                                 <div className="h-8 w-24 bg-gray-200 rounded"></div>
//                             </div>
//                         </div>
//                     ))
//                 ) : currentList.length > 0 ? (
//                     currentList.map((booking) => (
//                         <div key={booking.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden animate-fade-in-up">
//                             <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${booking.status === 'BOOKED' ? 'bg-yellow-400' : booking.status === 'CHECKED_IN' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
//                             <div className="flex justify-between items-start mb-3">
//                                 <div>
//                                     <div className="flex items-center gap-2 text-emerald-700 font-bold text-lg">
//                                         <FiCalendar /> {formatDateThai(booking.booking_date)}
//                                     </div>
//                                     <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
//                                         <FiClock /> {booking.slot_label}
//                                     </div>
//                                 </div>
//                                 <span className={`px-3 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 ${booking.status === 'BOOKED' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : booking.status === 'CHECKED_IN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
//                                     {booking.status === 'BOOKED' ? 'รอรับบริการ' : booking.status === 'CHECKED_IN' ? <><FiCheckCircle /> สำเร็จ</> : <><FiXCircle /> ยกเลิก</>}
//                                 </span>
//                             </div>
//                             <hr className="border-dashed border-gray-100 my-3" />
//                             <div className="flex justify-between items-end">
//                                 <div className="text-xs text-gray-400">
//                                     <p>รหัสการจอง</p>
//                                     <p className="text-xs md:text-base font-mono font-bold text-gray-600 tracking-wider">#{booking.booking_code}</p>
//                                 </div>

//                                 {booking.status === 'BOOKED' && (
//                                     <Link href={`/ticket?code=${booking.booking_code}`} className="text-xs  bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-600 hover:text-white transition-colors font-medium flex items-center gap-1">
//                                         <FiList className="text-xs" /> รายละเอียด / ยกเลิก
//                                     </Link>
//                                 )}

//                                 {booking.status !== 'BOOKED' && (
//                                     <Link href={`/ticket?code=${booking.booking_code}`} className="text-xs bg-emerald-50 text-emerald-600 px-3 py-2 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors font-medium flex items-center gap-1">
//                                         <FiList /> รายละเอียด
//                                     </Link>
//                                 )}
//                             </div>
//                         </div>
//                     ))
//                 ) : (
//                     <div className="flex flex-col items-center justify-center py-20 text-gray-400">
//                         <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-2xl">
//                             <FiGrid />
//                         </div>
//                         <p>ไม่มีรายการ{activeTab === 'upcoming' ? 'ที่กำลังมาถึง' : 'ย้อนหลัง'}</p>
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }

// ver2

'use client'
import { useState, useEffect } from "react";
import Link from "next/link";
import liff from "@line/liff";
import {
    FiCalendar, FiClock, FiCheckCircle, FiXCircle,
    FiGrid, FiList, FiRefreshCw, FiUser
} from "react-icons/fi";

// ดึง LIFF ID จาก .env
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID;

// ฟังก์ชันแปลงวันที่ไทย
const formatDateThai = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function MyHistoryPage() {
    // --- State Management ---
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true); // โหลดครั้งแรก (Skeleton)
    const [isRefreshing, setIsRefreshing] = useState(false); // โหลดตอนกดรีเฟรช (Spin)
    const [activeTab, setActiveTab] = useState("upcoming"); // upcoming | history
    const [profile, setProfile] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(""); // เก็บ ID ไว้ใช้ตอนกดรีเฟรช

    // --- 1. ฟังก์ชันดึงข้อมูล (แยกออกมาเพื่อให้เรียกใช้ซ้ำได้) ---
    const fetchHistory = async (uid, isRefreshBtn = false) => {
        if (!uid) return;

        // ตั้งสถานะการโหลด (ถ้ากดปุ่มรีเฟรช ให้หมุนแค่ปุ่ม)
        if (isRefreshBtn) setIsRefreshing(true);

        try {
            // --- A. Mock Data (สำหรับเทสกรณี LIFF Error หรือ Mock User) ---
            if (uid === "MOCK_USER") {
                console.log("Mock Mode Activated");
                setTimeout(() => {
                    setBookings([
                        { id: 1, customer_name: 'อิฟฟาน ยิงจอระเละ' , booking_date: '2025-12-25', slot_label: '09:00-10:00', status: 'BOOKED', booking_code: 'MOCK-8899' },
                        { id: 2, customer_name: 'เอโดงาวะ โคนัน' , booking_date: '2025-11-10', slot_label: '13:00-14:00', status: 'CHECKED_IN', booking_code: 'MOCK-1122' },
                        { id: 3, customer_name: 'อูซึมากิ นารูโตะ' ,booking_date: '2025-10-05', slot_label: '10:00-11:30', status: 'CANCELLED', booking_code: 'MOCK-3344' }
                    ]);
                    setLoading(false);
                    setIsRefreshing(false);
                }, 800);
                return;
            }

            // --- B. Real API Call ---
            const res = await fetch(`/api/my-history?userId=${uid}`).then(r => r.json());
            if (res.ok) {
                setBookings(res.bookings);
            } else {
                console.error("API Error:", res.message);
            }

        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    // --- 2. useEffect หลัก (ทำงานครั้งเดียวตอนเข้าหน้าเว็บ) ---
    useEffect(() => {
        // 2.1 🚀 สูตรแก้โหลดช้า: เช็ค Cache ในเครื่องก่อนเลย
        const cachedUserId = localStorage.getItem("line_user_id");

        if (cachedUserId) {
            console.log("🚀 เจอ Cache User ID:", cachedUserId);
            setCurrentUserId(cachedUserId);
            fetchHistory(cachedUserId); // โหลดทันที! ไม่ต้องรอ LIFF
        }

        // 2.2 เริ่มกระบวนการ LIFF (ทำขนานกันไป เพื่ออัปเดตข้อมูลให้ชัวร์)
        const initLiff = async () => {
            try {
                if (!LIFF_ID) throw new Error("No LIFF ID provided");

                await liff.init({ liffId: LIFF_ID });

                if (liff.isLoggedIn()) {
                    const p = await liff.getProfile();
                    setProfile(p);
                    setCurrentUserId(p.userId);

                    // อัปเดต Cache ให้เป็นปัจจุบันเสมอ
                    localStorage.setItem("line_user_id", p.userId);

                    // ⚠️ เช็ค: ถ้าตอนแรกไม่มี Cache หรือ Cache ไม่ตรงกับ LIFF (เปลี่ยนไลน์) -> ให้โหลดใหม่
                    if (!cachedUserId || cachedUserId !== p.userId) {
                        console.log("🔄 โหลดข้อมูลใหม่จาก LIFF Profile");
                        fetchHistory(p.userId);
                    }
                } else {
                    if (liff.isInClient()) {
                        // ถ้าเปิดในแอป LINE แต่ยังไม่ล็อกอิน (เคสหายาก) -> บังคับล็อกอิน
                        liff.login();
                    } else {
                        // ✅ FIX: ถ้าเปิดบนคอม (Browser) และไม่ได้ล็อกอิน -> ให้ใช้ MOCK DATA เลย
                        console.log("💻 PC Browser detected: Using Mock Mode");
                        setProfile({ displayName: "Test User (PC)", pictureUrl: "", userId: "MOCK_USER" });
                        setCurrentUserId("MOCK_USER");
                        fetchHistory("MOCK_USER");
                    }
                }
            } catch (err) {
                console.error("LIFF Init Error:", err);
                // กรณี Error ให้ใช้ Mock Data แสดงผลไปก่อน
                if (!cachedUserId) {
                    setProfile({ displayName: "Test User (Mock)", pictureUrl: "", userId: "MOCK_USER" });
                    setCurrentUserId("MOCK_USER");
                    fetchHistory("MOCK_USER");
                }
            }
        };

        initLiff();
    }, []);

    // --- 3. แยกข้อมูลตาม Tab ---
    const upcomingList = bookings.filter(b => b.status === 'BOOKED');
    const historyList = bookings.filter(b => b.status !== 'BOOKED');
    const currentList = activeTab === 'upcoming' ? upcomingList : historyList;

    // --- 4. Render UI ---
    return (
        <div className="min-h-screen bg-stone-50 font-sans pb-20">
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap'); .font-sans { font-family: 'Prompt', sans-serif; }`}</style>

            {/* --- Header Section --- */}
            <div className="bg-emerald-600 text-white p-6 rounded-b-3xl shadow-lg relative overflow-hidden">
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {loading ? (
                            // Skeleton Profile
                            <div className="flex items-center gap-4 animate-pulse">
                                <div className="w-14 h-14 bg-white/20 rounded-full"></div>
                                <div className="space-y-2">
                                    <div className="h-4 bg-white/20 rounded w-24"></div>
                                    <div className="h-3 bg-white/20 rounded w-16"></div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {profile?.pictureUrl ? (
                                    <img src={profile.pictureUrl} className="w-14 h-14 rounded-full border-2 border-white bg-white object-cover" alt="Profile" />
                                ) : (
                                    <div className="w-14 h-14 rounded-full border-2 border-white bg-emerald-800 flex items-center justify-center text-xl">
                                        <FiUser />
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-xl font-bold">ประวัติการจอง</h1>
                                    <p className="text-emerald-100 text-sm opacity-90">{profile?.displayName || "Guest"}</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* ปุ่ม Refresh มุมขวาบน */}
                    <button
                        onClick={() => fetchHistory(currentUserId, true)}
                        disabled={loading || isRefreshing}
                        className="p-2 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-sm transition-all active:scale-90"
                    >
                        <FiRefreshCw className={`text-xl ${isRefreshing ? "animate-spin" : ""}`} />
                    </button>
                </div>
                {/* ลายน้ำตกแต่ง */}
                <FiCalendar className="absolute -right-4 -bottom-4 text-emerald-500 opacity-50 w-32 h-32 pointer-events-none" />
            </div>

            {/* --- Tabs Section --- */}
            <div className="px-4 mt-6">
                <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex">
                    <button
                        onClick={() => setActiveTab("upcoming")}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'upcoming' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        กำลังมาถึง {upcomingList.length > 0 && <span className="ml-1 text-xs bg-emerald-600 text-white px-1.5 py-0.5 rounded-full">{upcomingList.length}</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        ประวัติย้อนหลัง
                    </button>
                </div>
            </div>

            {/* --- Content List Section --- */}
            <div className="px-4 mt-4 space-y-4">
                {loading ? (
                    // --- Skeleton Loading (แสดงตอนเข้าครั้งแรก) ---
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
                            <div className="flex justify-between items-start mb-3">
                                <div className="space-y-2 w-full">
                                    <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                </div>
                                <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                            </div>
                            <hr className="border-dashed border-gray-100 my-3" />
                            <div className="flex justify-between items-end">
                                <div className="h-8 w-24 bg-gray-200 rounded"></div>
                                <div className="h-8 w-24 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    ))
                ) : currentList.length > 0 ? (
                    // --- รายการจริง ---
                    currentList.map((booking) => (
                        <div key={booking.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden animate-fade-in-up hover:shadow-md transition-shadow">
                            {/* แถบสีสถานะด้านซ้าย */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 
                                ${booking.status === 'BOOKED' ? 'bg-yellow-400' :
                                    booking.status === 'CHECKED_IN' ? 'bg-emerald-500' :
                                        booking.status === 'NO_SHOW' ? 'bg-gray-500' : 'bg-rose-500'}`}>

                            </div>

                            <div className="flex justify-between items-start mb-3 pl-2">
                                <div>
                                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-lg">
                                        <FiCalendar className="text-emerald-600" />
                                        {formatDateThai(booking.booking_date)}
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                                        <FiClock className="text-gray-400" />
                                        {booking.slot_label}
                                    </div>
                                </div>
                                {/* Badge สถานะ */}
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 
                                    ${booking.status === 'BOOKED' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                        booking.status === 'CHECKED_IN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            booking.status === 'NO_SHOW' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                                                'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                    {booking.status === 'BOOKED' ? 'รอรับบริการ' :
                                        booking.status === 'CHECKED_IN' ? <><FiCheckCircle /> สำเร็จ</> :
                                            booking.status === 'NO_SHOW' ? <><FiXCircle /> ไม่มาตามนัด</> :
                                                <><FiXCircle /> ยกเลิก</>}
                                </span>
                            </div>

                            {/* 🔥 แสดงชื่อผู้จอง (เพิ่มส่วนนี้) */}
                            {booking.customer_name && (
                                <div className="mb-3 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 w-fit">
                                    <FiUser className="text-gray-400" />
                                    <span>ชื่อ-สกุล : <b>{booking.customer_name}</b></span>
                                </div>
                            )}

                            <hr className="border-dashed border-gray-100 my-3 ml-2" />

                            <div className="flex justify-between items-end pl-2">
                                <div className="text-xs text-gray-400">
                                    <p>รหัสการจอง</p>
                                    <p className="text-sm md:text-base font-mono font-bold text-gray-600 tracking-wider">#{booking.booking_code}</p>
                                </div>

                                {/* ปุ่มกดดูตั๋ว (Action Button) */}
                                {booking.status === 'BOOKED' ? (
                                    <Link
                                        href={`/ticket?code=${booking.booking_code}`}
                                        // className="text-xs bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-1 shadow-sm shadow-red-200"
                                        className="text-xs bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-600 hover:text-white transition-colors font-medium flex items-center gap-1 shadow-sm shadow-red-200"
                                    >
                                        <FiList className="text-sm" /> รายละเอียด / ยกเลิก
                                    </Link>
                                ) : (
                                    <Link
                                        href={`/ticket?code=${booking.booking_code}`}
                                        // className="text-xs bg-gray-50 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors font-medium flex items-center gap-1"
                                        // className="text-xs bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center gap-1 shadow-sm shadow-emerald-200"
                                        className="text-xs  bg-emerald-50 text-emerald-600 px-3 py-2 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors font-medium flex items-center gap-1 shadow-sm shadow-emerald-200"
                                    >
                                        <FiList /> รายละเอียด
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    // --- กรณีไม่มีข้อมูล (Empty State) ---
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 opacity-70">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-3xl text-gray-300">
                            {activeTab === 'upcoming' ? <FiCalendar /> : <FiGrid />}
                        </div>
                        <p className="font-medium">ไม่มีรายการ{activeTab === 'upcoming' ? 'ที่กำลังมาถึง' : 'ย้อนหลัง'}</p>
                        <p className="text-xs mt-1">จองคิวใหม่ได้ที่หน้าแรก</p>
                    </div>
                )}
            </div>

            {/* Animation CSS */}
            <style jsx global>{`
                .animate-fade-in-up {
                    animation: fadeInUp 0.5s ease-out forwards;
                    opacity: 0;
                    transform: translateY(10px);
                }
                @keyframes fadeInUp {
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}