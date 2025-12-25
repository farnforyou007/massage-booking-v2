'use client'
import { useEffect, useMemo, useState, useRef } from "react";
import Swal from "sweetalert2";
// import { Html5QrcodeScanner } from "html5-qrcode";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import * as XLSX from 'xlsx';
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../../supabaseClient"; // เรียก Supabase

// ลบอันเดิมออก: import * as XLSX from 'xlsx';
// ใส่ชุดใหม่นี้แทน:
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toPng } from 'html-to-image'; // ✅ ใส่อันนี้แทน

import {
    adminLogin,
    adminGetBookings,
    adminGetSlotsSummary,
    adminUpdateSlotCapacity,
    adminUpdateBookingStatus,
    getBookingByCode,
    getOpenDates,
    addOpenDate,
    deleteOpenDate,
    getManageDates,
    updateDateStatus,
    addSlot,
    deleteSlot,
    updateSlot,
    adminChangePassword
} from "../../api";

import {
    FiCalendar, FiRefreshCw, FiClock,
    FiCheckCircle, FiXCircle, FiActivity, FiEdit2, FiLogOut,
    FiLayers, FiUsers, FiSearch, FiCheckSquare,
    FiCamera, FiImage, FiAlertTriangle, FiCameraOff, FiPlus, FiTrash2, FiPieChart, FiBarChart2, FiAlertCircle,
    FiLoader, FiPhone, FiLock, FiUnlock, FiCopy, FiFileText, FiUser, FiArrowDownCircle, FiArrowLeft, FiArrowRight, FiMessageSquare
} from "react-icons/fi";

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

import LoginForm from "../../components/admin/LoginForm";
import KPICards from "../../components/admin/KPICards";
import AdminCharts from "../../components/admin/AdminCharts";
import DateManager from "../../components/admin/DateManager";
import SlotManager from "../../components/admin/SlotManager";
import BookingTable from "../../components/admin/BookingTable";
import QRScanner from "../../components/admin/QRScanner";

const todayStr = () => new Date().toISOString().slice(0, 10);

const formatThaiDateAdmin = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split('-');
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: '2-digit'
    });
};

const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
    customClass: {
        title: 'my-toast-title'
    },
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
});

// ฟังก์ชันสำหรับสั่งให้บราวเซอร์พูดภาษาไทย
const speakThai = (text) => {
    if ('speechSynthesis' in window) {
        // ยกเลิกเสียงที่พูดค้างอยู่ (ถ้ามี)
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'th-TH'; // ตั้งค่าเป็นภาษาไทย
        utterance.rate = 1.0; // ความเร็วปกติ
        utterance.pitch = 1.0; // ระดับเสียงปกติ

        // สั่งให้พูด
        window.speechSynthesis.speak(utterance);
    }
};


function renderStatusBadge(status) {
    switch (status) {
        case "BOOKED":
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200"><FiClock /> รอใช้บริการ</span>;
        case "CHECKED_IN":
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200"><FiCheckCircle /> รับบริการแล้ว</span>;
        case "CANCELLED":
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200"><FiXCircle /> ยกเลิกจอง</span>;
        case 'NO_SHOW':
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200"><FiXCircle /> ไม่มาตามนัด</span>;
        default:
            return <span className="text-gray-500">-</span>;
    }
}

// ฟังก์ชันกดดูเหตุผล (No Show Reason)
const handleViewReason = (booking) => {
    Swal.fire({
        title: '📋 เหตุผลที่ไม่มาตามนัด',
        text: booking.noshow_reason || "ผู้ใช้ไม่ได้ระบุเหตุผล", // ดึงข้อมูลจาก DB
        icon: 'info',
        confirmButtonText: 'ปิด',
        confirmButtonColor: '#6B7280'
    });
};

