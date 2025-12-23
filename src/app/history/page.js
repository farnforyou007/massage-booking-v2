// 'use client'
// import { useEffect, useState } from "react";
// import liff from "@line/liff"; // อย่าลืม npm install @line/liff
// import Swal from "sweetalert2";
// import { FiCalendar, FiClock, FiMapPin, FiCheckCircle, FiXCircle, FiLoader } from "react-icons/fi";
// import Link from "next/link"; // ✅ เพิ่มบรรทัดนี้
// // ฟังก์ชันแปลงวันที่ไทย
// const formatDateThai = (dateStr) => {
//     if (!dateStr) return "";
//     const date = new Date(dateStr);
//     return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
// };

// export default function MyHistoryPage() {
//     const [bookings, setBookings] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [activeTab, setActiveTab] = useState("upcoming"); // upcoming | history
//     const [profile, setProfile] = useState(null);
//     // const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID;
//     // useEffect(() => {
//     //     const initLiff = async () => {
//     //         try {
//     //             // ⚠️ ใส่ LIFF ID ของคุณตรงนี้ (ถ้ายังไม่มี ให้เว้นว่างไว้ก่อนก็ได้ถ้าจะทดสอบแบบ Hardcode)
//     //             await liff.init({ liffId: LIFF_ID });

//     //             if (liff.isLoggedIn()) {
//     //                 const profile = await liff.getProfile();
//     //                 setProfile(profile);
//     //                 fetchMyBookings(profile.userId);
//     //             } else {
//     //                 // ❌ ถ้าไม่ได้ Login (เช่น เปิดบนคอม) ไม่ต้องสั่ง Login ให้เด้งไปมา
//     //                 liff.login(); 

//     //                 // ✅ ให้ใช้ ID จำลองแทน (สำหรับทดสอบ)
//     //                 // console.log("Testing Mode: Using Mock User ID");
//     //                 // const mockUserId = "Ub6adb124adc4d092321d6681b72bcce9"; // <--- ใส่ User ID ที่มีอยู่จริงใน Database ของคุณตรงนี้
//     //                 fetchMyBookings(mockUserId);
//     //                 setProfile({ displayName: "Test User", pictureUrl: "" });
//     //             }
//     //         } catch (err) {
//     //             console.error("LIFF Error:", err);

//     //             // ✅ กรณี LIFF Error (เช่น ไม่ได้ใส่ ID) ก็ให้ใช้ Mock ID เหมือนกัน
//     //             // const mockUserId = "Ub6adb124adc4d092321d6681b72bcce9"; // <--- ใส่ User ID เดียวกับข้างบน
//     //             // fetchMyBookings(mockUserId);
//     //         }
//     //     };
//     //     initLiff();
//     // }, []);

//     const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID;

//     useEffect(() => {
//         const initLiff = async () => {
//             try {
//                 // ถ้าไม่มี LIFF ID ใน env ให้โยน error ไปเข้าโหมด Mock ทันที
//                 if (!LIFF_ID) throw new Error("LIFF ID is missing");

//                 await liff.init({ liffId: LIFF_ID });

//                 if (liff.isLoggedIn()) {
//                     const profile = await liff.getProfile();
//                     setProfile(profile);
//                     fetchMyBookings(profile.userId);
//                 } else {
//                     // ถ้าเปิดบนมือถือ (ใน LINE) ให้ Login อัตโนมัติ
//                     if (liff.isInClient()) {
//                         liff.login();
//                     } else {
//                         // ถ้าเปิดบนคอม (Browser ทั่วไป) แล้วยังไม่ Login
//                         // อาจจะเลือกให้ Login หรือเข้าโหมด Mock ก็ได้
//                         // ในที่นี้ผมแนะนำให้เข้าโหมด Mock เพื่อความง่ายในการ dev
//                         throw new Error("Running on localhost/browser without login");
//                     }
//                 }
//             } catch (err) {
//                 console.log("เข้าสู่โหมดจำลอง (Mock Mode) เพราะ:", err.message);
//                 setLoading(false);

