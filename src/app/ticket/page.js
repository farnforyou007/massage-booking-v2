// 'use client'
// import { useEffect, useState, Suspense } from "react";
// import { useSearchParams, useRouter } from "next/navigation";
// import Link from "next/link";
// import { getBookingByCode, userCancelBooking } from "../../api"; // เรียก API ใหม่
// import { QRCodeCanvas } from "qrcode.react";
// import Swal from "sweetalert2";
// import { supabase } from "../../supabaseClient"; // เรียก Supabase

// import {
//     FiCalendar, FiClock, FiUser, FiPhone, FiHash,
//     FiAlertCircle, FiCheckCircle, FiArrowLeft, FiActivity,
//     FiDownload, FiSearch, FiXCircle, FiMapPin
// } from "react-icons/fi";

// // Helper renderStatus (เหมือนเดิม)
// function renderStatus(status) {
//     const s = String(status || "").toUpperCase();
//     if (s === "BOOKED") {
//         return {
//             text: "ลงทะเบียนสำเร็จ",
//             cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
//             icon: <FiCheckCircle />,
//         };
//     } else if (s === "CHECKED_IN") {
//         return {
//             text: "เข้ารับบริการแล้ว",
//             cls: "bg-blue-100 text-blue-700 border-blue-200",
//             icon: <FiCheckCircle />,
//         };
//     } else if (s === "CANCELLED") {
//         return {
//             text: "ยกเลิกการจอง",
//             cls: "bg-rose-100 text-rose-700 border-rose-200",
//             icon: <FiAlertCircle />,
//         };
//     } else if (s === "NO_SHOW") { // 🔥 เพิ่มส่วนนี้ครับ
//         return {
//             text: "ไม่มาตามนัด",
//             cls: "bg-gray-100 text-gray-500 border-gray-200",
//             icon: <FiXCircle />,
//         };
//     }

//     return {
//         text: s || "รอตรวจสอบ",
//         cls: "bg-gray-100 text-gray-600 border-gray-200",
//         icon: <FiHash />,
//     };
// }

// function TicketContent() {
//     const searchParams = useSearchParams();
//     const router = useRouter();
//     const codeFromUrl = searchParams.get("code") || "";

//     const [loading, setLoading] = useState(false);
//     const [booking, setBooking] = useState(null);
//     const [errorMsg, setErrorMsg] = useState("");
//     const [searchInput, setSearchInput] = useState("");
//     const [cancelling, setCancelling] = useState(false);

//     // โหลดข้อมูล
//     useEffect(() => {
//         if (!codeFromUrl) {
//             setBooking(null);
//             setErrorMsg("");
//             setLoading(false);
//             return;
//         }
//         loadData(codeFromUrl);
//     }, [codeFromUrl]);

//     async function loadData(code) {
//         setLoading(true);
//         setErrorMsg("");
//         setBooking(null);
//         try {
//             const res = await getBookingByCode(code);

//             // เช็คว่าเจอข้อมูลไหม
//             if (!res || !res.ok || !res.booking) {
//                 setErrorMsg(res?.message || "ไม่พบข้อมูลการลงทะเบียน");
//             } else {
//                 setBooking(res.booking);
//             }
//         } catch (err) {
//             setErrorMsg("เกิดข้อผิดพลาด: " + err.message);
//         } finally {
//             setLoading(false);
//         }
//     }

//     const handleSearch = (e) => {
//         e.preventDefault();
//         if (!searchInput.trim()) return;
//         // เปลี่ยน URL เพื่อค้นหา
//         router.push(`/ticket?code=${searchInput.trim()}`);
//     };

//     const clearSearch = () => {
//         setSearchInput("");
//         setErrorMsg("");
//         // เคลียร์ URL กลับมาหน้าแรกของ Ticket
//         router.push('/ticket');
//     };

//     // ฟังก์ชันยกเลิกการจอง
//     const handleCancelBooking = async () => {
//         if (!booking) return;

//         const result = await Swal.fire({
//             title: 'ต้องการยกเลิก?',
//             text: "หากยกเลิกแล้ว ท่านจะต้องจองคิวใหม่",
//             icon: 'warning',
//             showCancelButton: true,
//             confirmButtonColor: '#d33',
//             cancelButtonColor: '#3085d6',
//             confirmButtonText: 'ยืนยันยกเลิก',
//             cancelButtonText: 'เก็บไว้ก่อน'
//         });