export default function AdminPage() {
    // const [passwordInput, setPasswordInput] = useState("");
    const [authToken, setAuthToken] = useState("");
    const [date, setDate] = useState(todayStr());
    const [bookings, setBookings] = useState([]);
    const [slots, setSlots] = useState([]);
    const [manageDates, setManageDates] = useState([]);
    const [loading, setLoading] = useState(false);
    // const [loginLoading, setLoginLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("dashboard");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [newDate, setNewDate] = useState("");
    const [addingDate, setAddingDate] = useState(false);
    const [scanData, setScanData] = useState(null);
    const [manualCode, setManualCode] = useState("");
    const isProcessingScan = useRef(false);
    const isAuthed = !!authToken;
    const [showDateManager, setShowDateManager] = useState(false)
    const notificationAudio = useRef(null);
    const [viewMode, setViewMode] = useState("daily"); // "daily" หรือ "monthly"
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [serverStats, setServerStats] = useState({ total: 0, waiting: 0, checkedIn: 0, cancelled: 0 });
    const [chartRaw, setChartRaw] = useState([]); // เก็บข้อมูลดิบสำหรับกราฟ
    const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showAllDates, setShowAllDates] = useState(false);

    const [viewDate, setViewDate] = useState(new Date());


    const isFirstLoad = useRef(true);

    useEffect(() => {
        const savedToken = localStorage.getItem("admin_token");
        if (savedToken) {
            setAuthToken(savedToken);
        }
    }, []);

    useEffect(() => {
        // สร้างเตรียมไว้ตั้งแต่โหลดหน้าเว็บ
        notificationAudio.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    }, []);

    // version5 23/12/68 11.00
    // โหมดการโหลด: 'skeleton' (หมุนติ้วๆ), 'dim' (จางๆ), 'none' (เงียบกริบ)
    async function reloadData(loadingMode = 'skeleton') {
        if (!authToken) return;

        // 1. ตั้งค่าสถานะ UI ก่อนโหลด
        if (loadingMode === 'skeleton') setLoading(true);       // โหลดหนัก
        else if (loadingMode === 'dim') setIsRefreshing(true);  // โหลดเบา (จางๆ)

        // กรณี 'none' ไม่ต้องทำอะไรกับ UI (ให้ผู้ใช้กดรัวๆ ได้เลย)

        try {
            let urlBookings = "";
            let baseParams = `page=${currentPage}&limit=50&search=${encodeURIComponent(searchTerm)}`;

            if (sortConfig.key) {
                baseParams += `&sortKey=${sortConfig.key}&sortDir=${sortConfig.direction}`;
            }

            if (viewMode === "daily") {
                urlBookings = `/api/admin/bookings?date=${date}&${baseParams}`;
            } else if (viewMode === "monthly") {
                const firstDay = new Date(date); firstDay.setDate(1);
                const lastDay = new Date(date); lastDay.setMonth(lastDay.getMonth() + 1, 0);
                urlBookings = `/api/admin/bookings?startDate=${firstDay.toISOString().slice(0, 10)}&endDate=${lastDay.toISOString().slice(0, 10)}&${baseParams}`;
            } else if (viewMode === "yearly") {
                const currentYear = new Date(date).getFullYear();
                urlBookings = `/api/admin/bookings?startDate=${currentYear}-01-01&endDate=${currentYear}-12-31&${baseParams}`;
            } else {
                urlBookings = `/api/admin/bookings?${baseParams}`;
            }

            const resB = await fetch(urlBookings, { headers: { 'Authorization': `Bearer ${authToken}` } }).then(r => r.json());
            const resS = await adminGetSlotsSummary(date, authToken);

            if (resB.ok) {
                setBookings((resB.items || []).map(b => ({
                    ...b,
                    name: b.customer_name || b.name,
                    code: b.booking_code || b.code,
                    date: b.booking_date || b.date,
                    slot: b.slot_label || b.slot,
                    phone: b.phone
                })));
                setTotalRecords(resB.total || 0);

                if (resB.stats) setServerStats(resB.stats);
                if (resB.chartDataRaw) setChartRaw(resB.chartDataRaw);
            }

            if (resS && resS.items) {
                setSlots(resS.items);
            }
        } catch (err) {
            console.error("Reload Error:", err);
        } finally {
            // 2. เคลียร์สถานะ UI เมื่อเสร็จ
            setLoading(false);
            setIsRefreshing(false);
        }
    }

    // ฟังก์ชันจัดการเมื่อกดหัวตาราง
    const handleSort = (key) => {
        let direction = 'asc';

        // ถ้ากดปุ่มเดิมซ้ำ ให้สลับทิศทาง (asc -> desc -> default)
        if (sortConfig.key === key) {
            if (sortConfig.direction === 'asc') {
                direction = 'desc';
            } else if (sortConfig.direction === 'desc') {
                // ถ้ากดซ้ำอีกที ให้ยกเลิกการเรียง (กลับไปใช้ Default)
                setSortConfig({ key: null, direction: null });
                return;
            }
        }

        setSortConfig({ key, direction });
    };

    // Helper สำหรับแสดงลูกศร
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <span className="text-gray-300 ml-1 text-[10px]">↕</span>;
        return sortConfig.direction === 'asc'
            ? <span className="text-emerald-600 ml-1 text-[10px]">▲</span>
            : <span className="text-emerald-600 ml-1 text-[10px]">▼</span>;
    };

    // ✅ 1. โหลดครั้งแรกสุด (Skeleton)
    useEffect(() => {
        if (authToken && isFirstLoad.current) {
            reloadData('skeleton'); // โชว์โครงกระดูก
            isFirstLoad.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authToken]);

    // ✅ 2. เปลี่ยนวัน / โหมด / หน้า -> โหลดเงียบๆ (Background) เร็วทันใจ!
    useEffect(() => {
        if (authToken && !isFirstLoad.current) {
            // ใช้โหมด 'none' หน้าจอจะไม่กระพริบ ไม่จาง ข้อมูลจะดีดเปลี่ยนเองเมื่อเสร็จ
            reloadData('none');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode, currentPage]);

    useEffect(() => {
        if (authToken && !isFirstLoad.current) {
            // ใช้โหมด 'none' หน้าจอจะไม่กระพริบ ไม่จาง ข้อมูลจะดีดเปลี่ยนเองเมื่อเสร็จ
            reloadData('skeleton'); // เพิ่มโหลดแบบ skeleton
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date]);

    // ✅ 3. ค้นหา / เรียงลำดับ -> โหลดจางๆ (Dimmed) ให้รู้ว่ากำลังหา
    useEffect(() => {
        if (authToken && !isFirstLoad.current) {
            const delaySearch = setTimeout(() => {
                reloadData('dim'); // จางๆ เฉพาะตอนค้นหา
            }, 300);

            return () => clearTimeout(delaySearch);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, sortConfig]);
    const loadDates = () => {
        getManageDates()
            .then(res => { if (res.items) setManageDates(res.items); })
            .catch(err => console.error("Load dates error:", err));
    };

    useEffect(() => {
        if (authToken) {
            // reloadData();
            loadDates();

        }
    }, [date, authToken, viewMode, currentPage]);

    // ✅ 2. ย้าย Logic ปลดล็อกเสียงเข้ามาใน useEffect
    useEffect(() => {
        // ฟังก์ชันปลดล็อกเสียง
        const unlockAudio = () => {
            const audio = new Audio('/alert.mp3');
            audio.play().then(() => {
                audio.pause();
                audio.currentTime = 0;
            }).catch(() => { }); // ปล่อยผ่านถ้า error

            // ลบ Event ทิ้งหลังจากคลิกครั้งแรกแล้ว
            document.removeEventListener('click', unlockAudio);
        };

        // สั่งให้รอฟังการคลิก (ทำในนี้ได้ เพราะ useEffect รันบน Browser เท่านั้น)
        document.addEventListener('click', unlockAudio);

        // Cleanup function (เผื่อ component ถูกปิดไปก่อน)
        return () => {
            document.removeEventListener('click', unlockAudio);
        };
    }, []);
    // ✅ 3. ตั้งค่าการฟัง Realtime เมื่อมีการเปลี่ยนแปลงในตาราง bookings
    useEffect(() => {
        if (!authToken) return;

        const channel = supabase
            .channel('admin_realtime_with_toast')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'bookings' }, // 🔥 เปลี่ยนจาก 'INSERT' เป็น '*' (ดักทุกอย่าง)
                (payload) => {
                    console.log("มีการเปลี่ยนแปลงข้อมูล:", payload);

                    // 1. สั่งโหลดข้อมูลใหม่ทันที (ไม่ว่าจะเพิ่ม หรือ แก้ไข)
                    reloadData(true);

                    // 2. แยกประเภทการแจ้งเตือน
                    if (payload.eventType === 'INSERT') {
                        // --- กรณีจองใหม่ (Logic เดิม) ---
                        const audio = new Audio('/alert.mp3');
                        audio.play().catch(() => { });

                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'info',
                            title: `มีการจองใหม่: ${payload.new.customer_name || "ลูกค้า"}`,
                            text: `รอบเวลา: ${payload.new.slot_label || "-"}`,
                            showConfirmButton: false,
                            timer: 4000,
                            timerProgressBar: true,
                            background: '#ffffff',
                            color: '#064e3b',
                            iconColor: '#10B981',
                        });

                    } else if (payload.eventType === 'UPDATE') {
                        // --- 🔥 กรณีมีการแก้ไข (เช่น ลูกค้ากดยกเลิก) ---

                        // เช็คว่าสถานะเปลี่ยนเป็น CANCELLED หรือไม่
                        if (payload.new.status === 'CANCELLED' && payload.old.status !== 'CANCELLED') {
                            // เล่นเสียงเตือน (ถ้าต้องการ)
                            const audio = new Audio('/alert.mp3');
                            audio.play().catch(() => { });

                            Swal.fire({
                                toast: true,
                                position: 'top-end',
                                icon: 'warning', // สีเหลือง/ส้ม
                                title: `มีการยกเลิกจอง!`,
                                html: `ลูกค้า: <b>${payload.new.customer_name}</b><br>รอบ: ${payload.new.slot_label}`,
                                showConfirmButton: false,
                                timer: 5000, // โชว์นานหน่อย
                                timerProgressBar: true,
                                background: '#ffffff',
                                color: '#9f1239', // สีแดงเข้ม
                                iconColor: '#fb7185', // สีแดงอ่อน
                            });
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [authToken, viewMode, date, currentPage]);

    function handleLogout() {
        setAuthToken("");
        setBookings([]);

        // ✅ แก้ตรงนี้: ลบออกจาก localStorage
        localStorage.removeItem("admin_token");

        Toast.fire({ icon: 'success', title: 'ออกจากระบบแล้ว' });
    }

    // 🔥 FIX: แก้ไขให้ดึงค่า name/code ได้ถูกต้องตอนกดปุ่ม
    async function handleChangeStatus(booking, newStatus) {
        const actionName = newStatus === "CHECKED_IN" ? "เข้ารับบริการ" : "ยกเลิก";

        // ดึงค่าแบบกันเหนียว (ถ้าไม่มี name ให้หา customer_name)
        const targetName = booking.name || booking.customer_name || "-";
        const targetCode = booking.code || booking.booking_code || "-";
        const targetPhone = booking.phone || "-";

        const result = await Swal.fire({
            title: `ยืนยันการ${actionName}?`,
            html: `ชื่อ: <b>${targetName}</b> <br/> เบอร์โทร: <b>${targetPhone}</b> <br/> รหัส: <b>${targetCode}</b>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ยืนยัน",
            confirmButtonColor: newStatus === "CHECKED_IN" ? "#059669" : "#dc2626",
            cancelButtonText: "ยกเลิก",
        });

        if (!result.isConfirmed) return;

        Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

        try {
            // ส่ง targetCode ที่ถูกต้องไป API
            const res = await adminUpdateBookingStatus(targetCode, newStatus, authToken);
            Swal.close();

            if (!res.ok) throw new Error(res.message);

            // อัปเดตตารางโดยไม่ต้องโหลดใหม่
            setBookings(prev => prev.map(b => (b.code === targetCode || b.booking_code === targetCode) ? { ...b, status: newStatus } : b));
            // ✅ 2. อัปเดตตัวเลขในสล้อต (จัดการคิวขวามือ)
            if (newStatus === 'CANCELLED') {
                setSlots(prev => prev.map(s => s.label === booking.slot_label ? {
                    ...s,
                    booked: Math.max(0, s.booked - 1),
                    remaining: s.remaining + 1
                } : s));
            }

            // ถ้าหน้าสแกนเปิดอยู่ ก็อัปเดตด้วย
            if (scanData && (scanData.code === targetCode || scanData.booking_code === targetCode)) {
                setScanData(prev => ({ ...prev, status: newStatus }));
            }
            await reloadData(true);
            Toast.fire({ icon: 'success', title: `บันทึกสถานะเรียบร้อย` });
            // reloadData();

        } catch (err) {
            Swal.fire("Error", "บันทึกไม่สำเร็จ: " + err.message, "error");
        }
    }

    const handleAddDate = async () => {
        if (!newDate) return;
        if (manageDates.some(d => d.date === newDate)) {
            Swal.fire("ซ้ำ", "วันนี้มีอยู่ในรายการแล้วครับ", "warning");
            return;
        }
        setAddingDate(true);
        try {
            const res = await addOpenDate(newDate);
            if (res.ok) {
                const newDateObj = { date: newDate, status: "OPEN" };
                setManageDates(prev => [...prev, newDateObj].sort((a, b) => a.date.localeCompare(b.date)));
                Toast.fire({ icon: 'success', title: 'เพิ่มวันที่เรียบร้อย' });
                setNewDate("");
            } else {
                Swal.fire("แจ้งเตือน", res.message, "warning");
            }
        } catch (err) {
            Swal.fire("Error", "เชื่อมต่อไม่ได้", "error");
        } finally {
            setAddingDate(false);
        }
    };

    const handleDeleteDate = async (dateStr) => {
        const confirm = await Swal.fire({
            title: 'ปิดรับการจอง?',
            text: `ต้องการลบวันที่ ${formatThaiDateAdmin(dateStr)} ออกจากระบบ ?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ลบเลย',
            cancelButtonText: 'ยกเลิก',
            showLoaderOnConfirm: true,
            showCloseButton: true
        });

        if (confirm.isConfirmed) {
            Swal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
            try {
                const res = await deleteOpenDate(dateStr);
                Swal.close();
                if (res.ok) {
                    setManageDates(prev => prev.filter(d => d.date !== dateStr));
                    Toast.fire({ icon: 'success', title: 'ลบเรียบร้อย' });
                } else {
                    throw new Error(res.message);
                }
            } catch (err) { Swal.fire("Error", "ลบไม่ได้: " + err.message, "error"); }
        }
    };

    const handleToggleStatus = async (dateObj) => {
        const newStatus = dateObj.status === "OPEN" ? "CLOSED" : "OPEN";
        setManageDates(prev => prev.map(d => d.date === dateObj.date ? { ...d, status: newStatus } : d));
        try {
            const res = await updateDateStatus(dateObj.date, newStatus);
            if (!res.ok) throw new Error(res.message);
        } catch (err) {
            setManageDates(prev => prev.map(d => d.date === dateObj.date ? { ...d, status: dateObj.status } : d));
            Swal.fire("Error", "เปลี่ยนสถานะไม่ได้: " + err.message, "error");
        }
    };

    const filteredBookings = useMemo(() => {
        return bookings.filter(b => {
            // 1. กรองสถานะ (ทำงานสัมพันธ์กับ Dropdown)
            const matchStatus = filterStatus === "ALL" || b.status === filterStatus;

            // 2. (เผื่อไว้) กรองคำค้นหาด้วย เพื่อความชัวร์ว่า Client ตัดออกให้ทันที
            // ถึงแม้ Server จะกรองมาให้แล้ว แต่ใส่ไว้กันเหนียวครับ
            const searchLower = searchTerm.trim().toLowerCase();
            const name = (b.name || b.customer_name || "").toLowerCase();
            const code = (b.code || b.booking_code || "").toLowerCase();
            const phone = (b.phone || "");

            const matchSearch = !searchLower ||
                name.includes(searchLower) ||
                code.includes(searchLower) ||
                phone.includes(searchLower);

            return matchStatus && matchSearch;
        });
    }, [bookings, filterStatus, searchTerm]);

    const chartData = useMemo(() => {
        if (!chartRaw || chartRaw.length === 0) return [];

        const stats = {};

        chartRaw.forEach(b => {
            // ⚠️ สำคัญ: ต้องลบบรรทัดนี้ออก เพื่อให้นับยอด "ยกเลิก" เข้ามาแสดงด้วย
            // if (b.status === "CANCELLED") return; 

            let key = "";
            let sortKey = 0;
            const d = new Date(b.booking_date);

            // --- Logic การสร้าง Key (เหมือนเดิม) ---
            if (viewMode === "daily") {
                key = b.slot_label || "ไม่ระบุ";
                sortKey = b.slot_id || parseInt(key.replace(":", "")) || 0;
            } else if (viewMode === "monthly") {
                key = d.getDate();
                sortKey = d.getDate();
            } else if (viewMode === "yearly") {
                const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
                key = thaiMonths[d.getMonth()];
                sortKey = d.getMonth();
            } else {
                const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
                const yearThai = d.getFullYear() + 543;
                key = `${thaiMonths[d.getMonth()]} ${yearThai.toString().slice(-2)}`;
                sortKey = (d.getFullYear() * 100) + d.getMonth();
            }

            // --- 🔥 จุดที่เปลี่ยน: เตรียม Object สำหรับเก็บแยกสถานะ ---
            if (!stats[key]) {
                stats[key] = {
                    name: key,
                    sort: sortKey,
                    BOOKED: 0,      // รอรับบริการ
                    CHECKED_IN: 0,  // เช็คอินแล้ว
                    CANCELLED: 0,   // ยกเลิก
                    NO_SHOW: 0    // ไม่มา
                };
            }

            // บวกเลขตามสถานะของรายการนั้นๆ
            if (stats[key][b.status] !== undefined) {
                stats[key][b.status] += 1;
            }
        });

        // ส่งคืนค่าและเรียงลำดับ
        return Object.values(stats).sort((a, b) => a.sort - b.sort);

    }, [chartRaw, viewMode]);

    const pieData = useMemo(() => {
        // ดึงค่าจาก serverStats ซึ่งเป็นยอดรวมทั้งหมดที่แท้จริง
        const waiting = serverStats.waiting || 0;
        const checkedIn = serverStats.checkedIn || 0;
        const cancelled = serverStats.cancelled || 0;
        const noShow = serverStats.noShow || 0;
        return [
            { name: 'รอใช้บริการ', value: waiting, color: '#EAB308' },
            { name: 'รับบริการแล้ว', value: checkedIn, color: '#10B981' },
            { name: 'ยกเลิกการจอง', value: cancelled, color: '#EF4444' },
            { name: 'ไม่มาตามนัด', value: noShow, color: '#6B7280' }
        ].filter(i => i.value > 0); // ซ่อนอันที่มีค่าเป็น 0
    }, [serverStats]);

    const kpiStats = useMemo(() => {
        return {
            total: serverStats.total || 0,
            checkedIn: serverStats.checkedIn || 0,
            cancelled: serverStats.cancelled || 0,
            waiting: serverStats.waiting || 0,
            noShow: serverStats.noShow || 0
        };
    }, [serverStats]);

    const handleScanSuccess = async (decodedText, isAutoCheckIn = true) => {
        if (isProcessingScan.current) return;
        isProcessingScan.current = true;

        let finalCode = decodedText;
        try { const url = new URL(decodedText); const c = url.searchParams.get("code"); if (c) finalCode = c; } catch (e) { }

        // --- 1. โหมด Manual ---
        // if (!autoCheckIn) {
        if (!isAutoCheckIn) {
            // setCameraEnabled(false);
            Swal.fire({ title: 'กำลังค้นหา...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
            try {
                const res = await getBookingByCode(finalCode);
                Swal.close();
                if (res.ok && res.booking) {
                    const b = res.booking;

                    // 🔥 แก้ไขการเช็ควันที่ (ตัดเวลาทิ้ง เอาแค่ 10 ตัวแรก YYYY-MM-DD)
                    const rawDate = b.booking_date || b.date || "";
                    const targetDate = rawDate.split('T')[0]; // ตัดเวลาทิ้งถ้ามี
                    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

                    if (targetDate !== today) {
                        await Swal.fire({
                            icon: 'warning',
                            title: 'ผิดวัน!',
                            html: `รายการนี้เป็นของวันที่ <b>${formatThaiDateAdmin(targetDate)}</b><br/>(แต่วันนี้คือ ${formatThaiDateAdmin(today)})`,
                            confirmButtonText: 'เข้าใจแล้ว' // Manual ให้แอดมินกดรับทราบ แต่ยังทำงานต่อได้
                        });
                    }

                    setScanData({
                        ...b,
                        name: b.customer_name || b.name,
                        code: b.booking_code || b.code,
                        slot: b.slot_label || b.slot,
                        date: targetDate,
                        line_picture_url: b.line_picture_url || null
                    });
                } else {
                    Swal.fire({ icon: "error", title: "ไม่พบข้อมูล", text: `รหัส: ${finalCode}`, timer: 2000, showConfirmButton: false });
                }
            } catch (err) { Swal.fire("Error", err.message, "error"); }

            setTimeout(() => { isProcessingScan.current = false; }, 500);
            return;
        }
        // --- 2. โหมด Auto Check-in ---
        try {
            const res = await getBookingByCode(finalCode);

            if (res.ok && res.booking) {
                const b = res.booking;
                const customerName = b.customer_name || b.name || "ลูกค้า";
                const slotLabel = b.slot_label || b.slot || "-";
                const bookingCode = b.booking_code || b.code;

                // 🔥 แก้ไขการเช็ควันที่ (ตัดเวลาทิ้งเช่นกัน)
                const rawDate = b.booking_date || b.date || "";
                const targetDate = rawDate.split('T')[0]; // เอาแค่ YYYY-MM-DD
                const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

                // Debug ดูค่าจริง (กด F12 ดูใน Console ได้ถ้ายังผิด)
                console.log(`Checking Date: DB=${targetDate} vs Today=${today}`);

                if (targetDate !== today) {
                    await Swal.fire({
                        icon: 'error',
                        title: 'คุณไม่ได้ลงทะเบียนสำหรับวันนี้',
                        html: `คิวนี้เป็นของวันที่<br/><b style="font-size:1.2em; color:#ef4444;">${formatThaiDateAdmin(targetDate)}</b>`,
                        timer: 4000,
                        showConfirmButton: false,
                        backdrop: `rgba(0,0,0,0.5)`
                    });
                    return; // ❌ จบการทำงานทันที
                }

                // ถ้าวันที่ตรงกันเป๊ะ ค่อยทำต่อ...
                if (b.status === 'BOOKED') {
                    const updateRes = await adminUpdateBookingStatus(bookingCode, "CHECKED_IN", authToken);

                    // --- ส่วนคำนวณเวลา (แบบละเอียด: นับนาที) ---
                    let timeStatus = "";
                    try {
                        // 1. ดึงเวลาเริ่มจอง (เช่น "14:45-16:15" -> เอาแค่ "14:45")
                        const timeParts = slotLabel.split('-')[0].trim().split(':');
                        const bookH = parseInt(timeParts[0]);
                        const bookM = parseInt(timeParts[1]);

                        // 2. สร้างตัวแปรเวลาเพื่อเปรียบเทียบ
                        const now = new Date();
                        const bookingTime = new Date();
                        bookingTime.setHours(bookH, bookM, 0, 0); // ตั้งเวลาเป็นเวลาจอง (วันนี้)

                        // 3. หาผลต่างเป็นนาที (ลบกันจะได้ millisecond -> หาร 60000 เพื่อเป็นนาที)
                        // ค่า + แปลว่ามาช้า, ค่า - แปลว่ามาก่อน
                        const diffMinutes = Math.floor((now - bookingTime) / 60000);

                        // 4. กำหนดเงื่อนไข (ปรับตัวเลขนาทีได้ตามใจชอบ)
                        if (diffMinutes > 15) {
                            // มาช้ากว่า 15 นาที
                            timeStatus = `<span class="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-md">มาสาย (${diffMinutes} นาที)</span>`;
                        } else if (diffMinutes < -30) {
                            // มาก่อนเวลาเกิน 30 นาที
                            timeStatus = `<span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md">มาก่อนเวลา (${Math.abs(diffMinutes)} นาที)</span>`;
                        } else {
                            // อยู่ในช่วง -30 ถึง +15 นาที
                            timeStatus = `<span class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md">ตรงเวลา</span>`;
                        }
                    } catch (e) {
                        console.error("Time calc error", e);
                        timeStatus = ""; // ถ้าคำนวณไม่ได้ ก็ไม่ต้องโชว์
                    }
                    // --------------------------------
                    // --------------------------------
                    if (updateRes.ok) {
                        // เช็คว่ามีฟังก์ชัน speakThai หรือยัง (ถ้าไม่มีให้ก๊อปจากข้างล่างไปใส่)
                        const audio = new Audio('/welcome.mp3');
                        audio.play().catch(() => { });

                        // speakThai(`คุณ ${customerName} ยืนยันสำเร็จ`);
                        await Swal.fire({
                            icon: 'success',
                            title: 'ตรวจสอบเรียบร้อย!',
                            html: `
                                <div class="flex flex-col items-center">
                                    <img src="${b.line_picture_url || '/user.png'}" 
                                        style="width:80px; height:80px; border-radius:50%; margin-bottom:10px; object-fit:cover; border: 3px solid #10B981;">
                                    <div class="text-xl font-bold text-emerald-700">คุณ ${customerName} </div>
                                    <div class="text-lg text-gray-500 mt-1">${slotLabel}</div>
                                    <div class="text-sm font-bold text-gray-700 mt-2"> ${timeStatus} นาที</div>
                                </div>
                            `,
                            timer: 3000,
                            showConfirmButton: false,
                            backdrop: `rgba(0,0,0,0.5)`
                        });
                        await reloadData('none');
                    } else {
                        await Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'บันทึกสถานะไม่สำเร็จ' });
                    }
                } else if (b.status === 'CHECKED_IN') {
                    const audio = new Audio('/checkin.mp3');
                    audio.play().catch(() => { });
                    await Swal.fire({ icon: 'info', title: 'เช็คอินไปแล้ว', html: `คุณ <b>${customerName}</b><br/>ลงทะเบียนเรียบร้อยแล้วครับ`, timer: 2000, showConfirmButton: false });
                } else {
                    const audio = new Audio('/cancle.mp3');
                    audio.play().catch(() => { });
                    await Swal.fire({ icon: 'warning', title: 'รายการถูกยกเลิก', text: `สถานะ: ${b.status}`, timer: 3000, showConfirmButton: false });
                }
            } else {
                const audio = new Audio('/nobooking.mp3');
                audio.play().catch(() => { });
                await Swal.fire({ icon: 'error', title: 'ไม่พบรหัสจองนี้', text: finalCode, timer: 1500, showConfirmButton: false });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setTimeout(() => { isProcessingScan.current = false; }, 1500);
        }
    };

    const handleConfirmCheckIn = () => handleChangeStatus(scanData, "CHECKED_IN");
    const handleResetScan = () => { setScanData(null); setManualCode(""); };

    // --- ฟังก์ชันจัดการคิว (ใหม่) ---
    const handleAddSlot = async () => {
        await Swal.fire({
            title: 'เพิ่มรอบเวลาใหม่',
            html: `
            <div class="swal-form-container">
                <div class="input-group">
                    <label>ช่วงเวลา</label>
                    <div class="input-wrapper">
                        <input id="swal-input-label" class="swal2-input custom-input" placeholder="เช่น 09:00-10:00">
                        <div id="label-icon" class="status-icon-box"></div>
                    </div>
                </div>
                
                <div class="input-group">
                    <label>จำนวนที่รับ (คน)</label>
                    <div class="input-wrapper">
                        <input id="swal-input-cap" class="swal2-input custom-input" type="number" placeholder="5">
                        <div id="cap-icon" class="status-icon-box"></div>
                    </div>
                </div>
            </div>
            
            <style>
                .swal-form-container { margin-top: 15px; }
                .input-group { display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 15px; width: 100%; }
                .input-group label { font-size: 13px; font-weight: 500; color: #4b5563; margin-bottom: 6px; margin-left: 4px; }
                .input-wrapper { position: relative; width: 100%; }
                .custom-input {
                    height: 42px !important; margin: 0 !important; width: 100% !important;
                    font-size: 14px !important; border-radius: 10px !important;
                    border: 1px solid #e5e7eb !important; transition: all 0.2s !important;
                    padding-right: 40px !important;
                }
                .input-error { border-color: #f43f5e !important; background-color: #fff1f2 !important; }
                .status-icon-box {
                    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
                    width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
                    border-radius: 50%; transition: all 0.3s ease;
                }
                .icon-success { background-color: #d1fae5; color: #059669; }
                .icon-error { background-color: #ffe4e6; color: #e11d48; }
                .swal2-validation-message {
                    background: transparent !important; color: #e11d48 !important;
                    font-size: 11px !important; margin-top: 10px !important; border: none !important;
                    justify-content: center !important; padding: 0 !important;
                }
                .swal2-icon { width: 40px !important; height: 40px !important; margin: 10px auto !important; }
                .swal2-icon .swal2-icon-content { font-size: 24px !important; }
                .input-group label { 
                font-size: 15px; /* 🔥 เดิมเป็น 13px ลองปรับเป็น 15px หรือ 16px ตามใจชอบ */
                font-weight: 600; /* หากต้องการให้ตัวหนาขึ้นอีก เปลี่ยนจาก 500 เป็น 600 */
                color: #4b5563; 
                margin-bottom: 6px; 
                margin-left: 4px; 
            }
                .input-group { 
                display: flex; 
                flex-direction: column; 
                align-items: flex-start; 
                margin-bottom: 20px; /* 🔥 เดิมเป็น 15px เพิ่มเป็น 20px เพื่อไม่ให้แต่ละช่องเบียดกัน */
                width: 100%; 
            }
            </style>
        `,
            didOpen: () => {
                const labelInput = document.getElementById('swal-input-label');
                const capInput = document.getElementById('swal-input-cap');
                const checkIcon = `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" height="12" width="12"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;

                const validate = (el, iconId) => {
                    const iconBox = document.getElementById(iconId);
                    if (el.value.trim()) {
                        el.classList.remove('input-error');
                        iconBox.className = 'status-icon-box icon-success';
                        iconBox.innerHTML = checkIcon;
                    } else {
                        iconBox.innerHTML = '';
                        iconBox.className = 'status-icon-box';
                    }
                };

                labelInput.addEventListener('input', () => validate(labelInput, 'label-icon'));
                capInput.addEventListener('input', () => validate(capInput, 'cap-icon'));

                const handleEnter = (e) => {
                    if (e.key === 'Enter') Swal.clickConfirm();
                };
                labelInput.addEventListener('keydown', handleEnter);
                capInput.addEventListener('keydown', handleEnter);
            },
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            confirmButtonColor: '#059669',
            cancelButtonText: 'ยกเลิก',
            showLoaderOnConfirm: true,
            showCloseButton: true,
            preConfirm: async () => {
                const label = document.getElementById('swal-input-label').value;
                const capacity = document.getElementById('swal-input-cap').value;

                if (!label) {
                    document.getElementById('swal-input-label').classList.add('input-error');
                    return Swal.showValidationMessage('กรุณากรอกช่วงเวลา');
                }
                if (!capacity || capacity <= 0) {
                    document.getElementById('swal-input-cap').classList.add('input-error');
                    return Swal.showValidationMessage('กรุณากรอกจำนวนที่รับให้ถูกต้อง');
                }

                try {
                    const res = await addSlot(label, parseInt(capacity));
                    if (!res.ok) throw new Error(res.message);
                    return res;
                } catch (err) {
                    return Swal.showValidationMessage(err.message || 'เกิดข้อผิดพลาดในการบันทึก');
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Toast.fire({ icon: 'success', title: 'เพิ่มรอบเรียบร้อย' });
                reloadData('none');
            }
        });
    };

    const handleEditSlotFull = async (slot) => {
        await Swal.fire({
            title: 'แก้ไขรอบเวลา',
            html: `
            <div class="swal-form-container">
                <div class="input-group">
                    <label>ช่วงเวลา</label>
                    <div class="input-wrapper">
                        <input id="swal-edit-label" class="swal2-input custom-input" value="${slot.label}">
                        <div id="edit-label-icon" class="status-icon-box icon-success">
                            <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" height="12" width="12"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        </div>
                    </div>
                </div>
                
                <div class="input-group">
                    <label>จำนวนที่รับ (คน)</label>
                    <div class="input-wrapper">
                        <input id="swal-edit-cap" class="swal2-input custom-input" type="number" value="${slot.capacity}">
                        <div id="edit-cap-icon" class="status-icon-box icon-success">
                            <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" height="12" width="12"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                .swal-form-container { margin-top: 15px; }
                .input-group { display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 15px; width: 100%; }
                .input-group label { font-size: 13px; font-weight: 500; color: #4b5563; margin-bottom: 6px; margin-left: 4px; }
                .input-wrapper { position: relative; width: 100%; }
                .custom-input {
                    height: 42px !important; margin: 0 !important; width: 100% !important;
                    font-size: 14px !important; border-radius: 10px !important;
                    border: 1px solid #e5e7eb !important; transition: all 0.2s !important;
                    padding-right: 40px !important;
                }
                .input-error { border-color: #f43f5e !important; background-color: #fff1f2 !important; }
                .status-icon-box {
                    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
                    width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
                    border-radius: 50%; transition: all 0.3s ease;
                }
                .icon-success { background-color: #d1fae5; color: #059669; }
                .swal2-validation-message {
                    background: transparent !important; color: #e11d48 !important;
                    font-size: 11px !important; margin-top: 10px !important; border: none !important;
                }
                    .input-group label { 
                font-size: 15px; /* 🔥 เดิมเป็น 13px ลองปรับเป็น 15px หรือ 16px ตามใจชอบ */
                font-weight: 600; /* หากต้องการให้ตัวหนาขึ้นอีก เปลี่ยนจาก 500 เป็น 600 */
                color: #4b5563; 
                margin-bottom: 6px; 
                margin-left: 4px; 
            }
                .input-group { 
                display: flex; 
                flex-direction: column; 
                align-items: flex-start; 
                margin-bottom: 20px; /* 🔥 เดิมเป็น 15px เพิ่มเป็น 20px เพื่อไม่ให้แต่ละช่องเบียดกัน */
                width: 100%; 
            }
            </style>
        `,
            showCancelButton: true,
            confirmButtonText: 'บันทึกการแก้ไข',
            confirmButtonColor: '#059669',
            showLoaderOnConfirm: true,
            showCloseButton: true,
            cancelButtonText: 'ยกเลิก',
            didOpen: () => {
                // 🔥 เพิ่ม didOpen เพื่อดักจับ Enter
                const labelInput = document.getElementById('swal-edit-label');
                const capInput = document.getElementById('swal-edit-cap');

                const handleEnter = (e) => {
                    if (e.key === 'Enter') Swal.clickConfirm();
                };
                labelInput.addEventListener('keydown', handleEnter);
                capInput.addEventListener('keydown', handleEnter);
            },
            preConfirm: async () => {
                const newLabel = document.getElementById('swal-edit-label').value;
                const newCap = document.getElementById('swal-edit-cap').value;

                if (!newLabel) return Swal.showValidationMessage('กรุณากรอกช่วงเวลา');
                if (!newCap || newCap <= 0) return Swal.showValidationMessage('กรุณากรอกจำนวนที่รับให้ถูกต้อง');

                try {
                    const res = await updateSlot(slot.id, newLabel, parseInt(newCap));
                    if (!res.ok) throw new Error(res.message);
                    return res;
                } catch (err) {
                    return Swal.showValidationMessage(err.message || 'เกิดข้อผิดพลาด');
                }
            }


        }).then((result) => {
            if (result.isConfirmed) {
                Toast.fire({ icon: 'success', title: 'แก้ไขเรียบร้อย' });
                reloadData('none');
            }
        });
    };

    // 3. ลบรอบเวลา
    const handleDeleteSlot = async (slot) => {
        const result = await Swal.fire({
            title: 'ลบรอบเวลานี้ ?',
            text: `ต้องการลบรอบ" ${slot.label} " ออกจากระบบ?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ลบเลย',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            Swal.fire({ title: 'กำลังลบ...', didOpen: () => Swal.showLoading() });
            try {
                const res = await deleteSlot(slot.id); // เรียก API
                Swal.close();
                if (res.ok) {
                    Toast.fire({ icon: 'success', title: 'ลบเรียบร้อย' });
                    reloadData('none');
                } else {
                    throw new Error(res.message);
                }
            } catch (err) { Swal.fire("Error", err.message, "error"); }
        }
    };

    const handleChangePassword = async () => {
        await Swal.fire({
            title: 'เปลี่ยนรหัสผ่าน',
            html: `
            <div class="swal-form-container">
                <div class="input-group">
                    <label>รหัสผ่านปัจจุบัน</label>
                    <div class="input-wrapper">
                        <input id="current-pw" class="swal2-input custom-input" type="password" placeholder="••••••••">
                    </div>
                </div>
                
                <div class="input-group">
                    <label>รหัสผ่านใหม่</label>
                    <div class="input-wrapper">
                        <input id="new-pw" class="swal2-input custom-input" type="password" placeholder="6 ตัวขึ้นไป">
                    </div>
                </div>
                
                <div class="input-group">
                    <label>ยืนยันรหัสใหม่</label>
                    <div class="input-wrapper">
                        <input id="confirm-pw" class="swal2-input custom-input" type="password" placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง">
                        <div id="match-icon-container" class="status-icon-box"></div>
                    </div>
                </div>
            </div>
            
            <style>
                .swal-form-container { margin-top: 15px; }
                .input-group { display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 15px; width: 100%; }
                .input-group label { font-size: 13px; font-weight: 500; color: #4b5563; margin-bottom: 6px; margin-left: 4px; }
                .input-wrapper { position: relative; width: 100%; }
                .input-group label { 
                font-size: 15px; /* 🔥 เดิมเป็น 13px ลองปรับเป็น 15px หรือ 16px ตามใจชอบ */
                font-weight: 600; /* หากต้องการให้ตัวหนาขึ้นอีก เปลี่ยนจาก 500 เป็น 600 */
                color: #4b5563; 
                margin-bottom: 6px; 
                margin-left: 4px; 
            }
                .input-group { 
                display: flex; 
                flex-direction: column; 
                align-items: flex-start; 
                margin-bottom: 20px; /* 🔥 เดิมเป็น 15px เพิ่มเป็น 20px เพื่อไม่ให้แต่ละช่องเบียดกัน */
                width: 100%; 
            }
    
                .custom-input {
                    height: 42px !important; margin: 0 !important; width: 100% !important;
                    font-size: 14px !important; border-radius: 10px !important;
                    border: 1px solid #e5e7eb !important; transition: all 0.2s !important;
                    padding-right: 40px !important;
                }

                /* สไตล์เมื่อเกิด Error (กรอบแดง) */
                .input-error { border-color: #f43f5e !important; background-color: #fff1f2 !important; }

                /* คอนเทนเนอร์ไอคอนสไตล์ KPI */
                .status-icon-box {
                    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
                    width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
                    border-radius: 50%; transition: all 0.3s ease;
                }

                /* สีไอคอนกรณีผ่าน (เข้ารับบริการ- Emerald) */
                .icon-success { background-color: #d1fae5; color: #059669; }
                
                /* สีไอคอนกรณีผิด (ยกเลิก - Rose) */
                .icon-error { background-color: #ffe4e6; color: #e11d48; }

                .swal2-validation-message {
                    background: transparent !important; color: #e11d48 !important;
                    font-size: 12px !important; margin-top: 10px !important; border: none !important;
                }
            </style>
        `,
            didOpen: () => {
                const newPw = document.getElementById('new-pw');
                const confirm = document.getElementById('confirm-pw');
                const iconBox = document.getElementById('match-icon-container');

                // SVG Icons (หน้าตาเดียวกับ FiCheckCircle และ FiXCircle)
                const checkIcon = `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" height="14" width="14"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
                const crossIcon = `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" height="14" width="14"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;

                const validate = () => {
                    const val1 = newPw.value;
                    const val2 = confirm.value;

                    if (val2 && val1 !== val2) {
                        confirm.classList.add('input-error');
                        iconBox.className = 'status-icon-box icon-error';
                        iconBox.innerHTML = crossIcon;
                    } else if (val2 && val1 === val2) {
                        confirm.classList.remove('input-error');
                        iconBox.className = 'status-icon-box icon-success';
                        iconBox.innerHTML = checkIcon;
                    } else {
                        confirm.classList.remove('input-error');
                        iconBox.innerHTML = '';
                        iconBox.className = 'status-icon-box';
                    }
                };
                const handleEnter = (e) => {
                    if (e.key === 'Enter') Swal.clickConfirm();
                };
                // ดักจับทั้ง 3 ช่องเลย
                document.getElementById('current-pw').addEventListener('keydown', handleEnter);
                newPw.addEventListener('keydown', handleEnter);
                confirm.addEventListener('keydown', handleEnter);
                newPw.addEventListener('input', validate);
                confirm.addEventListener('input', validate);
            },
            preConfirm: async () => {
                const current = document.getElementById('current-pw').value;
                const newPw = document.getElementById('new-pw').value;
                const confirm = document.getElementById('confirm-pw').value;

                if (!current) {
                    document.getElementById('current-pw').classList.add('input-error');
                    return Swal.showValidationMessage('กรุณากรอกรหัสผ่านปัจจุบัน');
                }
                if (newPw.length < 6) return Swal.showValidationMessage('รหัสผ่านใหม่ต้องมี 6 ตัวขึ้นไป');
                if (newPw !== confirm) return Swal.showValidationMessage('รหัสผ่านใหม่กับยืนยันไม่ตรงกัน');

                try {
                    const res = await adminChangePassword(current, newPw);
                    if (!res.ok) {
                        document.getElementById('current-pw').classList.add('input-error');
                        return Swal.showValidationMessage(res.message || 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
                    }
                    return res;
                } catch (error) {
                    return Swal.showValidationMessage('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
                }

            },
            // ... (ปุ่มกดยืนยันสี emerald-600 เหมือนเดิม)
            confirmButtonColor: '#059669',
            confirmButtonText: 'อัปเดตรหัสผ่าน',
            showLoaderOnConfirm: true,
            showCloseButton: true,
            cancelButtonText: 'ยกเลิก',
            showCancelButton: true
        }).then((result) => {
            if (result.isConfirmed) {
                Toast.fire({ icon: 'success', title: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
            }
        });
    };

    const handleForgotPassword = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'กู้คืนรหัสผ่าน เจ้าหน้าที่',
            // icon: 'info',
            html: `
            <div class="swal-form-container">
                <div class="text-[12px] text-gray-500 mb-4 text-center">
                    ติดต่อฝ่ายสารสนเทศ หรือ กู้คืนด้วย Master Key
                </div>

                <div class="input-group">
                    <label>Master Recovery Key</label>
                    <input id="recovery-key" class="swal2-input custom-input" type="text" placeholder="กรอกรหัสยืนยัน 16 หลัก">
                </div>
                <hr class="my-4 border-dashed border-gray-200">
                <div class="input-group">
                    <label>รหัสผ่านใหม่</label>
                    <input id="reset-new-pw" class="swal2-input custom-input" type="password" placeholder="6 ตัวขึ้นไป">
                </div>
            </div>
            
            <style>
                .custom-input { 
                    height: 42px !important; 
                    margin: 0 !important; 
                    width: 100% !important; 
                    border-radius: 10px !important; 
                    font-size: 14px !important; 
                    border: 1px solid #e5e7eb !important; 
                }
                .input-group { 
                    display: flex; 
                    flex-direction: column; 
                    align-items: flex-start; 
                    margin-bottom: 10px; 
                    width: 100%; 
                }
                .input-group label { 
                    font-size: 15px; 
                    font-weight: 500; 
                    color: #4b5563; 
                    margin-bottom: 5px; 
                }

                
                .swal2-validation-message {
                    background: transparent !important; 
                    color: #e11d48 !important;   
                    font-size: 12px !important;         
                    border: none !important;         
                    box-shadow: none !important;        
                    margin-top: 10px !important;
                    justify-content: center !important;
                }
                .swal2-icon {
                    width: 40px !important;   
                    height: 40px !important;   
                    // margin: 20px auto !important; 
                    // margin-top: 10px !important;
                    margin-bottom: 10px !important;
                }

                .swal2-icon .swal2-icon-content {
                    font-size: 24px !important; 
                }
                // .swal2-title {
                //     font-size: 32px !important;
                //     font-weight: 600 !important;
                // }
                
            </style>
        `,
            showCancelButton: true,
            confirmButtonText: 'ยืนยันเปลี่ยนรหัส',
            confirmButtonColor: '#059669', // สีเขียว Emerald
            cancelButtonText: 'ยกเลิก',
            showLoaderOnConfirm: true,
            didOpen: () => {
                // 🔥 เพิ่มดักจับ Enter
                const recoveryInput = document.getElementById('recovery-key');
                const newPwInput = document.getElementById('reset-new-pw');

                const handleEnter = (e) => {
                    if (e.key === 'Enter') Swal.clickConfirm();
                };
                recoveryInput.addEventListener('keydown', handleEnter);
                newPwInput.addEventListener('keydown', handleEnter);
            },
            preConfirm: async () => {
                const recoveryKey = document.getElementById('recovery-key').value;
                const newPw = document.getElementById('reset-new-pw').value;

                if (!recoveryKey || !newPw) return Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบ');
                if (newPw.length < 6) return Swal.showValidationMessage('รหัสใหม่ต้องมี 6 ตัวขึ้นไป');

                try {
                    // เราจะสร้าง API ใหม่ชื่อ reset-password
                    const res = await fetch('/api/admin/reset-password', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ recoveryKey, newPw })
                    });
                    const data = await res.json();
                    if (!data.ok) return Swal.showValidationMessage(data.message || 'Recovery Key ไม่ถูกต้อง');
                    return data;
                } catch (error) {
                    return Swal.showValidationMessage('การเชื่อมต่อล้มเหลว');
                }
            }
        });

        if (formValues) {
            Toast.fire({ icon: 'success', title: 'เปลี่ยนรหัสผ่านใหม่เรียบร้อย!' });
        }
    };

    const handleCopy = (text, label) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        Toast.fire({
            icon: 'success',
            title: `คัดลอก ${text} เรียบร้อยแล้ว`,
            timer: 1500,

        });

    };

    // Helper: จัดรูปแบบเบอร์โทร (08x-xxx-xxxx)
    const formatPhoneForExcel = (phone) => {
        if (!phone) return "-";
        const clean = phone.replace(/[^0-9]/g, "");
        if (clean.length === 10) {
            return `${clean.substring(0, 3)}-${clean.substring(3, 6)}-${clean.substring(6, 10)}`;
        }
        return phone;
    };

    const handleExportExcel = async () => {
        if (totalRecords === 0) {
            return Swal.fire("แจ้งเตือน", "ไม่มีข้อมูลสำหรับการส่งออก", "warning");
        }

        Swal.fire({
            title: 'กำลังสร้างรายงาน...',
            html: 'กำลังคำนวณสถิติและจัดรูปแบบ Excel<br/>กรุณารอสักครู่',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            // ---------------------------------------------------------
            // 1. เตรียม URL และ หัวข้อรายงาน (Dynamic Title)
            // ---------------------------------------------------------
            let exportUrl = "";
            let reportTitle = "";
            const d = new Date(date);
            const thaiMonth = d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
            const thaiDate = d.toLocaleDateString('th-TH', { dateStyle: 'long' });

            if (viewMode === "daily") {
                exportUrl = `/api/admin/bookings?date=${date}&limit=10000`;
                reportTitle = `รายงานสรุปการจองรายวัน : ${thaiDate}`;
            } else if (viewMode === "monthly") {
                const firstDay = new Date(date); firstDay.setDate(1);
                const lastDay = new Date(date); lastDay.setMonth(lastDay.getMonth() + 1, 0);
                exportUrl = `/api/admin/bookings?startDate=${firstDay.toISOString().slice(0, 10)}&endDate=${lastDay.toISOString().slice(0, 10)}&limit=10000`;
                reportTitle = `รายงานสรุปการจองรายเดือน : ${thaiMonth}`;
            } else if (viewMode === "yearly") {
                const currentYear = new Date(date).getFullYear();
                exportUrl = `/api/admin/bookings?startDate=${currentYear}-01-01&endDate=${currentYear}-12-31&limit=10000`;
                reportTitle = `รายงานสรุปการจองรายปี : ${currentYear + 543}`;
            } else {
                exportUrl = `/api/admin/bookings?limit=10000`;
                reportTitle = `รายงานสรุปการจองทั้งหมด (ภาพรวม)`;
            }

            // ---------------------------------------------------------
            // 2. ดึงข้อมูลจาก API
            // ---------------------------------------------------------
            const res = await fetch(exportUrl, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }).then(r => r.json());

            if (!res.ok) throw new Error(res.message);
            const allData = res.items || []; // ข้อมูลดิบ

            // ---------------------------------------------------------
            // 3. คำนวณ KPI และ %
            // ---------------------------------------------------------
            const total = allData.length;
            const stats = {
                checkedIn: allData.filter(b => b.status === 'CHECKED_IN').length,
                booked: allData.filter(b => b.status === 'BOOKED').length,
                cancelled: allData.filter(b => b.status === 'CANCELLED').length,
                noShow: allData.filter(b => b.status === 'NO_SHOW').length
            };

            // สูตรคำนวณ % (กันหารด้วย 0)
            const getPercent = (val) => total > 0 ? ((val / total) * 100).toFixed(1) + '%' : '0.0%';

            // ---------------------------------------------------------
            // 4. เริ่มสร้าง Excel (Layout & Design)
            // ---------------------------------------------------------
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Report', {
                views: [{ showGridLines: false }] // ซ่อนเส้น Grid พื้นหลังเพื่อให้ดูสะอาดตา
            });

            // --- ส่วนที่ 1: หัวข้อรายงาน (Title) ---
            worksheet.mergeCells('A1:L1'); // รวมเซลล์ยาวๆ
            const titleCell = worksheet.getCell('A1');
            titleCell.value = reportTitle;
            titleCell.font = { name: 'Sarabun', size: 18, bold: true, color: { argb: 'FFFFFFFF' } }; // ขาว
            titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
            titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } }; // เขียวเข้ม
            worksheet.getRow(1).height = 35;

            // --- ส่วนที่ 2: ตาราง KPI (ด้านซ้าย) ---
            // 1. Header KPI
            const kpiHeaderRow = worksheet.getRow(3);

            // 🔥 แก้ไข 1: เว้นช่องว่าง "" ไว้ที่ตำแหน่งที่ 2 (เพราะคอลัมน์ B จะถูกผสาน)
            // A="สถานะ", B=(ว่าง/ถูกผสาน), C="จำนวน", D="%"
            kpiHeaderRow.values = ["สถานะ", "", "จำนวน (ราย)", "คิดเป็น %", ""];

            kpiHeaderRow.font = { bold: true, color: { argb: 'FF1F2937' } };
            kpiHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

            // ผสาน A3 กับ B3 (เพื่อให้คำว่า "สถานะ" กินพื้นที่กว้างขึ้น)
            worksheet.mergeCells('A3:B3');

            // 2. ข้อมูล KPI แต่ละบรรทัด
            const kpiRows = [
                { label: "✅ เข้ารับบริการแล้ว", val: stats.checkedIn, pct: getPercent(stats.checkedIn), color: 'FFDCFCE7' },
                { label: "⏳ รอรับบริการ", val: stats.booked, pct: getPercent(stats.booked), color: 'FFFEF9C3' },
                { label: "❌ ยกเลิก", val: stats.cancelled, pct: getPercent(stats.cancelled), color: 'FFFEE2E2' },
                { label: "🚫 ไม่มาตามนัด", val: stats.noShow, pct: getPercent(stats.noShow), color: 'FFF3F4F6' },
                { label: "รวมทั้งหมด", val: total, pct: "100%", color: 'FFE5E7EB', bold: true }
            ];

            let currentRow = 4;
            kpiRows.forEach(k => {
                const r = worksheet.getRow(currentRow);

                // ผสาน A กับ B สำหรับชื่อสถานะ
                worksheet.mergeCells(`A${currentRow}:B${currentRow}`);

                r.getCell(1).value = k.label; // ใส่ Label ที่ A (กินพื้นที่ A+B)

                // 🔥 แก้ไข 2: ขยับตัวเลขไปใส่ช่อง 3 (C) และ 4 (D)
                r.getCell(3).value = k.val;   // ใส่จำนวนที่ C
                r.getCell(4).value = k.pct;   // ใส่ % ที่ D

                // ตกแต่ง KPI
                // สีพื้นหลังใส่ที่ Cell 1 (A)
                r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: k.color } };

                // ตีเส้นขอบ (ต้องตีเผื่อไปถึงช่อง 4)
                [1, 3, 4].forEach(col => {
                    r.getCell(col).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    if (col !== 1) r.getCell(col).alignment = { horizontal: 'center' }; // จัดกลางเฉพาะตัวเลข
                });

                if (k.bold) r.font = { bold: true };
                currentRow++;
            });

            // --- ส่วนที่ 3: แปะรูปกราฟ (ด้านขวา KPI) ---
            const chartElement = document.getElementById('admin-charts-container');
            if (chartElement) {
                try {
                    // ใช้ toPng จาก html-to-image
                    const { toPng } = await import('html-to-image');
                    const imgData = await toPng(chartElement, {
                        quality: 1.0,
                        pixelRatio: 2,
                        backgroundColor: '#ffffff'
                    });

                    const imageId = workbook.addImage({ base64: imgData, extension: 'png' });

                    // แปะที่คอลัมน์ G (7) แถว 3 (ข้างๆ KPI)
                    worksheet.addImage(imageId, {
                        tl: { col: 0, row: 9 }, // เริ่ม Col G, Row 3
                        ext: { width: 850, height: 320 }
                    });
                } catch (e) { console.error("Chart Error", e); }
            }

            // --- ส่วนที่ 4: ตารางรายชื่อ (Main Table) ---
            // เริ่มที่บรรทัด 12 (เว้นระยะจาก KPI/Graph ลงมา)
            const tableStartRow = 30;
            const headerRow = worksheet.getRow(tableStartRow);

            // กำหนด Header
            headerRow.values = [
                'ลำดับ', 'วันที่จอง', 'รอบเวลา', 'ชื่อ-นามสกุล', 'ชื่อไลน์ (LINE)', 'เบอร์โทรศัพท์', 'รหัสการจอง', 'สถานะ', 'หมายเหตุ'
            ];

            // ตกแต่ง Header ตารางรายชื่อ
            headerRow.eachCell((cell) => {
                cell.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } }; // เขียว Emerald
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });
            headerRow.height = 24;

            // วนลูปใส่ข้อมูลรายคน (Explicit Row Loop) -> แก้ปัญหาข้อมูลไม่มา
            allData.forEach((b, index) => {
                const rowIndex = tableStartRow + 1 + index; // คำนวณบรรทัดเองเลย ชัวร์สุด
                const row = worksheet.getRow(rowIndex);

                const statusText = b.status === 'CHECKED_IN' ? 'เช็คอินแล้ว' :
                    b.status === 'CANCELLED' ? 'ยกเลิก' :
                        b.status === 'NO_SHOW' ? 'ไม่มาตามนัด' : 'รอรับบริการ';

                // กำหนดสีตัวอักษรสถานะ
                let statusColor = 'FF000000';
                if (b.status === 'CHECKED_IN') statusColor = 'FF10B981'; // เขียว
                else if (b.status === 'CANCELLED') statusColor = 'FFEF4444'; // แดง
                else if (b.status === 'NO_SHOW') statusColor = 'FF6B7280'; // เทา
                else if (b.status === 'BOOKED') statusColor = 'FFF59E0B'; // เหลืองเข้ม

                // ใส่ค่าลงเซลล์ทีละช่อง
                row.getCell(1).value = index + 1;
                row.getCell(2).value = b.booking_date || b.date;
                row.getCell(3).value = b.slot_label || b.slot;
                row.getCell(4).value = b.customer_name || b.name;
                row.getCell(5).value = b.line_display_name || "-";
                row.getCell(6).value = formatPhoneForExcel(b.phone); // Format เบอร์
                row.getCell(7).value = b.booking_code || b.code;
                row.getCell(8).value = statusText;
                row.getCell(9).value = b.noshow_reason || "-";

                // ใส่สีสถานะ
                row.getCell(8).font = { color: { argb: statusColor }, bold: true };

                // ตีเส้นตารางทุกช่อง
                for (let i = 1; i <= 9; i++) {
                    const cell = row.getCell(i);
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    cell.alignment = { vertical: 'middle', horizontal: (i === 1 || i === 2 || i === 6 || i === 7) ? 'center' : 'left' };
                }
            });

            // กำหนดความกว้างคอลัมน์
            worksheet.getColumn(1).width = 6;  // ลำดับ
            worksheet.getColumn(2).width = 15; // วันที่
            worksheet.getColumn(3).width = 18; // รอบ
            worksheet.getColumn(4).width = 25; // ชื่อ
            worksheet.getColumn(5).width = 22; // ไลน์
            worksheet.getColumn(6).width = 18; // เบอร์
            worksheet.getColumn(7).width = 20; // รหัส
            worksheet.getColumn(8).width = 15; // สถานะ
            worksheet.getColumn(9).width = 25; // เหตุผล

            // 5. Save File
            const buffer = await workbook.xlsx.writeBuffer();
            const fileName = `Report_${viewMode}_${date}.xlsx`;
            saveAs(new Blob([buffer]), fileName);

            Swal.close();
            Toast.fire({ icon: 'success', title: 'ดาวน์โหลดสำเร็จ' });

        } catch (err) {
            Swal.close();
            console.error(err);
            Swal.fire("Error", "เกิดข้อผิดพลาด: " + err.message, "error");
        }
    };


    // ฟังก์ชันลัด: เพิ่มเสาร์-อาทิตย์ (อิงตามเดือนของวันที่ที่เลือก)
    const handleAddWeekendsByDate = async () => {
        // 1. เช็คก่อนว่าเลือกวันที่หรือยัง
        if (!newDate) {
            Swal.fire("แจ้งเตือน", "กรุณาเลือกวันที่ ในเดือนที่ต้องการเพิ่มก่อนครับ", "warning");
            return;
        }
        const selected = new Date(newDate);
        const year = selected.getFullYear();
        const month = selected.getMonth(); // 0 = ม.ค.
        // ชื่อเดือนภาษาไทย (เอาไว้โชว์ตอนถามยืนยัน)
        const thaiMonth = new Date(year, month, 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
        // หาวันสุดท้ายของเดือนที่เลือก
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let datesToAdd = [];
        // วนลูปตั้งแต่วันที่ 1 ถึงวันสุดท้ายของเดือนนั้น
        for (let d = 1; d <= daysInMonth; d++) {
            const current = new Date(year, month, d);
            const dayOfWeek = current.getDay(); // 0=อาทิตย์, 6=เสาร์
            // ถ้าเป็น เสาร์ หรือ อาทิตย์
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                // แปลงเป็น YYYY-MM-DD
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                datesToAdd.push(dateStr);
            }
        }
        // กรองเอาเฉพาะวันที่ "ยังไม่มี" ในระบบ
        const existingDates = manageDates.map(item => item.date);
        const uniqueDates = datesToAdd.filter(d => !existingDates.includes(d));
        if (uniqueDates.length === 0) {
            Swal.fire("ครบแล้ว", `เดือน ${thaiMonth} มีวันเสาร์-อาทิตย์ ครบหมดแล้วครับ`, "info");
            return;
        }
        // ถามยืนยัน (บอกชื่อเดือนด้วย จะได้ไม่งง)
        const confirm = await Swal.fire({
            title: `เพิ่ม ${uniqueDates.length} วัน?`,
            html: `ระบบจะเพิ่มวันเสาร์-อาทิตย์ ของเดือน<br/><b>${thaiMonth}</b> ให้ทั้งหมด`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ยืนยันเพิ่มเลย',
            confirmButtonColor: '#059669', // สีเขียว
            cancelButtonText: 'ยกเลิก'
        });

        if (!confirm.isConfirmed) return;

        // เริ่มบันทึก
        setAddingDate(true);
        Swal.fire({ title: 'กำลังบันทึก...', didOpen: () => Swal.showLoading() });
        try {
            let successCount = 0;
            for (const d of uniqueDates) {
                const res = await addOpenDate(d);
                if (res.ok) successCount++;
            }
            Swal.close();
            Toast.fire({ icon: 'success', title: `เพิ่มเรียบร้อย ${successCount} วัน` });

            // อัปเดตหน้าจอทันที
            const newItems = uniqueDates.map(d => ({ date: d, status: "OPEN" }));
            setManageDates(prev => [...prev, ...newItems].sort((a, b) => a.date.localeCompare(b.date)));

        } catch (err) {
            Swal.fire("Error", err.message, "error");
        } finally {
            setAddingDate(false);
        }
    };

    return (
        <div className="min-h-screen bg-stone-50 font-sans flex flex-col">
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap'); .font-sans { font-family: 'Prompt', sans-serif; }`}</style>

            <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold">
                        <FiActivity size={24} /> <span className="hidden sm:inline">ระบบจัดการ</span>
                    </div>
                    {isAuthed && (
                        <div className="flex items-center gap-3">
                            <div className=" md:flex bg-gray-100 p-1 rounded-lg">
                                <button onClick={() => setActiveTab("dashboard")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>แดชบอร์ด</button>
                                <button onClick={() => setActiveTab("scan")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'scan' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>สแกน</button>
                            </div>
                            <button
                                onClick={handleChangePassword}
                                className="text-xs flex items-center gap-1 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-lg font-medium transition-colors"
                                title="เปลี่ยนรหัสผ่าน"
                            >
                                <FiLock /> <span className="hidden md:inline">เปลี่ยนรหัส</span>
                            </button>
                            <button onClick={handleLogout} className="text-xs flex items-center gap-1 text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-lg font-medium"><FiLogOut /></button>
                        </div>
                    )}
                </div>
            </nav>

            <main className="flex-grow p-4 md:p-6 lg:p-8 flex flex-col items-center">
                {!isAuthed ? (
                    <LoginForm
                        onLoginSuccess={(token) => setAuthToken(token)}
                        onForgotPassword={handleForgotPassword}
                    />
                ) : activeTab === "dashboard" ? (

                    // 🔥 จุดแก้ไข: ถ้า loading ให้โชว์ Skeleton, ถ้าโหลดเสร็จค่อยโชว์เนื้อหา
                    // ver2
                    <div className={`w-full max-w-7xl space-y-6 animate-fade-in-up transition-opacity duration-300 ${isRefreshing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        {/* 1. แถบเลือกวันที่ + ปุ่มอัปเดต */}
                        <div className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between gap-2 md:gap-4">

                            {/* ส่วนเลือกวันที่: ใส่ flex-1 ให้ยืดเต็มที่ */}
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 flex-1 md:flex-none">
                                <FiCalendar className="text-gray-400 shrink-0" />
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="text-gray-900 bg-transparent border-none outline-none text-sm font-medium w-full md:w-auto"
                                />
                            </div>

                            {/* ปุ่มอัปเดต: ใส่ shrink-0 (ห้ามหด) และลด padding มือถือลง */}
                            <button
                                onClick={() => reloadData('skeleton')}
                                disabled={loading}
                                className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-70 shrink-0"
                            >
                                <FiRefreshCw className={loading ? "animate-spin" : ""} />
                                {/* ในมือถือซ่อนคำว่า "ข้อมูล" ให้สั้นลง (เหลือแค่ "อัปเดต") หรือโชว์เต็มก็ได้ อันนี้โชว์เต็มตามเดิม */}
                                <span>{loading ? "กำลังโหลด..." : "อัปเดตข้อมูล"}</span>
                            </button>
                        </div>

                        <KPICards stats={kpiStats} loading={loading} />

                        {/* 3. กราฟ (มี Skeleton) */}
                        <AdminCharts
                            chartData={chartData}
                            pieData={pieData}
                            viewMode={viewMode}
                            loading={loading}
                        />
                        {/* 4. ตารางข้อมูล + ปุ่มจัดการ */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <BookingTable
                                bookings={bookings}
                                filteredBookings={filteredBookings}
                                loading={loading} // ✅ ส่ง loading เข้าไปแสดง Skeleton
                                viewMode={viewMode} setViewMode={setViewMode}
                                searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                                filterStatus={filterStatus} setFilterStatus={setFilterStatus}
                                currentPage={currentPage} setCurrentPage={setCurrentPage}
                                totalRecords={totalRecords}
                                onExport={handleExportExcel}
                                onSort={handleSort} sortConfig={sortConfig}
                                onChangeStatus={handleChangeStatus}
                                onViewReason={handleViewReason}
                                onCopy={handleCopy}
                            />
                            {/* 5. ส่วนจัดการวันที่และคิว (ด้านขวา) */}
                            <div className="lg:col-span-4 space-y-6 ">
                                {/* version วจัดการวันที่ เพจจิเนชั่น */}
                                {/* Component จัดการวันที่ */}
                                <DateManager
                                    manageDates={manageDates}
                                    viewDate={viewDate}
                                    setViewDate={setViewDate}
                                    newDate={newDate}
                                    setNewDate={setNewDate}
                                    addingDate={addingDate}
                                    onAddDate={handleAddDate}
                                    onAddWeekends={handleAddWeekendsByDate}
                                    onDeleteDate={handleDeleteDate}
                                    onToggleStatus={handleToggleStatus}
                                    loading={loading}
                                />
                                {/* Component จัดการรอบเวลา */}
                                <SlotManager
                                    slots={slots}
                                    onAddSlot={handleAddSlot}
                                    onEditSlot={handleEditSlotFull}
                                    onDeleteSlot={handleDeleteSlot}
                                    loading={loading}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    // ... (ส่วน Scanner เหมือนเดิม) ...
                    <div className="w-full max-w-md animate-fade-in-up space-y-6">
                        <QRScanner
                            activeTab={activeTab}
                            scanData={scanData}
                            setScanData={setScanData}
                            onScanSuccess={handleScanSuccess}
                            onConfirmCheckIn={handleConfirmCheckIn}
                            onReset={handleResetScan}
                            loading={loading}
                            manualCode={manualCode}
                            setManualCode={setManualCode}
                        />
                    </div>
                )
                }
            </main >
        </div >
    );
}