//                 // ✅ Mock Data สำหรับทดสอบบนคอม
//                 setProfile({
//                     displayName: "Test User (Local)",
//                     pictureUrl: "https://profile.line-scdn.net/0hkE4sRPFqNGoZCieTBhFKFWlaNwA6e214ZmxyCi8Oa19zPXU0YmopBSkNOQkjaiY7MT99CCgDOAkVGUMMB1zIXh46aVslM3U9N2t_iA",
//                     userId: "Ub6adb124adc4d092321d6681b72bcce9" // ID จำลอง
//                 });

//                 // เรียกดึงข้อมูลด้วย ID จำลอง (ต้องมี ID นี้จริงใน DB หรือแก้ API ให้รองรับ)
//                 fetchMyBookings("Ub6adb124adc4d092321d6681b72bcce9");
//             }
//         };

//         initLiff();
//     }, [LIFF_ID]);

//     const fetchMyBookings = async (userId) => {
//         try {
//             const res = await fetch(`/api/my-history?userId=${userId}`).then(r => r.json());
//             if (res.ok) {
//                 setBookings(res.bookings);
//             }
//         } catch (err) {
//             Swal.fire("Error", "โหลดข้อมูลไม่สำเร็จ", "error");
//         } finally {
//             setLoading(false);
//         }
//     };

//     // แยกข้อมูลตาม Tab
//     const upcomingList = bookings.filter(b => b.status === 'BOOKED');
//     const historyList = bookings.filter(b => b.status === 'CHECKED_IN' || b.status === 'CANCELLED');
//     const currentList = activeTab === 'upcoming' ? upcomingList : historyList;

//     if (loading) return (
//         <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 text-emerald-600 gap-3">
//             <FiLoader className="animate-spin text-4xl" />
//             <p>กำลังโหลดข้อมูลการจอง...</p>
//         </div>
//     );

//     return (
//         <div className="min-h-screen bg-stone-50 font-sans pb-10">
//             <style>{`@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap'); .font-sans { font-family: 'Prompt', sans-serif; }`}</style>

//             {/* Header */}
//             <div className="bg-emerald-600 text-white p-6 rounded-b-3xl shadow-lg relative overflow-hidden">
//                 <div className="relative z-10 flex items-center gap-4">
//                     {profile?.pictureUrl && <img src={profile.pictureUrl} className="w-14 h-14 rounded-full border-2 border-white" />}
//                     <div>
//                         <h1 className="text-xl font-bold">ประวัติการจอง</h1>
//                         <p className="text-emerald-100 text-sm">คุณ {profile?.displayName || "ลูกค้า"}</p>
//                     </div>
//                 </div>
//                 {/* ลายน้ำตกแต่ง */}
//                 <FiCalendar className="absolute -right-4 -bottom-4 text-emerald-500 opacity-50 w-32 h-32" />
//             </div>

//             {/* Tabs */}
//             <div className="px-4 mt-6">
//                 <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex">
//                     <button
//                         onClick={() => setActiveTab("upcoming")}
//                         className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'upcoming' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'text-gray-400'}`}
//                     >
//                         กำลังมาถึง ({upcomingList.length})
//                     </button>
//                     <button
//                         onClick={() => setActiveTab("history")}
//                         className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'text-gray-400'}`}
//                     >
//                         ประวัติย้อนหลัง ({historyList.length})
//                     </button>
//                 </div>
//             </div>

//             {/* รายการจอง */}
//             <div className="px-4 mt-4 space-y-4">
//                 {currentList.length > 0 ? currentList.map((booking) => (
//                     <div key={booking.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
//                         {/* แถบสีด้านซ้ายตามสถานะ */}
//                         <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${booking.status === 'BOOKED' ? 'bg-yellow-400' :
//                             booking.status === 'CHECKED_IN' ? 'bg-emerald-500' : 'bg-rose-500'
//                             }`}></div>