//         if (result.isConfirmed) {
//             setCancelling(true);
//             try {
//                 // ส่ง booking.code (ไม่ใช่ id) ไปยกเลิก
//                 const res = await userCancelBooking(booking.code || booking.booking_code);
//                 if (res.ok) {
//                     await Swal.fire('ยกเลิกสำเร็จ', 'รายการจองของคุณถูกยกเลิกแล้ว', 'success');
//                     loadData(codeFromUrl); // โหลดข้อมูลใหม่เพื่ออัปเดตสถานะ
//                 } else {
//                     Swal.fire('เกิดข้อผิดพลาด', res.message, 'error');
//                 }
//             } catch (err) {
//                 Swal.fire('Error', err.message, 'error');
//             } finally {
//                 setCancelling(false);
//             }
//         }
//     };

//     useEffect(() => {
//         // ถ้ายังไม่มีข้อมูลการจอง หรือไม่มีรหัสจอง ให้ข้ามไปก่อน
//         if (!booking || !booking.booking_code) return;

//         console.log("🟢 เริ่มดักฟังสถานะ Realtime...");

//         // สร้างตัวดักฟัง (Subscription)
//         const channel = supabase
//             .channel('realtime-ticket-status') // ตั้งชื่อ channel อะไรก็ได้
//             .on(
//                 'postgres_changes',
//                 {
//                     event: 'UPDATE', // ดักเฉพาะการแก้ไขข้อมูล
//                     schema: 'public',
//                     table: 'bookings',
//                     filter: `booking_code=eq.${booking.booking_code}` // 🔥 สำคัญ: ดักเฉพาะแถวที่เป็นของลูกค้านี้เท่านั้น
//                 },
//                 (payload) => {
//                     console.log("⚡ มีการเปลี่ยนแปลงสถานะ:", payload.new);

//                     // อัปเดต State ทันที
//                     const newData = payload.new;
//                     setBooking(prev => ({
//                         ...prev,
//                         status: newData.status, // อัปเดตสถานะ
//                         // อัปเดตค่าอื่นๆ เผื่อมี
//                     }));

//                     // ✨ ลูกเล่น: ถ้าสถานะเปลี่ยนเป็น CHECKED_IN ให้เด้ง Alert บอกลูกค้า
//                     if (newData.status === 'CHECKED_IN') {
//                         Swal.fire({
//                             icon: 'success',
//                             title: 'เช็คอินสำเร็จ!',
//                             text: 'เจ้าหน้าที่ทำการยืนยันรายการแล้ว',
//                             timer: 2000,
//                             showConfirmButton: false,
//                             backdrop: `rgba(0,128,0,0.4)` // พื้นหลังสีเขียวจางๆ
//                         });

//                         // สั่นมือถือลูกค้า 1 ที (ถ้าทำได้)
//                         if (navigator.vibrate) navigator.vibrate(200);
//                     }
//                 }
//             )
//             .subscribe();

//         // เมื่อปิดหน้านี้ ให้ยกเลิกการดักฟัง (เพื่อไม่ให้เปลืองทรัพยากร)
//         return () => {
//             supabase.removeChannel(channel);
//         };

//     }, [booking?.booking_code]); // ทำงานเมื่อมี booking_code มาแล้ว

//     return (
//         <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 px-4 py-8 font-sans">
//             <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap');
//         .font-sans { font-family: 'Prompt', sans-serif; }
//         .ticket-notch {
//             position: absolute; width: 24px; height: 24px; background-color: #fafaf9; 
//             border-radius: 50%; top: 50%; transform: translateY(-50%); z-index: 10;
//             box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
//         }
//         .ticket-shadow { box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.1); }
//       `}</style>

//             {/* Navigation Back */}
//             {/* <div className="w-full max-w-md mb-6 flex justify-between items-center">
//                 <Link
//                     href="/"
//                     className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-emerald-600 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100"
//                 >
//                     <FiArrowLeft />
//                     กลับหน้าจองคิว
//                 </Link>
//             </div> */}

//             {/* Navigation Bar รวม 2 ปุ่มในแถวเดียว */}
//             <div className="w-full max-w-md mb-6 flex justify-between items-center">

