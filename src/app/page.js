'use client'
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { supabase } from "../supabaseClient"; // เรียก Supabase
import { QRCodeCanvas } from "qrcode.react";
import liff from "@line/liff"; // เรียก LIFF
// เพิ่ม createBooking เข้าไปในปีกกาครับ
import { getSlots, createBooking, getOpenDates } from "../api";
import {
  FiCalendar,
  FiClock,
  FiUser,
  FiPhone,
  FiCheckCircle,
  FiAlertCircle,
  FiMapPin,
  FiActivity,
  FiLoader
} from "react-icons/fi";

export default function Home() {
  // --- State Management ---
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [slotId, setSlotId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // UI States
  const [loadingDates, setLoadingDates] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slotStatus, setSlotStatus] = useState({ text: "", type: "" });

  // Data & Config
  const [availableDates, setAvailableDates] = useState([]); // วันที่เปิดจองจาก DB
  const [message, setMessage] = useState({ text: "", ok: true });
  const [bookingCode, setBookingCode] = useState("");
  const [ticketUrl, setTicketUrl] = useState("");

  // Line Profile
  const [lineUserId, setLineUserId] = useState("");
  const [lineDisplayName, setLineDisplayName] = useState("");
  // --- State สำหรับเก็บโปรไฟล์ LINE ---
  const [userProfile, setUserProfile] = useState({
    userId: "",
    displayName: "",
    pictureUrl: null // ตัวแปรที่เก็บ URL รูปภาพ
  });
  const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID;

  // // --- 1. Load Initial Data (LIFF + Dates) ---
  // useEffect(() => {
  //   const init = async () => {
  //     setLoadingDates(true);

  //     // A. เชื่อมต่อ LIFF (ใส่ ID ของคุณที่นี่)
  //     try {
  //       await liff.init({ liffId: LIFF_ID });
  //       if (liff.isLoggedIn()) {
  //         const profile = await liff.getProfile();
  //         setLineUserId(profile.userId);
  //         setLineDisplayName(profile.displayName);
  //       } else {
  //         liff.login();
  //       }
  //     } catch (err) {
  //       console.error("LIFF Init Error:", err);
  //     }

  //     // B. ดึงวันที่เปิดจองจากตาราง 'days' ใน Supabase
  //     try {
  //       const { data, error } = await supabase
  //         .from('days')
  //         .select('date')
  //         .eq('status', 'OPEN')
  //         .order('date', { ascending: true });

  //       if (error) throw error;
  //       // แปลงค่าให้เป็น array วันที่ ['2025-02-14', ...]
  //       setAvailableDates(data.map(d => d.date));
  //     } catch (err) {
  //       console.error("Failed to load dates:", err);
  //       Swal.fire("ข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลวันที่ได้", "error");
  //     } finally {
  //       setLoadingDates(false);
  //     }
  //   };

  //   init();
  // }, []);
  // --- 1. Load Data (แยกเป็น 2 ส่วนเพื่อให้ไวขึ้น) ---

  // ส่วนที่ A: โหลดวันที่เปิดจอง (ทำงานทันที ไม่ต้องรอ LINE)
  useEffect(() => {
    const fetchDates = async () => {
      setLoadingDates(true);
      try {
        const { data, error } = await supabase
          .from('days')
          .select('date')
          .eq('status', 'OPEN')
          .order('date', { ascending: true });

        if (error) throw error;
        setAvailableDates(data.map(d => d.date));
      } catch (err) {
        console.error("Failed to load dates:", err);
        Swal.fire("ข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลวันที่ได้", "error");
      } finally {
        setLoadingDates(false); // หยุดหมุนทันทีที่ได้วันที่
      }
    };

    fetchDates();

    // --- 2. ส่วนที่ต้องเพิ่ม: Realtime Listener 🔥 ---
    const channel = supabase
      .channel('realtime-days') // ตั้งชื่อ channel อะไรก็ได้
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'days' },
        (payload) => {
          console.log('มีการเปลี่ยนแปลงวันเปิดจอง!', payload);
          fetchDates(); // สั่งให้โหลดใหม่ทันที
        }
      )
      .subscribe();

    // คืนค่าเพื่อปิดการเชื่อมต่อเมื่อเปลี่ยนหน้า (Cleanup)
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ส่วนที่ B: เชื่อมต่อ LIFF (ทำเงียบๆ เบื้องหลัง)
  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: LIFF_ID });
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();

          // 🔥 แก้ไขจุดนี้: บันทึกข้อมูลโปรไฟล์ลงใน State
          setUserProfile({
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl
          });

          setLineUserId(profile.userId);
          setLineDisplayName(profile.displayName);
          console.log("LINE Login Success:", profile.userId);
        } else {
          liff.login(); // เปิดบรรทัดนี้ถ้าต้องการบังคับ Login ทันที
        }
      } catch (err) {
        console.error("LIFF Init Error:", err);
      }
    };

    initLiff();
  }, [LIFF_ID]);

  // --- 2. Load Slots (เมื่อเลือกวัน) ---
  useEffect(() => {
    if (!date) {
      setSlotStatus({ text: "", type: "" });
      setSlots([]);
      return;
    }

    const fetchSlots = async () => {
      setSlotStatus({ text: `กำลังโหลดช่วงเวลา...`, type: "loading" });
      setSlots([]);
      setSlotId("");

      try {
        // 2.1 ดึงรอบเวลาทั้งหมดที่เปิดใช้งาน (Active)
        const { data: allSlots, error: errSlot } = await supabase
          .from('slots')
          .select('*')
          .eq('is_active', true)
          .order('start_time', { ascending: true });

        if (errSlot) throw errSlot;

        // 2.2 ดึงการจองที่มีอยู่แล้วของวันนี้ (เพื่อนับจำนวนคนจอง)
        const { data: bookedData, error: errBook } = await supabase
          .from('bookings')
          .select('slot_id')
          .eq('booking_date', date)
          .neq('status', 'CANCELLED'); // ไม่นับคนที่ยกเลิก

        if (errBook) throw errBook;

        // 2.3 คำนวณที่ว่าง (Capacity - Booked)
        const computedSlots = allSlots.map(s => {
          const bookedCount = bookedData.filter(b => b.slot_id === s.start_time).length;
          return {
            id: s.start_time,
            label: s.label,
            capacity: s.capacity,
            booked: bookedCount,
            remaining: Math.max(0, s.capacity - bookedCount),
            isFull: bookedCount >= s.capacity
          };
        });

        setSlots(computedSlots);

        if (computedSlots.length === 0) {
          setSlotStatus({ text: "❌ วันนี้ยังไม่มีรอบว่าง หรือปิดให้บริการ", type: "error" });
        } else {
          setSlotStatus({ text: `✅ เลือกช่วงเวลาที่ต้องการ`, type: "success" });
        }

      } catch (err) {
        console.error(err);
        setSlotStatus({ text: "⚠️ โหลดข้อมูลไม่สำเร็จ", type: "error" });
      }
    };

    fetchSlots();

    const bookingChannel = supabase
      .channel('realtime-bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          console.log('มีคนจอง/ยกเลิก! อัปเดตที่ว่างด่วน...');
          fetchSlots();
        }
      )
      .subscribe();

    const slotChannel = supabase
      .channel('realtime-slots')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slots' },
        () => {
          console.log('Admin แก้ไขรอบเวลา! อัปเดต Capacity ด่วน...');
          fetchSlots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingChannel);
      // 🔥🔥 ต้องเอาตัวใหม่มาใส่ใน cleanup ด้วยครับ 🔥🔥
      supabase.removeChannel(slotChannel);
    };
  }, [date]);

  // Helper: แปลงวันที่ไทย
  const formatFullThaiDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // --- 3. Handle Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    // -------------------------------------------------------
    // 🔥 แก้ไข 1: Validation เข้มข้น
    // -------------------------------------------------------
    if (!date || !slotId || !name.trim() || !phone.trim()) {
      return Swal.fire("แจ้งเตือน", "กรุณากรอกข้อมูลให้ครบทุกช่อง", "warning");
    }

    // ล้างค่า เอาเฉพาะตัวเลข
    const cleanPhone = phone.replace(/[^0-9]/g, "");

    // เช็คว่าครบ 10 หลักไหม
    if (cleanPhone.length !== 10) {
      return Swal.fire("เบอร์โทรไม่ถูกต้อง", "กรุณากรอกเบอร์มือถือให้ครบ 10 หลัก", "warning");
    }
    // -------------------------------------------------------

    const selectedSlot = slots.find(s => s.id === slotId);

    const confirm = await Swal.fire({
      title: "ยืนยันการจอง?",
      // html: `<div class="text-left text-sm p-4 bg-gray-50 rounded-lg">
      //           <p><strong>วันที่:</strong> ${formatFullThaiDate(date)}</p>
      //           <p><strong>เวลา:</strong> ${selectedSlot?.label}</p>
      //           <p><strong>ชื่อ:</strong> ${name}</p>
      //           <p><strong>เบอร์:</strong> ${cleanPhone}</p>
      //       </div>`,
      html: `
                <div class="text-left text-sm p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p class="mb-1"><strong>วันที่:</strong> <span class="text-emerald-700">${formatFullThaiDate(date)}</span></p>
                    <p class="mb-1"><strong>เวลา:</strong> <span class="text-emerald-700">${selectedSlot?.label}</span></p>
                    <p class="mb-1"><strong>ชื่อ:</strong> ${name}</p>
                    <p><strong>เบอร์โทร:</strong>  ${cleanPhone}</p>
                </div>
            `,
      icon: "question", showCancelButton: true, confirmButtonText: "ยืนยัน", confirmButtonColor: "#047857"
    });

    if (!confirm.isConfirmed) return;

    setIsSubmitting(true);
    setMessage({ text: "", ok: true });
    try {
      const res = await createBooking({
        date, 
        slot_id: slotId, 
        slotLabel: selectedSlot?.label,
        name: name.trim(),
        phone: cleanPhone, // ส่งเบอร์ที่คลีนแล้วไป
        lineUserId: lineUserId || "NO_LIFF",
        // ใช้เครื่องหมาย ? เพื่อป้องกัน error กรณีที่ pictureUrl ยังโหลดไม่เสร็จ
        line_picture_url: userProfile?.pictureUrl || null
      });

      if (!res.ok) throw new Error(res.message);

      setBookingCode(res.bookingCode);

      const link = process.env.NEXT_PUBLIC_LIFF_ID
        ? `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/ticket?code=${res.bookingCode}`
        : `${window.location.origin}/ticket?code=${res.bookingCode}`;

      setTicketUrl(link);
      setMessage({ text: "จองสำเร็จเรียบร้อย!", ok: true });

      // await Swal.fire({ title: "จองสำเร็จ!", icon: "success", timer: 3000, showConfirmButton: false });
      await Swal.fire({
        icon: "success",
        title: "จองคิวสำเร็จ!",
        timer: 3000,
        html: `รหัสจอง: <b class="text-emerald-600 text-xl">${res.bookingCode}</b><br/><span class="text-sm text-gray-500">กรุณาแคปหน้าจอไว้เป็นหลักฐาน</span>`,
        // timer: 5000,
        showConfirmButton: false,
        confirmButtonText: "ตกลง"
      });

    } catch (err) {
      setMessage({ text: err.message, ok: false });
      // Swal.fire("ผิดพลาด", err.message, "error");
      await Swal.fire({
        icon: "error",
        title: "ผิดพลาด!",
        timer: 2000,
        text: err.message,
        showConfirmButton: false,
        // confirmButtonText: "ตกลง"
      });
    } finally {
      setIsSubmitting(false);
    }
  };



  // --- Render UI (เหมือนของเก่าเป๊ะ) ---
  return (
    <div className="min-h-screen flex font-sans bg-stone-50 relative">
      {/* Styles & Animation */}
      <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600&display=swap');
                .font-sans { font-family: 'Prompt', sans-serif; }
                .fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; transform: translateY(20px); }
                @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob { animation: blob 7s infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
            `}</style>

      {(loadingDates || isSubmitting) && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-white/60 backdrop-blur-[2px] transition-all duration-300">
          <div className="bg-white p-6 rounded-3xl shadow-2xl border border-emerald-100 flex flex-col items-center animate-bounce-slow">
            <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
            <p className="text-emerald-800 font-semibold text-sm animate-pulse">
              {isSubmitting ? "กำลังบันทึกการจอง..." : "กำลังโหลดข้อมูล..."}
            </p>
          </div>
        </div>
      )}

      {/* Left Side: Image Banner */}
      <div className="hidden md:flex md:w-1/2 bg-emerald-800 relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=2070" alt="Thai Medicine" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay" />
        <div className="relative z-10 m-auto text-center px-10">
          <div className="mb-6 inline-block p-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
            <FiActivity className="text-white text-5xl" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-wide">คณะการแพทย์แผนไทย</h1>
          <p className="text-emerald-100 text-base md:text-lg font-light leading-relaxed">
            บริการตรวจรักษาด้วยศาสตร์การแพทย์แผนไทย<br />นวดรักษา ประคบสมุนไพร
          </p>
        </div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 sm:p-8 md:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-8 fade-in-up">

          {/* Header */}
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold text-emerald-900">ลงทะเบียนนวดรักษาอาการ</h2>
            {lineDisplayName && (
              <p className="mt-2 text-emerald-600 font-medium">สวัสดีคุณ {lineDisplayName} 👋</p>
            )}
            <p className="mt-2 text-gray-600">กรุณากรอกข้อมูลเพื่อจองคิวล่วงหน้า</p>
          </div>

          {/* Location Info */}
          <div className="bg-white border-l-4 border-emerald-500 shadow-sm rounded-r-lg p-4 flex items-start gap-3">
            <FiMapPin className="text-emerald-600 mt-1 text-lg flex shrink-0" />
            <div className="text-sm text-gray-600">
              <p className="font-semibold text-emerald-800">สถานที่ให้บริการ</p>
              <p>โรงพยาบาลแพทย์แผนไทย มหาวิทยาลัยสงขลานครินทร์ </p>
              <p> อาคารสหเวช ชั้น 7 ห้อง TTM704</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* 1. Date Select */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex justify-between">
                วันที่ร่วมกิจกรรม <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiCalendar className="text-gray-400" />
                </div>

                <select
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={loadingDates || availableDates.length === 0}
                  className="text-gray-900 placeholder:text-gray-400 block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white cursor-pointer appearance-none min-h-12.5 text-base disabled:bg-gray-100 disabled:text-gray-500"
                  required
                >
                  <option value="" className="placeholder:text-gray-800">
                    {loadingDates ? "⏳ กำลังโหลดวันที่..." : availableDates.length === 0 ? "⚠️ ยังไม่เปิดให้จอง" : "-- กรุณาเลือกวันที่ --"}
                  </option>
                  {availableDates.map((d) => (
                    <option key={d} value={d}>
                      {formatFullThaiDate(d)}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </div>
              </div>

              {/* Slot Status Alert */}
              {slotStatus.text && (
                <div className={`mt-2 text-xs md:text-sm p-3 rounded-lg flex items-center gap-2 animate-fade-in-up transition-colors duration-300 
                                    ${slotStatus.type === "loading" ? "bg-orange-50 text-orange-700 border border-orange-200" :
                    slotStatus.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                      "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                  {slotStatus.type === "loading" && <FiLoader className="animate-spin" />}
                  {slotStatus.text}
                </div>
              )}
            </div>

            {/* 2. Slot Select */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">ช่วงเวลา <span className="text-red-500">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiClock className="text-gray-400" />
                </div>
                <select
                  value={slotId}
                  onChange={(e) => setSlotId(e.target.value)}
                  disabled={!date || slotStatus.type === "loading"}
                  className="text-gray-900 placeholder:text-gray-400 block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white appearance-none transition-colors cursor-pointer disabled:bg-gray-100 disabled:text-gray-400"
                  required
                >
                  <option value="">-- กรุณาเลือกช่วงเวลา --</option>
                  {slots.map((s) => (
                    <option key={s.id} value={s.id} disabled={s.isFull} className={s.isFull ? "text-gray-400 bg-gray-50" : "text-gray-900"}>
                      {s.label} {s.isFull ? "(เต็ม)" : `(ว่าง ${s.remaining})`}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* 3. Name */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">ชื่อ–นามสกุล <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="text-gray-400" />
                  </div>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="placeholder:text-gray-400 block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white text-gray-900" placeholder="ระบุชื่อจริง" required />
                </div>
              </div>

              {/* 4. Phone */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiPhone className="text-gray-400" />
                  </div>
                  <input type="tel" value={phone}
                    // onChange={(e) => setPhone(e.target.value)} 
                    // className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white" 
                    // placeholder="08xxxxxxxx" maxLength={10} required />
                    onChange={e => {
                      // อนุญาตให้พิมพ์แค่ตัวเลข 0-9 เท่านั้น
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setPhone(val);
                    }}
                    maxLength={10} // จำกัดความยาว 10 ตัว
                    required
                    placeholder="08xxxxxxxx"
                    className="text-gray-900 placeholder:text-gray-400 block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white" />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!date || !slotId || !name || !phone || isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5"
            >
              {isSubmitting ? (
                <>
                  <FiLoader className="animate-spin text-xl" />
                  กำลังบันทึกข้อมูล...
                </>
              ) : (
                "ยืนยันการจองคิว"
              )}
            </button>
          </form>

          {/* Notification Area */}
          {message.text && (
            <div className={`rounded-lg p-4 flex items-start gap-3 text-sm animate-pulse ${message.ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
              {message.ok ? <FiCheckCircle className="mt-0.5 text-lg" /> : <FiAlertCircle className="mt-0.5 text-lg" />}
              <div className="whitespace-pre-line">{message.text}</div>
            </div>
          )}

          {/* Ticket Result (QR Code) */}
          {bookingCode && (
            <div className="mt-8 border-t-2 border-dashed border-gray-200 pt-6 flex flex-col items-center text-center fade-in-up">
              <h3 className="text-lg font-semibold text-emerald-900">ลงทะเบียนสำเร็จ</h3>
              <p className="text-gray-500 text-sm mb-4">บันทึก QR Code นี้เพื่อแสดงต่อเจ้าหน้าที่</p>
              <div className="p-3 bg-white border border-gray-200 shadow-lg rounded-xl">
                <QRCodeCanvas value={ticketUrl} size={180} level={"H"} />
              </div>
              <div className="mt-4 inline-block px-4 py-2 bg-gray-100 rounded-full">
                <span className="text-xs text-gray-500 uppercase tracking-wider font-bold mr-2">Booking ID</span>
                <span className="font-mono text-emerald-700 font-bold text-lg">{bookingCode}</span>
              </div>
            </div>
          )}

          <div className="text-center text-xs text-gray-400 mt-8">
            © {new Date().getFullYear()} คณะการแพทย์แผนไทย <br /> พัฒนาระบบโดย ทีมงานสารสนเทศ
          </div>
        </div>
      </div>
    </div>
  );
}