//                         <div className="flex justify-between items-start mb-3">
//                             <div>
//                                 <div className="flex items-center gap-2 text-emerald-700 font-bold text-lg">
//                                     <FiCalendar /> {formatDateThai(booking.booking_date)}
//                                 </div>
//                                 <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
//                                     <FiClock /> {booking.slot_label}
//                                 </div>
//                             </div>
//                             {/* Badge สถานะ */}
//                             <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${booking.status === 'BOOKED' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
//                                 booking.status === 'CHECKED_IN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
//                                     'bg-rose-50 text-rose-700 border-rose-200'
//                                 }`}>
//                                 {booking.status === 'BOOKED' ? 'รอรับบริการ' :
//                                     booking.status === 'CHECKED_IN' ? 'สำเร็จ' : 'ยกเลิก'}
//                             </span>
//                         </div>

//                         <hr className="border-dashed border-gray-100 my-3" />

//                         <div className="flex justify-between items-end">
//                             <div className="text-xs text-gray-400">
//                                 <p>รหัสการจอง</p>
//                                 <p className="text-lg font-mono font-bold text-gray-600 tracking-wider">#{booking.booking_code}</p>
//                             </div>
//                             {booking.status === 'BOOKED' && (
//                                 // <button className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200">
//                                 //     ดูตั๋ว QR Code
//                                 // </button>
//                                 <Link
//                                     href={`/ticket?code=${booking.booking_code}`} // 👉 ลิงก์ไปหน้า ticket พร้อมแนบรหัส
//                                     className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors"
//                                 >
//                                     ดูตั๋ว QR Code
//                                 </Link>
//                             )}
//                         </div>
//                     </div>
//                 )) : (
//                     <div className="flex flex-col items-center justify-center py-20 text-gray-400">
//                         <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-2xl">
//                             {activeTab === 'upcoming' ? <FiCalendar /> : <FiClock />}
//                         </div>
//                         <p>ไม่มีรายการ{activeTab === 'upcoming' ? 'ที่กำลังมาถึง' : 'ย้อนหลัง'}</p>
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }

'use client'
import { useState, useEffect } from "react";
import Link from "next/link";
import liff from "@line/liff";
import { FiCalendar, FiClock, FiCheckCircle, FiXCircle, FiGrid, FiList } from "react-icons/fi";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID;