//                 {/* ปุ่มซ้าย: กลับหน้าจองคิว */}
//                 <Link
//                     href="/"
//                     className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-emerald-600 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100"
//                 >
//                     <FiArrowLeft />
//                     กลับหน้าลงทะเบียน
//                 </Link>

//                 {/* ปุ่มขวา: กลับหน้าประวัติ */}
//                 <Link
//                     href="/history"
//                     className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-emerald-600 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100"
//                 >
//                     กลับหน้าประวัติ
//                     <FiArrowLeft className="rotate-180" /> {/* กลับด้านลูกศรให้ชี้ไปขวาเพื่อให้ดูสมดุล (Option) */}
//                 </Link>

//             </div>



//             {/* ---- MAIN CARD ---- */}
//             <div className="w-full max-w-md bg-white rounded-3xl ticket-shadow overflow-hidden relative animate-fade-in-up min-h-[400px] flex flex-col">

//                 {/* 1. Header (สีเขียว) */}
//                 <div className="bg-emerald-800 p-6 text-white relative overflow-hidden flex-shrink-0">
//                     {codeFromUrl && (
//                         <button
//                             onClick={clearSearch}
//                             className="absolute top-4 right-4 bg-black/20 hover:bg-black/30 p-1.5 rounded-full text-white/80 transition-colors z-20"
//                             title="ค้นหาใหม่"
//                         >
//                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
//                                 <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
//                             </svg>
//                         </button>
//                     )}
//                     <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4 pointer-events-none">
//                         <FiActivity size={150} />
//                     </div>
//                     <div className="relative z-10 text-center">
//                         <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl mb-3 border border-white/30">
//                             <FiActivity className="text-2xl" />
//                         </div>
//                         <h2 className="text-xl font-bold tracking-wide">
//                             {codeFromUrl ? "บัตรลงทะเบียน" : "บัตรลงทะเบียน"}
//                         </h2>
//                         <p className="text-emerald-200 text-sm font-light">คณะการแพทย์แผนไทย</p>
//                     </div>
//                 </div>

//                 {/* 2. Body Content */}
//                 <div className="relative flex-grow flex flex-col bg-white">

//                     {/* --- SCENE 1: Search Form --- */}
//                     {!codeFromUrl && (
//                         <div className="p-8 flex flex-col justify-center flex-grow">
//                             <div className="text-center mb-6">
//                                 <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
//                                     <FiSearch size={24} />
//                                 </div>
//                                 <p className="text-gray-500 text-sm">
//                                     กรุณากรอก <b>"รหัสการจอง"</b> (Booking Code)<br />
//                                     <span className="text-xs text-gray-400">เพื่อความถูกต้องในการค้นหา</span>
//                                 </p>
//                             </div>
//                             <form onSubmit={handleSearch} className="space-y-4">
//                                 <input
//                                     type="text"
//                                     className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-center text-gray-800 placeholder-gray-400 uppercase"
//                                     placeholder="รหัสจอง เช่น X8Y9Z"
//                                     value={searchInput}
//                                     onChange={(e) => setSearchInput(e.target.value)}
//                                     autoFocus
//                                 />
//                                 <button
//                                     type="submit"
//                                     disabled={!searchInput}
//                                     className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//                                 >
//                                     ค้นหา
//                                 </button>
//                             </form>
//                         </div>
//                     )}

//                     {/* --- SCENE 2: Loading --- */}
//                     {codeFromUrl && loading && (
//                         <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
//                             <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
//                             <p className="mt-4 text-gray-400 text-sm animate-pulse">กำลังค้นหาข้อมูล...</p>
//                         </div>
//                     )}

//                     {/* --- SCENE 3: Error --- */}
//                     {codeFromUrl && !loading && errorMsg && (
//                         <div className="p-8 text-center flex-grow flex flex-col justify-center">
//                             <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
//                                 <FiAlertCircle size={32} />
//                             </div>
//                             <h3 className="text-lg font-bold text-gray-800 mb-2">ไม่พบข้อมูล</h3>
//                             <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
//                             <button onClick={clearSearch} className="text-emerald-600 font-medium hover:underline">
//                                 ลองค้นหาใหม่
//                             </button>
//                         </div>
//                     )}

//                     {/* --- SCENE 4: Success (Ticket) --- */}
//                     {codeFromUrl && !loading && booking && (
//                         <div>
//                             {/* QR Section */}
//                             <div className="pt-8 pb-6 px-6 flex flex-col items-center justify-center bg-white">
//                                 <div className="p-3 border-2 border-dashed border-gray-200 rounded-xl bg-stone-50 relative">
//                                     {/* รองรับทั้ง property code และ booking_code */}
//                                     <QRCodeCanvas value={booking.code || booking.booking_code} size={160} level="H" />
//                                 </div>
//                                 <div className="mt-4 flex items-center gap-2 px-4 py-1.5 bg-gray-100 rounded-full">
//                                     <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Booking ID</span>
//                                     <span className="font-mono font-bold text-emerald-700 text-base tracking-wide">{booking.code || booking.booking_code}</span>
//                                 </div>
//                             </div>

//                             {/* Divider */}
//                             <div className="relative h-6 w-full overflow-hidden">
//                                 <div className="absolute top-1/2 w-full border-t-2 border-dashed border-gray-200"></div>
//                                 <div className="ticket-notch -left-3 border-r border-gray-200"></div>
//                                 <div className="ticket-notch -right-3 border-l border-gray-200"></div>
//                             </div>

//                             {/* Details */}
//                             <div className="px-8 pb-8 pt-4 space-y-5">
//                                 {/* Status */}
//                                 <div className="text-center">
//                                     {(() => {
//                                         const st = renderStatus(booking.status);
//                                         return (
//                                             <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${st.cls}`}>
//                                                 {st.icon} {st.text}
//                                             </span>
//                                         );
//                                     })()}
//                                 </div>

//                                 {/* Grid Info */}
//                                 <div className="grid grid-cols-2 gap-y-5 gap-x-4 text-sm">
//                                     {/* <div className="col-span-2 text-lg font-semibold text-center">

//                                         {booking.line_picture_url && (
//                                             <div className="mb-3">
//                                                 <img
//                                                     src={booking.line_picture_url}
//                                                     alt="LINE Profile"
//                                                     className="w-30 h-30 rounded-full border-4 border-emerald-100 object-cover shadow-lg mx-auto"
//                                                     referrerPolicy="no-referrer"
//                                                 />
//                                             </div>
//                                         )}
//                                     </div>   */}
//                                     <div className="col-span-2">
//                                         <label className="block text-xs text-gray-400 mb-1 font-medium">ชื่อผู้จอง</label>
//                                         <div className="flex items-center gap-2 text-gray-800 font-semibold text-base">
//                                             {/* รองรับ name หรือ customer_name */}
//                                             <FiUser className="text-emerald-500" /> {booking.name || booking.customer_name}
//                                         </div>
//                                     </div>
//                                     <div>
//                                         <label className="block text-xs text-gray-400 mb-1 font-medium">วันที่</label>
//                                         <div className="flex items-center gap-2 text-gray-800 font-semibold">
//                                             {/* รองรับ date หรือ booking_date */}
//                                             <FiCalendar className="text-emerald-500" /> {booking.date || booking.booking_date}
//                                         </div>
//                                     </div>
//                                     <div>
//                                         <label className="block text-xs text-gray-400 mb-1 font-medium">เวลา</label>
//                                         <div className="flex items-center gap-2 text-gray-800 font-semibold">
//                                             <FiClock className="text-emerald-500" /> {booking.slot_label || booking.slot}
//                                         </div>
//                                     </div>
//                                     <div className="col-span-2">
//                                         <label className="block text-xs text-gray-400 mb-1 font-medium">เบอร์โทรศัพท์</label>
//                                         <div className="flex items-center gap-2 text-gray-800 font-medium">
//                                             <FiPhone className="text-emerald-500" /> {booking.phone}
//                                         </div>
//                                     </div>
//                                     <div className="col-span-2 pt-2 border-t border-gray-100">
//                                         <div className="flex items-start gap-2 text-gray-500 text-xs">
//                                             <FiMapPin className="mt-0.5 text-emerald-500 flex-shrink-0" />
//                                             <span>อาคารสหเวช ชั้น 7 ห้อง TTM704</span>
//                                         </div>
//                                     </div>
//                                 </div>