// ฟังก์ชันแปลงวันที่ไทย
const formatDateThai = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function MyHistoryPage() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("upcoming");
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const initLiff = async () => {
            try {
                if (!LIFF_ID) throw new Error("LIFF ID is missing");
                await liff.init({ liffId: LIFF_ID });

                if (liff.isLoggedIn()) {
                    const p = await liff.getProfile();
                    setProfile(p);
                    fetchMyBookings(p.userId);
                } else {
                    if (liff.isInClient()) {
                        liff.login();
                    } else {
                        // โหมดทดสอบบนคอม (Mock)
                        console.log("Mock Mode");
                        setProfile({ displayName: "Test User", pictureUrl: "", userId: "MOCK_USER" });
                        fetchMyBookings("MOCK_USER");
                    }
                }
            } catch (err) {
                console.error(err);
                // Fallback Mock Data
                setProfile({ displayName: "Test User", pictureUrl: "", userId: "MOCK_USER" });
                fetchMyBookings("MOCK_USER");
            }
        };
        initLiff();
    }, []);

    const fetchMyBookings = async (userId) => {
        try {
            // ถ้าเป็น Mock User ให้ใช้ข้อมูลปลอม
            if (userId === "MOCK_USER") {
                setTimeout(() => {
                    setBookings([
                        { id: 1, booking_date: '2025-12-25', slot_label: '09:00-10:00', status: 'BOOKED', booking_code: '0615671014-8899' },
                        { id: 2, booking_date: '2025-11-10', slot_label: '13:00-14:00', status: 'CHECKED_IN', booking_code: '0615671014-1122' }
                    ]);
                    setLoading(false);
                }, 1000); // หน่วงเวลาให้เห็น Skeleton
                return;
            }

            const res = await fetch(`/api/my-history?userId=${userId}`).then(r => r.json());
            if (res.ok) {
                setBookings(res.bookings);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const upcomingList = bookings.filter(b => b.status === 'BOOKED');
    const historyList = bookings.filter(b => b.status !== 'BOOKED');
    const currentList = activeTab === 'upcoming' ? upcomingList : historyList;

    return (
        <div className="min-h-screen bg-stone-50 font-sans pb-20">
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap'); .font-sans { font-family: 'Prompt', sans-serif; }`}</style>

            {/* Header */}
            <div className="bg-emerald-600 text-white p-6 rounded-b-3xl shadow-lg relative overflow-hidden">
                <div className="relative z-10 flex items-center gap-4">
                    {loading ? (
                        // Skeleton Profile
                        <div className="flex items-center gap-4 animate-pulse w-full">
                            <div className="w-14 h-14 bg-emerald-500/50 rounded-full"></div>
                            <div className="space-y-2 flex-1">
                                <div className="h-4 bg-emerald-500/50 rounded w-1/3"></div>
                                <div className="h-3 bg-emerald-500/50 rounded w-1/4"></div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {profile?.pictureUrl ? (
                                <img src={profile.pictureUrl} className="w-14 h-14 rounded-full border-2 border-white bg-white" alt="Profile" />
                            ) : (
                                <div className="w-14 h-14 rounded-full border-2 border-white bg-emerald-700 flex items-center justify-center text-xl">
                                    {profile?.displayName?.charAt(0) || "U"}
                                </div>
                            )}
                            <div>
                                <h1 className="text-xl font-bold">ประวัติการจอง</h1>
                                <p className="text-emerald-100 text-sm">{profile?.displayName}</p>
                            </div>
                        </>
                    )}
                </div>
                <FiCalendar className="absolute -right-4 -bottom-4 text-emerald-500 opacity-50 w-32 h-32" />
            </div>

            {/* Tabs */}
            <div className="px-4 mt-6">
                <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex">
                    <button onClick={() => setActiveTab("upcoming")} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'upcoming' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'text-gray-400'}`}>
                        กำลังมาถึง
                    </button>
                    <button onClick={() => setActiveTab("history")} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'text-gray-400'}`}>
                        ย้อนหลัง
                    </button>
                </div>
            </div>

            {/* Content List */}
            <div className="px-4 mt-4 space-y-4">
                {loading ? (
                    // Skeleton List Items (แสดง 3 อัน)
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden animate-pulse">
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
                    currentList.map((booking) => (
                        <div key={booking.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden animate-fade-in-up">
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${booking.status === 'BOOKED' ? 'bg-yellow-400' : booking.status === 'CHECKED_IN' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-lg">
                                        <FiCalendar /> {formatDateThai(booking.booking_date)}
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                                        <FiClock /> {booking.slot_label}
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 ${booking.status === 'BOOKED' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : booking.status === 'CHECKED_IN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                    {booking.status === 'BOOKED' ? 'รอรับบริการ' : booking.status === 'CHECKED_IN' ? <><FiCheckCircle /> สำเร็จ</> : <><FiXCircle /> ยกเลิก</>}
                                </span>
                            </div>
                            <hr className="border-dashed border-gray-100 my-3" />
                            <div className="flex justify-between items-end">
                                <div className="text-xs text-gray-400">
                                    <p>รหัสการจอง</p>
                                    <p className="text-xs md:text-base font-mono font-bold text-gray-600 tracking-wider">#{booking.booking_code}</p>
                                </div>

                                {booking.status === 'BOOKED' && (
                                    <Link href={`/ticket?code=${booking.booking_code}`} className="text-xs  bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-600 hover:text-white transition-colors font-medium flex items-center gap-1">
                                        <FiList className="text-xs" /> รายละเอียด / ยกเลิก
                                    </Link>
                                )}

                                {booking.status !== 'BOOKED' && (
                                    <Link href={`/ticket?code=${booking.booking_code}`} className="text-xs bg-emerald-50 text-emerald-600 px-3 py-2 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors font-medium flex items-center gap-1">
                                        <FiList /> รายละเอียด
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-2xl">
                            <FiGrid />
                        </div>
                        <p>ไม่มีรายการ{activeTab === 'upcoming' ? 'ที่กำลังมาถึง' : 'ย้อนหลัง'}</p>
                    </div>
                )}
            </div>
        </div>
    );
}