//                                 {/* 🔥 ปุ่มยกเลิกการจอง (แสดงเฉพาะสถานะ BOOKED) */}
//                                 {booking.status === "BOOKED" && (
//                                     <div className="pt-4 border-t border-gray-100">
//                                         <button
//                                             onClick={handleCancelBooking}
//                                             disabled={cancelling}
//                                             className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 font-semibold text-sm transition-colors"
//                                         >
//                                             {cancelling ? "กำลังดำเนินการ..." : <><FiXCircle /> ยกเลิกการจอง</>}
//                                         </button>
//                                     </div>
//                                 )}
//                             </div>
//                         </div>
//                     )}
//                 </div>

//                 {/* Shadow */}
//                 {!loading && !errorMsg && codeFromUrl && (
//                     <div className="w-[90%] mx-auto h-3 bg-emerald-900/10 rounded-b-xl filter blur-sm"></div>
//                 )}
//             </div>

//             {/* Capture Hint */}
//             {!loading && booking && codeFromUrl && (
//                 <p className="mt-6 text-xs text-gray-400 flex items-center gap-2 animate-bounce">
//                     <FiDownload /> บันทึกภาพหน้าจอนี้ไว้เป็นหลักฐาน
//                 </p>
//             )}

//             <style>{`
//         @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
//         .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
//       `}</style>
//         </div>
//     );
// }

// // Wrap Suspense เพราะ useSearchParams ใน Next.js ต้องการ
// export default function TicketPage() {
//     return <Suspense fallback={<div>Loading...</div>}><TicketContent /></Suspense>;
// }

// ver2
'use client'
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getBookingByCode, userCancelBooking } from "../../api";
import { QRCodeCanvas } from "qrcode.react";
import Swal from "sweetalert2";
import { supabase } from "../../supabaseClient";

import {
    FiCalendar, FiClock, FiUser, FiPhone, FiHash,
    FiAlertCircle, FiCheckCircle, FiArrowLeft, FiActivity,
    FiDownload, FiSearch, FiXCircle, FiMapPin
} from "react-icons/fi";

// --- Helper: Render Status ---
function renderStatus(status) {
    const s = String(status || "").toUpperCase();
    if (s === "BOOKED") {
        return {
            text: "รอใช้บริการ",
            cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
            icon: <FiClock />,
        };
    } else if (s === "CHECKED_IN") {
        return {
            text: "เข้ารับบริการแล้ว",
            cls: "bg-blue-100 text-blue-700 border-blue-200",
            icon: <FiCheckCircle />,
        };
    } else if (s === "CANCELLED") {
        return {
            text: "ยกเลิกการจอง",
            cls: "bg-rose-100 text-rose-700 border-rose-200",
            icon: <FiAlertCircle />,
        };
    } else if (s === "NO_SHOW") {
        return {
            text: "ไม่มาตามนัด",
            cls: "bg-gray-100 text-gray-500 border-gray-200",
            icon: <FiXCircle />,
        };
    }

    return {
        text: s || "รอตรวจสอบ",
        cls: "bg-gray-100 text-gray-600 border-gray-200",
        icon: <FiHash />,
    };
}

// --- Component: Skeleton Loading (โหลดแบบสวยงาม) ---
const TicketSkeleton = () => (
    <div className="w-full max-w-md bg-white rounded-3xl ticket-shadow overflow-hidden relative animate-pulse min-h-[500px] flex flex-col">
        {/* Header Skeleton */}
        <div className="bg-emerald-900/10 p-6 h-40 relative flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-gray-300 rounded-xl mb-3"></div>
            <div className="h-6 w-32 bg-gray-300 rounded mb-2"></div>
            <div className="h-4 w-24 bg-gray-300 rounded"></div>
        </div>

        {/* Body Skeleton */}
        <div className="flex-grow bg-white p-6 flex flex-col items-center">
            <div className="w-40 h-40 bg-gray-200 rounded-xl mb-4"></div>
            <div className="h-8 w-48 bg-gray-200 rounded-full mb-8"></div>

            <div className="w-full h-px bg-gray-100 mb-6"></div>

            <div className="w-full grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                    <div className="h-3 w-16 bg-gray-200 rounded"></div>
                    <div className="h-5 w-3/4 bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-2">
                    <div className="h-3 w-12 bg-gray-200 rounded"></div>
                    <div className="h-5 w-full bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-2">
                    <div className="h-3 w-12 bg-gray-200 rounded"></div>
                    <div className="h-5 w-full bg-gray-200 rounded"></div>
                </div>
                <div className="col-span-2 space-y-2">
                    <div className="h-3 w-20 bg-gray-200 rounded"></div>
                    <div className="h-5 w-1/2 bg-gray-200 rounded"></div>
                </div>
            </div>
        </div>
    </div>
);

function TicketContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const codeFromUrl = searchParams.get("code") || "";

    const [loading, setLoading] = useState(false);
    const [booking, setBooking] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [cancelling, setCancelling] = useState(false);

    // โหลดข้อมูล
    useEffect(() => {
        if (!codeFromUrl) {
            setBooking(null);
            setErrorMsg("");
            setLoading(false);
            return;
        }
        loadData(codeFromUrl);
    }, [codeFromUrl]);

    async function loadData(code) {
        setLoading(true);
        setErrorMsg("");
        setBooking(null);
        try {
            const res = await getBookingByCode(code);
            if (!res || !res.ok || !res.booking) {
                setErrorMsg(res?.message || "ไม่พบข้อมูลการลงทะเบียน");
            } else {
                setBooking(res.booking);
            }
        } catch (err) {
            setErrorMsg("เกิดข้อผิดพลาด: " + err.message);
        } finally {
            // หน่วงเวลาเล็กน้อยเพื่อให้เห็น Skeleton สวยๆ (Optional)
            setTimeout(() => setLoading(false), 200);
        }
    }

    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchInput.trim()) return;
        router.push(`/ticket?code=${searchInput.trim()}`);
    };

    const clearSearch = () => {
        setSearchInput("");
        setErrorMsg("");
        router.push('/ticket');
    };

    const handleCancelBooking = async () => {
        if (!booking) return;

        const result = await Swal.fire({
            title: 'ต้องการยกเลิก?',
            text: "หากยกเลิกแล้ว ท่านจะต้องจองคิวใหม่",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ยืนยันยกเลิก',
            cancelButtonText: 'เก็บไว้ก่อน'
        });

        if (result.isConfirmed) {
            setCancelling(true);
            try {
                const res = await userCancelBooking(booking.code || booking.booking_code);
                if (res.ok) {
                    await Swal.fire('ยกเลิกสำเร็จ', 'รายการจองของคุณถูกยกเลิกแล้ว', 'success');
                    loadData(codeFromUrl);
                } else {
                    Swal.fire('เกิดข้อผิดพลาด', res.message, 'error');
                }
            } catch (err) {
                Swal.fire('Error', err.message, 'error');
            } finally {
                setCancelling(false);
            }
        }
    };

    // 🔥 Realtime Listener (ปรับปรุงใหม่)
    useEffect(() => {
        // หา Code ที่ถูกต้อง (รองรับทั้ง key: code และ booking_code)
        const targetCode = booking?.booking_code || booking?.code;

        // ถ้ายังไม่มีข้อมูล หรือไม่มีรหัสจอง ให้ข้ามไปก่อน
        if (!booking || !targetCode) return;

        console.log(`🟢 [Realtime] เริ่มดักฟังสถานะสำหรับรหัส: ${targetCode}`);

        const channel = supabase
            .channel(`realtime-ticket-${targetCode}`) // ตั้งชื่อ channel ให้ unique ต่อ user
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'bookings',
                    filter: `booking_code=eq.${targetCode}` // 🔥 Filter ให้ตรงกับ DB Column
                },
                (payload) => {
                    console.log("⚡ [Realtime] มีการเปลี่ยนแปลง:", payload.new);

                    const newData = payload.new;

                    // อัปเดต State ทันที
                    setBooking(prev => ({
                        ...prev,
                        ...newData // ทับข้อมูลเดิมด้วยข้อมูลใหม่ทั้งหมด
                    }));

                    // แจ้งเตือนเมื่อเช็คอินสำเร็จ
                    if (newData.status === 'CHECKED_IN') {
                        Swal.fire({
                            icon: 'success',
                            title: 'เข้ารับบริการสำเร็จ!',
                            html: 'เจ้าหน้าที่ทำการยืนยันรายการแล้ว<br/><b>เชิญเข้ารับบริการได้เลยครับ</b>',
                            timer: 3000,
                            showConfirmButton: false,
                            // backdrop: `rgba(16, 185, 129, 0.2)`
                        });

                        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                    }
                }
            )
            .subscribe((status) => {
                console.log("📡 [Realtime] Subscription Status:", status);
            });

        return () => {
            console.log("🔴 [Realtime] ยกเลิกการดักฟัง");
            supabase.removeChannel(channel);
        };

    }, [booking?.booking_code, booking?.code]); // Dependency ครอบคลุมทั้ง 2 keys

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 px-4 py-8 font-sans">
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap');
        .font-sans { font-family: 'Prompt', sans-serif; }
        .ticket-notch {
            position: absolute; width: 24px; height: 24px; background-color: #fafaf9; 
            border-radius: 50%; top: 50%; transform: translateY(-50%); z-index: 10;
            box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
        }
        .ticket-shadow { box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.1); }
      `}</style>

            <div className="w-full max-w-md mb-6 flex justify-between items-center">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-emerald-600 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100"
                >
                    <FiArrowLeft />
                    กลับหน้าลงทะเบียน
                </Link>
                <Link
                    href="/history"
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-emerald-600 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100"
                >
                    กลับหน้าประวัติ
                    <FiArrowLeft className="rotate-180" />
                </Link>
            </div>

            {/* ถ้า Loading ให้แสดง Skeleton */}
            {loading && codeFromUrl ? (
                <TicketSkeleton />
            ) : (
                /* ถ้าโหลดเสร็จแล้ว แสดงบัตรจริง */
                <div className="w-full max-w-md bg-white rounded-3xl ticket-shadow overflow-hidden relative animate-fade-in-up min-h-[400px] flex flex-col">

                    {/* 1. Header (สีเขียว) */}
                    <div className="bg-emerald-800 p-6 text-white relative overflow-hidden flex-shrink-0">
                        {codeFromUrl && (
                            <button
                                onClick={clearSearch}
                                className="absolute top-4 right-4 bg-black/20 hover:bg-black/30 p-1.5 rounded-full text-white/80 transition-colors z-20"
                                title="ค้นหาใหม่"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                        <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4 pointer-events-none">
                            <FiActivity size={150} />
                        </div>
                        <div className="relative z-10 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl mb-3 border border-white/30">
                                <FiActivity className="text-2xl" />
                            </div>
                            <h2 className="text-xl font-bold tracking-wide">
                                {codeFromUrl ? "บัตรลงทะเบียน" : "บัตรลงทะเบียน"}
                            </h2>
                            <p className="text-emerald-200 text-sm font-light">คณะการแพทย์แผนไทย</p>
                        </div>
                    </div>

                    {/* 2. Body Content */}
                    <div className="relative flex-grow flex flex-col bg-white">

                        {/* --- SCENE 1: Search Form --- */}
                        {!codeFromUrl && (
                            <div className="p-8 flex flex-col justify-center flex-grow">
                                <div className="text-center mb-6">
                                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <FiSearch size={24} />
                                    </div>
                                    <p className="text-gray-500 text-sm">
                                        กรุณากรอก <b>"รหัสการจอง"</b> (Booking Code)<br />
                                        <span className="text-xs text-gray-400">เพื่อความถูกต้องในการค้นหา</span>
                                    </p>
                                </div>
                                <form onSubmit={handleSearch} className="space-y-4">
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-center text-gray-800 placeholder-gray-400 uppercase"
                                        placeholder="รหัสจอง เช่น X8Y9Z"
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        disabled={!searchInput}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ค้นหา
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* --- SCENE 3: Error --- */}
                        {codeFromUrl && !loading && errorMsg && (
                            <div className="p-8 text-center flex-grow flex flex-col justify-center">
                                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FiAlertCircle size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2">ไม่พบข้อมูล</h3>
                                <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
                                <button onClick={clearSearch} className="text-emerald-600 font-medium hover:underline">
                                    ลองค้นหาใหม่
                                </button>
                            </div>
                        )}

                        {/* --- SCENE 4: Success (Ticket) --- */}
                        {codeFromUrl && !loading && booking && (
                            <div>
                                {/* QR Section */}
                                <div className="pt-8 pb-6 px-6 flex flex-col items-center justify-center bg-white">
                                    <div className="p-3 border-2 border-dashed border-gray-200 rounded-xl bg-stone-50 relative">
                                        {/* รองรับทั้ง property code และ booking_code */}
                                        <QRCodeCanvas value={booking.code || booking.booking_code} size={160} level="H" />
                                    </div>
                                    <div className="mt-4 flex items-center gap-2 px-4 py-1.5 bg-gray-100 rounded-full">
                                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Booking ID</span>
                                        <span className="font-mono font-bold text-emerald-700 text-base tracking-wide">{booking.code || booking.booking_code}</span>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="relative h-6 w-full overflow-hidden">
                                    <div className="absolute top-1/2 w-full border-t-2 border-dashed border-gray-200"></div>
                                    <div className="ticket-notch -left-3 border-r border-gray-200"></div>
                                    <div className="ticket-notch -right-3 border-l border-gray-200"></div>
                                </div>

                                {/* Details */}
                                <div className="px-8 pb-8 pt-4 space-y-5">
                                    {/* Status */}
                                    <div className="text-center">
                                        {(() => {
                                            const st = renderStatus(booking.status);
                                            return (
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${st.cls}`}>
                                                    {st.icon} {st.text}
                                                </span>
                                            );
                                        })()}
                                    </div>

                                    {/* Grid Info */}
                                    <div className="grid grid-cols-2 gap-y-5 gap-x-4 text-sm">
                                        <div className="col-span-2">
                                            <label className="block text-xs text-gray-400 mb-1 font-medium">ชื่อผู้จอง</label>
                                            <div className="flex items-center gap-2 text-gray-800 font-semibold text-base">
                                                <FiUser className="text-emerald-500" /> {booking.name || booking.customer_name}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1 font-medium">วันที่</label>
                                            <div className="flex items-center gap-2 text-gray-800 font-semibold">
                                                <FiCalendar className="text-emerald-500" /> {booking.date || booking.booking_date}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1 font-medium">เวลา</label>
                                            <div className="flex items-center gap-2 text-gray-800 font-semibold">
                                                <FiClock className="text-emerald-500" /> {booking.slot_label || booking.slot}
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs text-gray-400 mb-1 font-medium">เบอร์โทรศัพท์</label>
                                            <div className="flex items-center gap-2 text-gray-800 font-medium">
                                                <FiPhone className="text-emerald-500" /> {booking.phone}
                                            </div>
                                        </div>
                                        <div className="col-span-2 pt-2 border-t border-gray-100">
                                            <div className="flex items-start gap-2 text-gray-500 text-xs">
                                                <FiMapPin className="mt-0.5 text-emerald-500 flex-shrink-0" />
                                                <span>อาคารสหเวช ชั้น 7 ห้อง TTM704</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 🔥 ปุ่มยกเลิกการจอง */}
                                    {booking.status === "BOOKED" && (
                                        <div className="pt-4 border-t border-gray-100">
                                            <button
                                                onClick={handleCancelBooking}
                                                disabled={cancelling}
                                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 font-semibold text-sm transition-colors"
                                            >
                                                {cancelling ? "กำลังดำเนินการ..." : <><FiXCircle /> ยกเลิกการจอง</>}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Shadow */}
                    {!loading && !errorMsg && codeFromUrl && (
                        <div className="w-[90%] mx-auto h-3 bg-emerald-900/10 rounded-b-xl filter blur-sm"></div>
                    )}
                </div>
            )}

            {/* Capture Hint */}
            {!loading && booking && codeFromUrl && (
                <p className="mt-6 text-xs text-gray-400 flex items-center gap-2 animate-bounce">
                    <FiDownload /> บันทึกภาพหน้าจอนี้ไว้เป็นหลักฐาน
                </p>
            )}

            <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
      `}</style>
        </div>
    );
}

// Wrap Suspense เพราะ useSearchParams ใน Next.js ต้องการ
export default function TicketPage() {
    return (
        <Suspense fallback={
            // สร้าง Wrapper ให้เหมือนหน้าปกติ (พื้นหลังสีเทา + จัดกึ่งกลาง)
            <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 px-4 py-8 font-sans">
                {/* เรียกใช้ Skeleton ตัวสวยที่เราสร้างไว้ */}
                <TicketSkeleton />
            </div>
        }>
            <TicketContent />
        </Suspense>
    );
}