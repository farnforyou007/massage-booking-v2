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
    const [passwordInput, setPasswordInput] = useState("");
    const [authToken, setAuthToken] = useState("");
    const [date, setDate] = useState(todayStr());
    const [bookings, setBookings] = useState([]);
    const [slots, setSlots] = useState([]);
    const [manageDates, setManageDates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("dashboard");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [newDate, setNewDate] = useState("");
    const [addingDate, setAddingDate] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    // Scanner
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [scanStatus, setScanStatus] = useState("idle");
    const [scanErrorMsg, setScanErrorMsg] = useState("");
    const [scanData, setScanData] = useState(null);
    const [manualCode, setManualCode] = useState("");
    const scannerRef = useRef(null);
    const [autoCheckIn, setAutoCheckIn] = useState(true);
    // 🔥 2. เพิ่ม Ref เพื่อกันการสแกนรัวๆ (Scan Lock)
    const isProcessingScan = useRef(false);
    // const [torchOn, setTorchOn] = useState(false);

    // const [authToken, setAuthToken] = useState("");
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

    const [devices, setDevices] = useState([]); // รายชื่อกล้องทั้งหมด
    const [selectedDeviceId, setSelectedDeviceId] = useState(''); // ID กล้องที่เลือก

    const isFirstLoad = useRef(true);
    const currentMonthDates = manageDates.filter(item => {
        const d = new Date(item.date);
        return d.getMonth() === viewDate.getMonth() &&
            d.getFullYear() === viewDate.getFullYear();
    });
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
    // version reload realtime

    // // version2 18/12/68
    // async function reloadData(isSilent = false) {
    //     if (!authToken) return;
    //     if (!isSilent) setLoading(true);

    //     try {
    //         let urlBookings = "";
    //         const baseParams = `page=${currentPage}&limit=50&search=${encodeURIComponent(searchTerm)}`; // 🔥 เพิ่ม search ตรงนี้

    //         if (viewMode === "daily") {
    //             urlBookings = `/api/admin/bookings?date=${date}&${baseParams}`;
    //         } else if (viewMode === "monthly") {
    //             const firstDay = new Date(date); firstDay.setDate(1);
    //             const lastDay = new Date(date); lastDay.setMonth(lastDay.getMonth() + 1, 0);
    //             urlBookings = `/api/admin/bookings?startDate=${firstDay.toISOString().slice(0, 10)}&endDate=${lastDay.toISOString().slice(0, 10)}&${baseParams}`;
    //         } else if (viewMode === "yearly") {
    //             const currentYear = new Date(date).getFullYear();
    //             urlBookings = `/api/admin/bookings?startDate=${currentYear}-01-01&endDate=${currentYear}-12-31&${baseParams}`;
    //         } else {
    //             urlBookings = `/api/admin/bookings?${baseParams}`;
    //         }

    //         const resB = await fetch(urlBookings, { headers: { 'Authorization': `Bearer ${authToken}` } }).then(r => r.json());
    //         const resS = await adminGetSlotsSummary(date, authToken);

    //         if (resB.ok) {
    //             // ✅ Map ข้อมูลให้ชื่อฟิลด์ตรงกับที่ตารางต้องการ
    //             setBookings((resB.items || []).map(b => ({
    //                 ...b,
    //                 name: b.customer_name || b.name,
    //                 code: b.booking_code || b.code,
    //                 date: b.booking_date || b.date,
    //                 slot: b.slot_label || b.slot,
    //                 phone: b.phone
    //             })));
    //             setTotalRecords(resB.total || 0);
    //             if (resB.stats) setServerStats(resB.stats); // 🔥 อัปเดต KPI
    //             if (resB.chartDataRaw) setChartRaw(resB.chartDataRaw); // 🔥 อัปเดตกราฟ
    //         }
    //         // if (resS.ok) setSlots(resS.items || []);
    //         if (resS && resS.items) {
    //             setSlots(resS.items);
    //         }
    //     } catch (err) {
    //         console.error("Reload Error:", err);
    //     } finally {
    //         if (!isSilent) setLoading(false);
    //     }
    // }

    // version3 19/12/68
    // async function reloadData(isSilent = false) {
    //     if (!authToken) return;
    //     if (!isSilent) setLoading(true);

    //     try {
    //         let urlBookings = "";

    //         // ✅ ตั้งค่าพื้นฐาน (ส่ง search ไปด้วยเสมอ ถ้ามี)
    //         // const baseParams = `page=${currentPage}&limit=50&search=${encodeURIComponent(searchTerm)}`;


    //         // เพิ้มใหม่ 10.55 19/12/68
    //         let baseParams = `page=${currentPage}&limit=50&search=${encodeURIComponent(searchTerm)}`;
    //         if (sortConfig.key) {
    //             baseParams += `&sortKey=${sortConfig.key}&sortDir=${sortConfig.direction}`;
    //         }
    //         // =======
    //         // 👇 Logic: ค้นหา "ตามขอบเขตที่เลือกอยู่"
    //         if (viewMode === "daily") {
    //             // ถ้าอยู่รายวัน -> ค้นหาเฉพาะใน "วันที่เลือก"
    //             urlBookings = `/api/admin/bookings?date=${date}&${baseParams}`;

    //         } else if (viewMode === "monthly") {
    //             // ถ้าอยู่รายเดือน -> ค้นหาเฉพาะใน "เดือนที่เลือก"
    //             const firstDay = new Date(date); firstDay.setDate(1);
    //             const lastDay = new Date(date); lastDay.setMonth(lastDay.getMonth() + 1, 0);
    //             urlBookings = `/api/admin/bookings?startDate=${firstDay.toISOString().slice(0, 10)}&endDate=${lastDay.toISOString().slice(0, 10)}&${baseParams}`;

    //         } else if (viewMode === "yearly") {
    //             // ถ้าอยู่รายปี -> ค้นหาเฉพาะใน "ปีที่เลือก"
    //             const currentYear = new Date(date).getFullYear();
    //             urlBookings = `/api/admin/bookings?startDate=${currentYear}-01-01&endDate=${currentYear}-12-31&${baseParams}`;

    //         } else {
    //             // ✅ ถ้าเลือกโหมด "ทั้งหมด" -> ค้นหาทั้ง Database (Global Search)
    //             urlBookings = `/api/admin/bookings?${baseParams}`;
    //         }

    //         const resB = await fetch(urlBookings, { headers: { 'Authorization': `Bearer ${authToken}` } }).then(r => r.json());
    //         const resS = await adminGetSlotsSummary(date, authToken);

    //         if (resB.ok) {
    //             setBookings((resB.items || []).map(b => ({
    //                 ...b,
    //                 name: b.customer_name || b.name,
    //                 code: b.booking_code || b.code,
    //                 date: b.booking_date || b.date,
    //                 slot: b.slot_label || b.slot,
    //                 phone: b.phone
    //             })));
    //             setTotalRecords(resB.total || 0);

    //             // อัปเดต KPI และ กราฟ
    //             if (resB.stats) setServerStats(resB.stats);
    //             if (resB.chartDataRaw) setChartRaw(resB.chartDataRaw);
    //         }

    //         if (resS && resS.items) {
    //             setSlots(resS.items);
    //         }
    //     } catch (err) {
    //         console.error("Reload Error:", err);
    //     } finally {
    //         if (!isSilent) setLoading(false);
    //     }
    // }


    // version4 19/12/68 10.59
    // async function reloadData(isSilent = false) {
    //     if (!authToken) return;
    //     if (!isSilent) setLoading(true);

    //     if (isSilent) setIsRefreshing(true);
    //     try {
    //         let urlBookings = "";

    //         // 🔥 แก้ตรงนี้: เปลี่ยน const เป็น let เพื่อให้ต่อท้าย string ได้
    //         let baseParams = `page=${currentPage}&limit=50&search=${encodeURIComponent(searchTerm)}`;

    //         // ถ้ามีการกดหัวตาราง (sortConfig มีค่า) ให้เติมพารามิเตอร์ส่งไปหา API
    //         if (sortConfig.key) {
    //             baseParams += `&sortKey=${sortConfig.key}&sortDir=${sortConfig.direction}`;
    //         }

    //         // 👇 Logic: ค้นหา "ตามขอบเขตที่เลือกอยู่"
    //         if (viewMode === "daily") {
    //             urlBookings = `/api/admin/bookings?date=${date}&${baseParams}`;
    //         } else if (viewMode === "monthly") {
    //             const firstDay = new Date(date); firstDay.setDate(1);
    //             const lastDay = new Date(date); lastDay.setMonth(lastDay.getMonth() + 1, 0);
    //             urlBookings = `/api/admin/bookings?startDate=${firstDay.toISOString().slice(0, 10)}&endDate=${lastDay.toISOString().slice(0, 10)}&${baseParams}`;
    //         } else if (viewMode === "yearly") {
    //             const currentYear = new Date(date).getFullYear();
    //             urlBookings = `/api/admin/bookings?startDate=${currentYear}-01-01&endDate=${currentYear}-12-31&${baseParams}`;
    //         } else {
    //             urlBookings = `/api/admin/bookings?${baseParams}`;
    //         }

    //         // ==========================================
    //         // 🕒 พื้นที่ทดสอบ Delay (Test Zone)
    //         // ถ้าอยากเห็นว่าวูบจริงมั้ย ให้เปิดบรรทัดล่างนี้ครับ (หน่วงเวลา 1 วินาที)
    //         await new Promise(resolve => setTimeout(resolve, 1000));
    //         // ==========================================

    //         const resB = await fetch(urlBookings, { headers: { 'Authorization': `Bearer ${authToken}` } }).then(r => r.json());
    //         const resS = await adminGetSlotsSummary(date, authToken);

    //         if (resB.ok) {
    //             setBookings((resB.items || []).map(b => ({
    //                 ...b,
    //                 name: b.customer_name || b.name,
    //                 code: b.booking_code || b.code,
    //                 date: b.booking_date || b.date,
    //                 slot: b.slot_label || b.slot,
    //                 phone: b.phone
    //             })));
    //             setTotalRecords(resB.total || 0);

    //             if (resB.stats) setServerStats(resB.stats);
    //             if (resB.chartDataRaw) setChartRaw(resB.chartDataRaw);
    //         }

    //         if (resS && resS.items) {
    //             setSlots(resS.items);
    //         }
    //     } catch (err) {
    //         console.error("Reload Error:", err);
    //     } finally {
    //         if (!isSilent) setLoading(false);
    //         setIsRefreshing(false);
    //     }
    // }

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

    // useEffect(() => {
    //     if (authToken) {
    //         const delaySearch = setTimeout(() => {
    //             reloadData(true);
    //             // setIsRefreshing(true);
    //             // setTimeout(() => setIsRefreshing(false), 200);
    //         }, 400); // หน่วงเวลา 0.5 วินาทีเพื่อไม่ให้ยิง API ถี่เกินไปขณะพิมพ์
    //         return () => clearTimeout(delaySearch);
    //     }
    // }, [date, authToken, viewMode, currentPage, searchTerm, sortConfig]); // 🔥 เพิ่ม searchTerm ตรงนี้

    // // ✅ แก้ไข: ควบคุมการโหลดข้อมูล
    // useEffect(() => {
    //     if (authToken) {
    //         // เช็คว่าเป็นการโหลดครั้งแรกสุด (Refresh หน้าจอ) หรือไม่?
    //         if (isFirstLoad.current) {
    //             // ถ้าใช่ครั้งแรก -> ให้โหลดแบบ Skeleton (ส่ง false)
    //             reloadData(false);
    //             isFirstLoad.current = false; // ปิดสถานะครั้งแรกทันที
    //         } else {
    //             // ถ้าไม่ใช่ (คือการเปลี่ยนวัน/เปลี่ยนโหมด) -> ให้โหลดแบบจางๆ (ส่ง true)
    //             reloadData(true);
    //         }
    //     }
    // }, [date, authToken, viewMode, currentPage]);

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

    // useEffect(() => {
    //     if (!authToken) return;

    //     const channel = supabase
    //         .channel('admin_realtime_with_toast')
    //         .on(
    //             'postgres_changes',
    //             { event: '*', schema: 'public', table: 'bookings' },
    //             (payload) => {
    //                 console.log("มีการเปลี่ยนแปลงข้อมูล!", payload);
    //                 const audio = new Audio('/alert.mp3');
    //                 // const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    //                 audio.play()
    //                     .then(() => console.log("เล่นเสียงสำเร็จ"))
    //                     .catch(e => {
    //                         console.error("เสียงไม่ดังเพราะ:", e.message);
    //                         // ถ้าขึ้นว่า 'The play() request was interrupted by a call to pause()' 
    //                         // หรือ 'User hasn't interacted with the document' แสดงว่าต้องคลิกหน้าจอเดิมก่อนครับ
    //                     });
    //                 // 1. เรียกโหลดข้อมูลใหม่แบบเงียบๆ (เพื่ออัปเดตเลข KPI/กราฟ)
    //                 setSearchTerm("");
    //                 setCurrentPage(1);
    //                 reloadData(true);

    //                 // 2. 🔥 แจ้งเตือน Toast มุมขวาบน
    //                 const newCustomer = payload.new?.customer_name || "ลูกค้าใหม่";
    //                 const slotTime = payload.new?.slot_label || "";

    //                 Swal.fire({
    //                     toast: true,
    //                     position: 'top-end', // แจ้งเตือนมุมขวาบน
    //                     icon: 'info',
    //                     title: `มีการจองใหม่: ${newCustomer}`,
    //                     text: `รอบเวลา: ${slotTime}`,
    //                     showConfirmButton: false,
    //                     timer: 4000, // แสดงค้างไว้ 4 วินาที
    //                     timerProgressBar: true,
    //                     background: '#ffffff',
    //                     color: '#064e3b',
    //                     iconColor: '#10B981',

    //                 });
    //             }
    //         )
    //         .subscribe();

    //     return () => {
    //         supabase.removeChannel(channel);
    //     };
    // }, [authToken, viewMode, date, currentPage]);
    // ✅ แก้ไข Realtime ให้รองรับทั้งการ "จองใหม่" และ "ยกเลิก"

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
    async function handleLogin(e) {
        e.preventDefault();
        if (!passwordInput.trim()) return;
        setLoginLoading(true);
        try {
            const res = await adminLogin(passwordInput.trim());
            if (res.ok) {
                // ✅ แก้ตรงนี้: บันทึกลง localStorage
                const token = "logged-in"; // หรือใช้ res.token ถ้ามี
                setAuthToken(token);
                localStorage.setItem("admin_token", token);

                setPasswordInput("");
                Toast.fire({ icon: 'success', title: 'เข้าสู่ระบบสำเร็จ' });
            } else { Swal.fire("ผิดพลาด", "รหัสผ่านไม่ถูกต้อง", "error"); }
        } catch (err) {
            Swal.fire("Error", err.message, "error");
        } finally {
            setLoginLoading(false);
        }
    }

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

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            // 🧮 คำนวณยอดรวมโดยการบวกค่าจากทุกแท่ง (Checked-in + Booked + Cancelled)
            const total = payload.reduce((sum, entry) => sum + entry.value, 0);

            return (
                <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl">
                    {/* หัวข้อ: วันที่ หรือ ช่วงเวลา */}
                    <p className="font-bold text-gray-700 mb-1">{label}</p>
                    <hr className="my-1 border-gray-50" />

                    {/* รายการสถานะแต่ละแท่ง */}
                    {payload.map((entry, index) => (
                        <p key={index} className="text-sm flex justify-between gap-4" style={{ color: entry.fill }}>
                            <span>{entry.name}:</span>
                            <span className="font-semibold">{entry.value}</span>
                        </p>
                    ))}

                    {/* เส้นคั่นและยอดรวมทั้งหมด */}
                    <hr className="my-2 border-gray-100 border-dashed" />
                    <p className="text-sm font-bold text-gray-800 flex justify-between">
                        <span>ยอดรวมทั้งหมด:</span>
                        <span className="text-blue-600 ml-4">{total} รายการ</span>
                    </p>
                </div>
            );
        }
        return null;
    };
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
    // const pieData = useMemo(() => {
    //     const stats = { BOOKED: 0, CHECKED_IN: 0, CANCELLED: 0 };
    //     bookings.forEach(b => { if (stats[b.status] !== undefined) stats[b.status]++; });
    //     return [
    //         { name: 'รอรับบริการ', value: stats.BOOKED, color: '#EAB308' },
    //         { name: 'เช็คอินแล้ว', value: stats.CHECKED_IN, color: '#10B981' },
    //         { name: 'ยกเลิก', value: stats.CANCELLED, color: '#EF4444' }
    //     ].filter(i => i.value > 0);
    // }, [bookings]);
    // 🔥 แก้ไข Pie Chart ให้ใช้ข้อมูลสรุปจาก Server (serverStats)
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

    // const kpiStats = useMemo(() => ({
    //     total: bookings.length,
    //     checkedIn: bookings.filter(b => b.status === "CHECKED_IN").length,
    //     cancelled: bookings.filter(b => b.status === "CANCELLED").length,
    //     waiting: bookings.filter(b => b.status === "BOOKED").length
    // }), [bookings]);

    // 🔥 เปลี่ยนจากของเดิม เป็นอันนี้ครับ
    const kpiStats = useMemo(() => {
        // ใช้ข้อมูลจาก Server ที่คำนวณมาให้แล้ว (ถูกต้อง 100%)
        return {
            total: serverStats.total || 0,
            checkedIn: serverStats.checkedIn || 0,
            cancelled: serverStats.cancelled || 0,
            waiting: serverStats.waiting || 0,
            noShow: serverStats.noShow || 0
        };
    }, [serverStats]);

    // useEffect(() => {
    //     let mounted = true;
    //     if (activeTab === "scan" && !scanData && cameraEnabled) {
    //         const timer = setTimeout(() => { if (mounted) startScanner(); }, 300);
    //         return () => { mounted = false; clearTimeout(timer); stopScanner(); };
    //     } else { stopScanner(); }
    // }, [activeTab, scanData, cameraEnabled]);


    // const startScanner = async () => {
    //     // เช็คว่ามี element กล้องไหม
    //     if (!document.getElementById("reader")) return;

    //     // เคลียร์ของเก่าถ้ามีค้างอยู่
    //     if (scannerRef.current) await stopScanner();

    //     const html5QrCode = new Html5Qrcode("reader");
    //     scannerRef.current = html5QrCode;

    //     setScanStatus("starting");
    //     setScanErrorMsg("");

    //     try {
    //         // ✅ สั่งเปิดกล้องแบบมาตรฐาน (Standard Mode)
    //         // ไม่ต้องมีการปรับแต่ง Pro Mode ใดๆ ให้ปวดหัว
    //         const cameraIdOrConfig = selectedDeviceId
    //             ? { deviceId: { exact: selectedDeviceId } }
    //             : { facingMode: "environment" };

    //         await html5QrCode.start(
    //             { facingMode: "environment" }, // ถ้าเป็น PC มันจะหากล้องเว็บแคมให้อัตโนมัติ
    //             {
    //                 fps: 20, // 🚀 ยังคงความไวไว้ที่ 20 เฟรม/วิ (สแกนไว)
    //                 qrbox: { width: 250, height: 250 }, // กรอบเล็ง
    //                 aspectRatio: 1.0,
    //                 disableFlip: false
    //             },
    //             (decodedText) => {
    //                 // เมื่อสแกนเจอ
    //                 handleScanSuccess(decodedText);
    //             },
    //             (errorMessage) => {
    //                 // ไม่ต้องทำอะไร (ปล่อยผ่าน)
    //             }
    //         );

    //         setScanStatus("active");

    //     } catch (err) {
    //         console.error("Camera Error:", err);
    //         setScanStatus("error");
    //         setScanErrorMsg("ไม่สามารถเปิดกล้องได้ (กรุณาตรวจสอบการเชื่อมต่อ)");
    //     }
    // };

    // const stopScanner = async () => {
    //     if (scannerRef.current) {
    //         try {
    //             // เช็คว่าเป็น Instance ของ Html5Qrcode หรือไม่ เพื่อสั่ง stop
    //             // (try-catch เผื่อไว้กรณีมันหยุดไปแล้ว)
    //             await scannerRef.current.stop();
    //             await scannerRef.current.clear();
    //         } catch (e) {
    //             console.log("Stop scanner error ignored:", e);
    //         }
    //         scannerRef.current = null;
    //         setScanStatus("idle");
    //     }
    // };

    const handleScanSuccess = async (decodedText) => {
        if (isProcessingScan.current) return;
        isProcessingScan.current = true;

        let finalCode = decodedText;
        try { const url = new URL(decodedText); const c = url.searchParams.get("code"); if (c) finalCode = c; } catch (e) { }

        // --- 1. โหมด Manual ---
        if (!autoCheckIn) {
            setCameraEnabled(false);
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
                                    <div class="text-sm font-bold text-gray-700 mt-2"> ${timeStatus} นาที</div>
                                    <div class="text-sm text-gray-500 mt-1">${slotLabel}</div>
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

    // ---------------------------------------------------------------
    // 📷 Logic กล้อง (แก้ใหม่: เพิ่มเลือกกล้อง + กัน Error)
    // ---------------------------------------------------------------

    // 1. โหลดรายชื่อกล้องเมื่อเข้าหน้า Scan
    useEffect(() => {
        if (activeTab === 'scan') {
            const getDevices = async () => {
                try {
                    // 🛡️ เพิ่มบรรทัดนี้: เช็คก่อนว่า Browser รองรับกล้องไหม?
                    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                        console.warn("MediaDevices API not supported. (HTTPS Required?)");
                        return;
                    }
                    // ขอสิทธิ์ก่อน เพื่อให้ได้ Label ชื่อกล้อง
                    await navigator.mediaDevices.getUserMedia({ video: true });

                    const allDevices = await navigator.mediaDevices.enumerateDevices();
                    const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
                    setDevices(videoDevices);

                    // ถ้ายังไม่เคยเลือกกล้อง ให้พยายามหา "กล้องหลัง" (Back/Environment) ก่อน
                    if (videoDevices.length > 0 && !selectedDeviceId) {
                        const backCam = videoDevices.find(d =>
                            d.label.toLowerCase().includes('back') ||
                            d.label.toLowerCase().includes('rear') ||
                            d.label.toLowerCase().includes('environment')
                        );
                        setSelectedDeviceId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
                    }
                } catch (error) {
                    console.error("Camera permission error:", error);
                }
            };
            getDevices();
        }
    }, [activeTab]);

    // 2. สั่งเปิด/ปิดกล้อง ตามตัวแปร cameraEnabled และ activeTab
    useEffect(() => {
        let mounted = true;

        // ถ้าเงื่อนไขครบ (อยู่หน้า Scan + เปิดกล้อง + ยังไม่ได้ข้อมูล) -> เริ่มสแกน
        if (activeTab === "scan" && !scanData && cameraEnabled && selectedDeviceId) {
            // หน่วงเวลาเล็กน้อยเพื่อให้ <div id="reader"> วาดเสร็จก่อน
            const timer = setTimeout(() => {
                if (mounted) startScanner();
            }, 500); // เพิ่มเวลาเป็น 500ms กันเหนียว
            return () => {
                mounted = false;
                clearTimeout(timer);
                stopScanner();
            };
        } else {
            // ถ้าเงื่อนไขไม่ครบ ให้ปิดกล้องทันที
            stopScanner();
        }
    }, [activeTab, scanData, cameraEnabled, selectedDeviceId]); // เพิ่ม selectedDeviceId เข้าไป เพื่อให้รีสตาร์ทเมื่อเปลี่ยนกล้อง

    const startScanner = async () => {
        if (!document.getElementById("reader")) return;

        // 🛡️ 1. เช็ค HTTPS
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setScanStatus("error");
            setScanErrorMsg("Browser ไม่รองรับ (ต้องใช้ HTTPS)");
            return;
        }

        // 🧹 2. เคลียร์ของเก่า (สำคัญมาก: เพิ่มเวลาพักเป็น 1 วินาที)
        if (scannerRef.current) {
            await stopScanner();
        }
        // รอ 1 วินาที ให้กล้องหายค้างชัวร์ๆ
        await new Promise(r => setTimeout(r, 1000));

        // 3. สร้าง Instance
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        setScanStatus("starting");
        setScanErrorMsg("");

        const config = {
            fps: 10, // 🔻 ลด FPS ลงเหลือ 10 เพื่อความเสถียร
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false 
        };

        try {
            // 🎬 รอบที่ 1: พยายามเปิดตามที่เลือก (หรือกล้องหลัง)
            const mode = selectedDeviceId 
                ? { deviceId: { exact: selectedDeviceId } } 
                : { facingMode: "environment" };

            await html5QrCode.start(
                mode, 
                config,
                (decodedText) => handleScanSuccess(decodedText),
                () => {}
            );
            setScanStatus("active");

        } catch (err) {
            console.warn("รอบแรกไม่ไหว กำลังลองรอบสอง...", err);
            
            // 🚑 รอบที่ 2 (Emergency): ขอแค่กล้องอะไรก็ได้ (Any Camera)
            try {
                await html5QrCode.start(
                    { facingMode: "user" }, // ลองกล้องหน้าแทน (บางทีกล้องหลังค้าง แต่กล้องหน้าดี)
                    config,
                    (decodedText) => handleScanSuccess(decodedText),
                    () => {}
                );
                setScanStatus("active");
            } catch (err2) {
                console.error("รอบสองก็พัง:", err2);
                
                // ☠️ รอบสุดท้าย: ยอมแพ้ แล้วบอกให้รีเฟรช
                setScanStatus("error");
                setScanErrorMsg("กล้องค้าง! กรุณากดปิดแท็บนี้ทิ้ง แล้วเข้าใหม่ (อย่าแค่รีเฟรช)");
            }
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                // ต้อง try-catch เพราะถ้าสั่ง stop ตอนมันยังไม่ running จะ error
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (e) {
                console.log("Stop scanner ignored:", e);
            }
            scannerRef.current = null;
            setScanStatus("idle");
        }
    };

    const handleFileUpload = async (e) => {
        // 1. เช็คว่ามีไฟล์ไหม
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];

        // 2. ปิดกล้องหลักก่อน (เผื่อเปิดค้างไว้) เพื่อประหยัดทรัพยากร
        setCameraEnabled(false);

        // แสดง Loading
        Swal.fire({ title: 'กำลังอ่านรูป...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

        try {
            // 3. สร้าง Instance ใหม่สำหรับอ่านไฟล์
            // (ต้องมั่นใจว่าใน return() มี <div id="reader-file-hidden" ...> อยู่จริง)
            const html5QrCode = new Html5Qrcode("reader-file-hidden");

            // 4. สั่งสแกนรูป
            const result = await html5QrCode.scanFileV2(file, true);

            if (result && result.decodedText) {
                handleScanSuccess(result.decodedText);
            }
        } catch (err) {
            // กรณีอ่านไม่ออก หรือไฟล์ไม่มี QR Code
            console.error("Scan Error:", err);
            Swal.close();
            Swal.fire("อ่านรูปไม่ได้", "รูปภาพไม่ชัดเจน หรือไม่พบ QR Code", "error");
        } finally {
            // 5. ไม่ต้องสั่ง html5QrCode.clear() ครับ เพราะเราไม่ได้เปิดกล้อง
            // แค่เคลียร์ค่า input ให้เลือกรูปเดิมซ้ำได้ก็พอ
            e.target.value = '';
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
                reloadData();
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
                reloadData();
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
                    reloadData();
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

    // เลื่อนไปเดือนก่อนหน้า
    const handlePrevMonth = () => {
        setViewDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() - 1);
            return d;
        });
    };

    // เลื่อนไปเดือนถัดไป
    const handleNextMonth = () => {
        setViewDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + 1);
            return d;
        });
    };

    // กลับมาเดือนปัจจุบัน
    const handleCurrentMonth = () => {
        setViewDate(new Date());
    };

    // 🔎 ฟังก์ชันค้นหากล้องที่มีในเครื่อง
    // 🔎 ฟังก์ชันค้นหากล้องที่มีในเครื่อง
    useEffect(() => {
        const getDevices = async () => {
            try {
                await navigator.mediaDevices.getUserMedia({ video: true });
                const allDevices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
                setDevices(videoDevices);

                if (videoDevices.length > 0 && !selectedDeviceId) {
                    const backCamera = videoDevices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'));
                    setSelectedDeviceId(backCamera ? backCamera.deviceId : videoDevices[0].deviceId);
                }
            } catch (error) {
                console.error("Error accessing camera:", error);
            }
        };

        // ✅ แก้ตรงนี้: เปลี่ยน showScanner -> activeTab
        if (activeTab === 'scan') {
            getDevices();
        }
    }, [activeTab]); // ✅ เปลี่ยน Dependency เป็น activeTab ด้วย

    // --- Component: โครงร่างหน้าเว็บ (Skeleton Loading) ---
    const DashboardSkeleton = () => {
        return (
            <div className="w-full max-w-7xl space-y-6 animate-pulse p-4 md:p-0">
                {/* 1. Header (Date Picker & Button) */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div className="h-10 w-48 bg-gray-200 rounded-xl"></div>
                    <div className="h-10 w-32 bg-gray-200 rounded-xl"></div>
                </div>

                {/* 2. KPI Cards (4 ใบ) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center h-[88px]">
                            <div className="space-y-2">
                                <div className="h-3 w-16 bg-gray-200 rounded"></div>
                                <div className="h-6 w-10 bg-gray-300 rounded"></div>
                            </div>
                            <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                        </div>
                    ))}
                </div>

                {/* 3. Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Bar Chart (Left) */}
                    <div className="lg:col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[350px]">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="h-5 w-5 bg-gray-200 rounded"></div>
                            <div className="h-5 w-48 bg-gray-200 rounded"></div>
                        </div>
                        <div className="h-[250px] bg-gray-100 rounded-xl w-full"></div>
                    </div>
                    {/* Pie Chart (Right) */}
                    <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[350px]">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="h-5 w-5 bg-gray-200 rounded"></div>
                            <div className="h-5 w-32 bg-gray-200 rounded"></div>
                        </div>
                        <div className="h-[200px] w-[200px] bg-gray-100 rounded-full mx-auto mt-6"></div>
                    </div>
                </div>

                {/* 4. Table & Sidebar Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Table (Left) */}
                    <div className="lg:col-span-8 flex flex-col h-[600px] bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden">
                        {/* Table Header Filter */}
                        <div className="p-4 border-b border-gray-100 flex gap-3 bg-gray-50/50">
                            <div className="h-10 w-full bg-gray-200 rounded-xl"></div>
                            <div className="h-10 w-32 bg-gray-200 rounded-xl hidden md:block"></div>
                        </div>
                        {/* Table Rows */}
                        <div className="p-4 space-y-4">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="flex gap-4 items-center">
                                    <div className="h-4 w-8 bg-gray-200 rounded"></div>
                                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                                    <div className="h-4 w-full bg-gray-100 rounded"></div>
                                    <div className="h-4 w-20 bg-gray-200 rounded"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar (Right) - Date Management */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 h-[300px]">
                            <div className="h-6 w-40 bg-gray-200 rounded mb-4"></div>
                            <div className="h-10 w-full bg-gray-200 rounded-xl mb-4"></div>
                            <div className="h-full bg-gray-50 rounded-xl border border-dashed border-gray-200"></div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 h-[250px]">
                            <div className="flex justify-between mb-4">
                                <div className="h-6 w-32 bg-gray-200 rounded"></div>
                                <div className="h-8 w-16 bg-gray-200 rounded-lg"></div>
                            </div>
                            <div className="space-y-3">
                                <div className="h-16 w-full bg-gray-100 rounded-xl"></div>
                                <div className="h-16 w-full bg-gray-100 rounded-xl"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };



    return (
        <div className="min-h-screen bg-stone-50 font-sans flex flex-col">
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap'); .font-sans { font-family: 'Prompt', sans-serif; }`}</style>

            {/* {loading && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-white/60 backdrop-blur-[2px] transition-all duration-300">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl border border-emerald-100 flex flex-col items-center animate-bounce-slow">
                        <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
                        <p className="text-emerald-800 font-semibold text-sm animate-pulse">กำลังโหลดข้อมูล...</p>
                    </div>
                </div>
            )} */}

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
                    <div className="w-full max-w-md mt-10 bg-white rounded-3xl shadow-xl border border-gray-100 p-8 animate-fade-in-up">
                        <h2 className="text-xl font-bold text-center text-emerald-800 mb-6">เข้าสู่ระบบเจ้าหน้าที่</h2>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <input type="password"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                placeholder="รหัสผ่าน" value={passwordInput}
                                onChange={e => setPasswordInput(e.target.value)} />
                            <button type="submit" disabled={loginLoading}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg flex justify-center items-center gap-2">
                                {loginLoading && <FiLoader className="animate-spin" />} {loginLoading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
                            </button>

                            <div className="text-center">
                                <button
                                    onClick={handleForgotPassword}
                                    className="text-xs text-gray-400 hover:text-emerald-600 transition-colors"
                                >
                                    ลืมรหัสผ่าน ?
                                </button>
                            </div>
                        </form>
                    </div>
                ) : activeTab === "dashboard" ? (

                    // 🔥 จุดแก้ไข: ถ้า loading ให้โชว์ Skeleton, ถ้าโหลดเสร็จค่อยโชว์เนื้อหา
                    loading ? (
                        <DashboardSkeleton />
                    ) : (
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

                            {/* 2. KPI Cards (มี Skeleton) */}
                            {loading ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center h-[88px]">
                                            <div className="space-y-2">
                                                <div className="h-3 w-16 bg-gray-200 rounded"></div>
                                                <div className="h-6 w-10 bg-gray-300 rounded"></div>
                                            </div>
                                            <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                                        <div><p className="text-xs text-gray-500">ทั้งหมด</p><p className="text-xl font-bold text-gray-900">{kpiStats.total}</p></div>
                                        <FiUsers className="text-gray-300 text-2xl" />
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                                        <div><p className="text-xs text-gray-500">รอใช้บริการ</p><p className="text-xl font-bold text-yellow-600">{kpiStats.waiting}</p></div>
                                        <FiClock className="text-yellow-200 text-2xl" />
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                                        <div><p className="text-xs text-gray-500">รับบริการแล้ว</p><p className="text-xl font-bold text-emerald-600">{kpiStats.checkedIn}</p></div>
                                        <FiCheckCircle className="text-emerald-200 text-2xl" />
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                                        <div><p className="text-xs text-gray-500">ยกเลิกการจอง</p><p className="text-xl font-bold text-rose-600">{kpiStats.cancelled}</p></div>
                                        <FiAlertCircle className="text-rose-200 text-2xl" />
                                    </div>
                                    <div className="col-span-2 md:col-span-1 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                                        {/* <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center"> */}

                                        <div><p className="text-xs text-gray-500">ไม่มาตามนัด</p><p className="text-xl font-bold text-gray-500">{kpiStats.noShow}</p></div>
                                        <FiXCircle className="text-gray-200 text-2xl" />
                                    </div>
                                </div>
                            )}

                            {/* 3. กราฟ (มี Skeleton) */}
                            {loading ? (
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse">
                                    <div className="lg:col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[350px]">
                                        <div className="h-5 w-48 bg-gray-200 rounded mb-6"></div>
                                        <div className="h-[250px] bg-gray-100 rounded-xl w-full"></div>
                                    </div>
                                    <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[350px]">
                                        <div className="h-5 w-32 bg-gray-200 rounded mb-6"></div>
                                        <div className="h-[200px] w-[200px] bg-gray-100 rounded-full mx-auto mt-6"></div>
                                    </div>
                                </div>
                            ) : (
                                <div id="admin-charts-container" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                    <div className="lg:col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <h3 className="text-sm font-bold text-gray-600 mb-4 flex items-center gap-2">
                                            <FiBarChart2 />
                                            {viewMode === 'daily' && 'สถิติการจองรายชั่วโมง (วันนี้)'}
                                            {viewMode === 'monthly' && 'สถิติการจองรายวัน (เดือนนี้)'}
                                            {viewMode === 'yearly' && 'สถิติการจองรายเดือน (ปีนี้)'}
                                            {viewMode === 'all' && 'แนวโน้มการจองทั้งหมด (ภาพรวม)'}
                                        </h3>
                                        <div className="h-[300px] md:h-[250px] w-full">
                                            {chartData.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    {(() => {
                                                        const dynamicBarSize = viewMode === 'daily' ? (typeof window !== 'undefined' && window.innerWidth < 768 ? 20 : 45) : 15;
                                                        return (
                                                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                                                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                                                                <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                                                                {/* <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} /> */}
                                                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                                                                <Bar dataKey="CHECKED_IN" name="รับบริการแล้ว" fill="#10B981" radius={[4, 4, 0, 0]} barSize={dynamicBarSize} />
                                                                <Bar dataKey="BOOKED" name="รอรับบริการ" fill="#EAB308" radius={[4, 4, 0, 0]} barSize={dynamicBarSize} />
                                                                <Bar dataKey="CANCELLED" name="ยกเลิกการจอง" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={dynamicBarSize} />
                                                                <Bar dataKey="NO_SHOW" name="ไม่มาตามนัด" fill="#6B7280" radius={[4, 4, 0, 0]} barSize={dynamicBarSize} />
                                                            </BarChart>
                                                        );
                                                    })()}
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-100">
                                                    <FiBarChart2 className="text-4xl mb-2 opacity-20" />
                                                    <p className="text-sm font-medium">ไม่พบข้อมูลสถิติในช่วงเวลาที่เลือก</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <h3 className="text-sm font-bold text-gray-600 mb-4 flex items-center gap-2">
                                            <FiPieChart /> สัดส่วนสถานะ
                                        </h3>
                                        <div className="h-[250px] w-full flex justify-center">
                                            {pieData.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                                                            {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                                        </Pie>
                                                        <Tooltip />
                                                        <Legend verticalAlign="bottom" height={36} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-100">
                                                    <FiPieChart className="text-4xl mb-2 opacity-20" />
                                                    <p className="text-sm font-medium">ไม่มีข้อมูลสัดส่วน</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 4. ตารางข้อมูล + ปุ่มจัดการ */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                <div className="lg:col-span-8 flex flex-col h-[875px] bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden">
                                    {/* Header ของตาราง (ปุ่มเลือกโหมด + ช่องค้นหา) */}
                                    <div className="flex bg-gray-100 p-1 rounded-xl w-fit mt-2 ml-4 -mb-2 border border-gray-200">
                                        <button onClick={() => { setViewMode("daily"); setCurrentPage(1); setSearchTerm(""); }} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'daily' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>รายวัน</button>
                                        <button onClick={() => { setViewMode("monthly"); setCurrentPage(1); setSearchTerm(""); }} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'monthly' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>รายเดือน</button>
                                        <button onClick={() => { setViewMode("yearly"); setCurrentPage(1); setSearchTerm(""); }} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'yearly' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>รายปี</button>
                                        <button onClick={() => { setViewMode("all"); setCurrentPage(1); setSearchTerm(""); }} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'all' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>ทั้งหมด</button>
                                    </div>
                                    <div className="p-4 border-b border-gray-100 flex gap-3 bg-gray-50/50">
                                        <div className="flex flex-wrap md:flex-nowrap gap-3 flex-1">
                                            <div className="relative flex-1 group">
                                                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                                                    <FiSearch className="text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
                                                </div>
                                                <input type="text" placeholder="ค้นหาชื่อ, เบอร์โทร หรือรหัสจอง..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 text-gray-900 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                            </div>
                                            <div className="relative w-full md:w-[130px] group">
                                                <select className=" w-full appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-[14px] font-bold hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500/20 text-center" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                                    <option value="ALL">ทั้งหมด</option>
                                                    <option value="BOOKED">รอรับบริการ</option>
                                                    <option value="CHECKED_IN">รับบริการแล้ว</option>
                                                    <option value="CANCELLED">ยกเลิกแล้ว</option>
                                                </select>
                                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"></path></svg>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-emerald-50 hover:text-emerald-600 transition-all shadow-sm">
                                                <FiFileText className="text-emerald-500 text-sm" /> Export Excel
                                            </button>
                                        </div>
                                    </div>

                                    {/* ส่วนเนื้อหาตาราง */}
                                    <div className="flex-1 overflow-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 sticky top-0 text-xs font-bold text-gray-500 uppercase">
                                                <tr>
                                                    <th className="px-4 py-3 text-center w-16">ลำดับ</th>
                                                    {(viewMode === 'monthly' || viewMode === 'yearly' || viewMode === 'all') && (
                                                        <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('date')}>
                                                            <div className="flex items-center">วันที่จอง {getSortIcon('date')}</div>
                                                        </th>
                                                    )}
                                                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('slot')}>
                                                        <div className="flex items-center">เวลา {getSortIcon('slot')}</div>
                                                    </th>
                                                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('name')}>
                                                        <div className="flex items-center">ชื่อ-สกุล / รหัส {getSortIcon('name')}</div>
                                                    </th>
                                                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('phone')}>
                                                        <div className="flex items-center">เบอร์โทร {getSortIcon('phone')}</div>
                                                    </th>
                                                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('status')}>
                                                        <div className="flex items-center justify-center gap-1">สถานะ {getSortIcon('status')}</div>
                                                    </th>
                                                    <th className="px-4 py-3 text-right">จัดการ</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-sm divide-y divide-gray-50">
                                                {loading && bookings.length === 0 ? (
                                                    [...Array(10)].map((_, i) => (
                                                        <tr key={i} className="animate-pulse">
                                                            <td className="px-4 py-4 text-center"><div className="h-4 bg-gray-200 rounded w-8 mx-auto"></div></td>
                                                            <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                                                            <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                                                            <td className="px-4 py-4"><div className="flex flex-col gap-2"><div className="h-4 bg-gray-200 rounded w-32"></div><div className="h-3 bg-gray-100 rounded w-20"></div></div></td>
                                                            <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                                                            <td className="px-4 py-4"><div className="h-6 bg-gray-200 rounded-full w-20"></div></td>
                                                            <td className="px-4 py-4 text-right"><div className="flex justify-end gap-2"><div className="h-8 w-8 bg-gray-200 rounded-lg"></div><div className="h-8 w-8 bg-gray-200 rounded-lg"></div></div></td>
                                                        </tr>
                                                    ))
                                                ) : filteredBookings.length > 0 ? (
                                                    filteredBookings.map((b, i) => {
                                                        const rowNumber = ((currentPage - 1) * 50) + (i + 1);
                                                        return (
                                                            <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                                                                <td className="px-4 py-3 text-center font-mono text-gray-400 text-xs">{rowNumber}</td>
                                                                {(viewMode === 'monthly' || viewMode === 'yearly' || viewMode === 'all') && (
                                                                    <td className="px-4 py-3 font-medium text-gray-600">{formatThaiDateAdmin(b.date)}</td>
                                                                )}
                                                                <td className="px-4 py-3 font-medium text-emerald-700">{b.slot}</td>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center gap-1.5 group/name">
                                                                        <span className="font-bold text-gray-800">{b.name}</span>
                                                                        <button onClick={() => handleCopy(b.name, "ชื่อ")} className="text-gray-300 hover:text-emerald-600 transition-colors"><FiCopy size={13} /></button>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 mt-0.5 group/code">
                                                                        <span className="text-[10px] text-gray-400 font-mono">#{b.code}</span>
                                                                        <button onClick={() => handleCopy(b.code, "รหัสจอง")} className="text-gray-300 hover:text-emerald-500 transition-colors"><FiCopy size={10} /></button>
                                                                    </div>
                                                                    <div className="text-[9px] text-emerald-500 mt-1 italic">{b.created_at ? `จองเมื่อ: ${new Date(b.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}` : ''}</div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center gap-1.5 group/phone">
                                                                        <span className="font-mono text-gray-600 text-xs">{b.phone}</span>
                                                                        <button onClick={() => handleCopy(b.phone, "เบอร์โทร")} className="text-gray-300 hover:text-blue-500 transition-colors"><FiCopy size={12} /></button>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {/* {renderStatusBadge(b.status)} */}
                                                                    <div className="flex flex-col items-center justify-center gap-1">
                                                                        {renderStatusBadge(b.status)}

                                                                        {/* </div>
                                                                    <div className="flex items-center gap-1.5 mt-0.5"> */}

                                                                        {/* 🔥 ถ้ามีเวลาเช็คอิน ให้แสดงเวลาด้วย */}
                                                                        {b.status === 'CHECKED_IN' && b.checked_in_at && (
                                                                            <span className="text-[10px] text-gray-400 font-mono">
                                                                                ถึง: {new Date(b.checked_in_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>

                                                                <td className="px-4 py-3 text-right">
                                                                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2"> */}
                                                                    {b.status === "BOOKED" &&
                                                                        <div className="flex justify-end gap-2">
                                                                            <button
                                                                                title="ยืนยันผู้มาใช้บริการ"
                                                                                onClick={() => handleChangeStatus(b, "CHECKED_IN")}
                                                                                className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"><FiCheckSquare />
                                                                            </button>
                                                                            <button
                                                                                title="ยกเลิกการจอง"
                                                                                onClick={() => handleChangeStatus(b, "CANCELLED")}
                                                                                className="p-1.5 bg-rose-100 text-rose-700 rounded hover:bg-rose-200"><FiXCircle />
                                                                            </button>
                                                                        </div>}
                                                                    {b.status === 'NO_SHOW' && (
                                                                        <button
                                                                            onClick={() => handleViewReason(b)}
                                                                            className="p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                                                            title="ดูสาเหตุที่ไม่มา"
                                                                        >
                                                                            <div className="flex items-center gap-1">
                                                                                <FiMessageSquare /> {/* อย่าลืม import icon นี้ */}
                                                                                {/* <span className="text-xs hidden md:inline">เหตุผล</span> */}
                                                                            </div>
                                                                        </button>
                                                                    )}
                                                                </td>

                                                            </tr>
                                                        );
                                                    })
                                                ) : (
                                                    <tr className="h-full">
                                                        <td colSpan="7" className="p-0 align-middle">
                                                            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3 min-h-[445px]">
                                                                <div className="p-4 bg-gray-50 rounded-full"><FiSearch size={48} className="opacity-20" /></div>
                                                                <div className="text-center"><p className="text-base font-semibold text-gray-500">ไม่พบข้อมูลที่ค้นหา</p><p className="text-xs opacity-60">ตรวจสอบคำสะกด หรือเปลี่ยนตัวกรองสถานะใหม่</p></div>
                                                                <button onClick={() => { setSearchTerm(""); setFilterStatus("ALL"); }} className="mt-2 text-xs text-emerald-600 hover:underline font-medium">ล้างตัวกรองทั้งหมด</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between mt-auto">
                                        <div className="text-[10px] text-gray-500 font-medium">แสดงหน้า {currentPage} (ทั้งหมด {totalRecords} รายการ)</div>
                                        <div className="flex gap-2">
                                            <button disabled={currentPage * 50 >= totalRecords || loading} onClick={() => setCurrentPage(prev => prev + 1)} className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-[11px] font-bold disabled:opacity-50 hover:bg-gray-50 transition-colors">ก่อนหน้า</button>
                                            <button disabled={bookings.length < 50 || loading} onClick={() => setCurrentPage(prev => prev + 1)} className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-[11px] font-bold disabled:opacity-50 hover:bg-gray-50 transition-colors">ถัดไป</button>
                                        </div>
                                    </div>
                                </div>

                                {/* 5. ส่วนจัดการวันที่และคิว (ด้านขวา) */}
                                <div className="lg:col-span-4 space-y-6 ">
                                    {/* <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 w-full ">
                                    
                                    <h3 className="text-sm font-bold text-gray-600 mb-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <FiCalendar className="text-emerald-600" />
                                            จัดการวันเปิดให้บริการ
                                        </div>

                                        <label className="inline-flex items-center cursor-pointer group">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={showAllDates}
                                                    onChange={(e) => setShowAllDates(e.target.checked)}
                                                    className="sr-only peer"
                                                />

                                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                            </div>

                                            <span className="ml-2 text-[11px] font-medium text-gray-400 group-hover:text-emerald-600 transition-colors select-none">
                                                {showAllDates ? 'ซ่อนประวัติเก่า' : 'ดูประวัติย้อนหลัง'}
                                            </span>
                                        </label>
                                    </h3>
                                    <div className="flex gap-2 mb-4">
                                        <div className="relative flex-1 border border-gray-200 rounded-lg bg-white focus-within:ring-1 focus-within:ring-emerald-500 overflow-hidden">
                                            <input type="date" value={newDate}
                                                onChange={e => setNewDate(e.target.value)}
                                                onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                                onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
                                                style={{ colorScheme: 'light' }}
                                                className={`text-gray-900 w-full h-full px-2 py-1.5 text-xs outline-none bg-transparent border-none relative z-10 
                                            ${!newDate ? 'text-transparent' : 'text-gray-900'}`} />
                                            {(!newDate && !isFocused) &&
                                                <span className="absolute left-2 top-1.5 text-xs text-gray-400 pointer-events-none z-0">--เลือกวันที่เปิดให้บริการ--</span>}
                                        </div>
                                        <button onClick={handleAddDate} disabled={!newDate || addingDate}
                                            className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                                            {addingDate ? <FiLoader className="animate-spin" /> : <FiPlus />} {addingDate ? "..." : "เพิ่มวันที่"}
                                        </button>
                                    </div>

                                    <div className="mb-2">
                                        <button
                                            // onClick={handleAddWeekendsThisMonth}
                                            onClick={handleAddWeekendsByDate}
                                            disabled={addingDate}
                                            // className="w-full py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 hover:border-blue-300 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                                            // className="w-full py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100 hover:border-indigo-300 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                                            className="w-full py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-medium hover:bg-amber-100 hover:border-amber-300 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                                        // className="w-full py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 hover:border-emerald-300 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                                        >
                                            <FiCalendar className="text-lg" />
                                            <span>เพิ่มเสาร์-อาทิตย์ (ทั้งเดือน) อัตโนมัติ</span>
                                        </button>
                                    </div>


                                    <div className="max-h-[500px] overflow-y-auto pr-2 border border-gray-100 rounded-xl p-2 bg-gray-50/50"></div>
                                    <div className="grid grid-cols-2 gap-2 max-h-[318px] overflow-y-auto pr-1">
                                        {manageDates.length > 0 ? manageDates
                                            .filter(item => {
                                                if (showAllDates) return true;
                                                return item.date >= new Date().toISOString().slice(0, 10);
                                            })
                                            .map((item) => (
                                                <div key={item.date}

                                                    className={`flex items-center justify-between px-2 py-1.5 md:px-3 md:py-2 rounded-lg border transition-all h-[45px] 
                                                    ${item.status === "OPEN" ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200 opacity-75"}`}
                                                >

                                                    <div className="flex items-center gap-2 md:gap-3">

                                                        <button onClick={() => handleToggleStatus(item)}
                                                            className={`p-1 md:p-1.5 rounded-full transition-colors 
                                                    ${item.status === "OPEN" ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200" : "bg-gray-200 text-gray-500 hover:bg-gray-300"}`}
                                                        >

                                                            {item.status === "OPEN" ?
                                                                <FiUnlock className="w-3 h-3 md:w-3.5 md:h-3.5" /> :
                                                                <FiLock className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                                            }
                                                        </button>


                                                        <span className={`text-xs md:text-sm font-medium 
                                                        ${item.status === "OPEN" ? "text-emerald-900" : "text-gray-500 line-through decoration-gray-400"}`}
                                                        >
                                                            {formatThaiDateAdmin(item.date)}
                                                        </span>
                                                    </div>

                                                    <button onClick={() => handleDeleteDate(item.date)} className="text-gray-400 hover:text-rose-500 p-1 rounded-md hover:bg-rose-50 transition-colors">

                                                        <FiTrash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                    </button>
                                                </div>
                                            ))
                                            : (
                                                <div className="col-span-2 text-center py-6 border-2 border-dashed border-gray-100 rounded-xl">
                                                    <p className="text-xs text-gray-400">ยังไม่มีวันเปิดจอง</p>
                                                </div>
                                            )}
                                    </div>
                                </div> */}

                                    {/* version วจัดการวันที่ เพจจิเนชั่น */}

                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 w-full">

                                        {/* --- ส่วนหัวข้อ และ ตัวเลื่อนเดือน (Pagination) --- */}
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-gray-600 flex items-center gap-2">
                                                <FiCalendar className="text-emerald-600" />
                                                จัดการวันเปิดให้บริการ
                                            </h3>

                                            {/* Navigator: ตัวเลื่อนเดือน */}
                                            <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border border-gray-200">
                                                <button
                                                    onClick={handlePrevMonth}
                                                    className="p-1.5 hover:bg-white hover:text-emerald-600 rounded-md text-gray-400 transition-all shadow-sm hover:shadow"
                                                >
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

                                                <button
                                                    onClick={handleNextMonth}
                                                    className="p-1.5 hover:bg-white hover:text-emerald-600 rounded-md text-gray-400 transition-all shadow-sm hover:shadow"
                                                >
                                                    <FiArrowRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* --- ส่วนกรอกวันที่ --- */}
                                        <div className="flex gap-2 mb-3">
                                            <div className="relative flex-1 border border-gray-200 rounded-lg bg-white focus-within:ring-1 focus-within:ring-emerald-500 overflow-hidden h-[38px]">
                                                <input type="date" value={newDate}
                                                    onChange={e => setNewDate(e.target.value)}
                                                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                                    onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
                                                    style={{ colorScheme: 'light' }}
                                                    className={`text-gray-900 w-full h-full px-2 text-xs outline-none bg-transparent border-none relative z-10 
                                                    ${!newDate ? 'text-transparent' : 'text-gray-900'}`} />
                                                {(!newDate && !isFocused) &&

                                                    <span className="absolute left-2 top-2.5 text-xs text-gray-400 pointer-events-none z-0">--เลือกวันที่เปิดให้บริการ--</span>}

                                            </div>
                                            <button onClick={handleAddDate} disabled={!newDate || addingDate}
                                                className="bg-emerald-600 text-white px-3 rounded-lg text-xs hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 h-[38px] transition-colors shadow-sm font-medium whitespace-nowrap">
                                                {addingDate ? <FiLoader className="animate-spin" /> : <FiPlus />} เพิ่ม
                                            </button>
                                        </div>

                                        {/* --- ปุ่มเพิ่มอัตโนมัติ --- */}
                                        <div className="mb-4">
                                            <button
                                                onClick={handleAddWeekendsByDate}
                                                disabled={addingDate}
                                                className="w-full py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-medium hover:bg-blue-100 hover:border-blue-300 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                                            >
                                                <FiCalendar className="text-lg" />
                                                <span>เพิ่มเสาร์-อาทิตย์ (ตามเดือนที่เลือก)</span>
                                            </button>
                                        </div>

                                        {/* --- ส่วนแสดงรายการ (Scrollable & Filter by Month) --- */}
                                        <div className="border border-gray-100 rounded-xl bg-gray-50/50 p-2">
                                            <div className="max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
                                                <div className="grid grid-cols-2 md:grid-cols-2 gap-2">
                                                    {currentMonthDates.length > 0 ? currentMonthDates
                                                        // 🔥 กรองเฉพาะเดือน/ปี ที่ตรงกับ viewDate
                                                        .filter(item => {
                                                            const d = new Date(item.date);
                                                            return d.getMonth() === viewDate.getMonth() &&
                                                                d.getFullYear() === viewDate.getFullYear();
                                                        })
                                                        .map((item) => (
                                                            <div key={item.date}
                                                                className={`flex items-center justify-between px-2 py-1.5 md:px-3 md:py-2 rounded-lg border transition-all h-[45px] bg-white shadow-sm
                                                                ${item.status === "OPEN" ? "border-emerald-200" : "border-gray-200 opacity-75"}`}
                                                            >
                                                                <div className="flex items-center gap-2 md:gap-3">
                                                                    <button onClick={() => handleToggleStatus(item)}
                                                                        className={`p-1 md:p-1.5 rounded-full transition-colors 
                                                                    ${item.status === "OPEN" ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200" : "bg-gray-200 text-gray-500 hover:bg-gray-300"}`}
                                                                    >
                                                                        {item.status === "OPEN" ?
                                                                            <FiUnlock className="w-3 h-3 md:w-3.5 md:h-3.5" /> :
                                                                            <FiLock className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                                                        }
                                                                    </button>
                                                                    <span className={`text-xs md:text-sm font-medium 
                                                                    ${item.status === "OPEN" ? "text-emerald-900" : "text-gray-500 line-through decoration-gray-400"}`}
                                                                    >
                                                                        {formatThaiDateAdmin(item.date)}
                                                                    </span>
                                                                </div>
                                                                <button onClick={() => handleDeleteDate(item.date)} className="text-gray-400 hover:text-rose-500 p-1 rounded-md hover:bg-rose-50 transition-colors">
                                                                    <FiTrash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                                </button>
                                                            </div>
                                                        ))
                                                        : (
                                                            <div className="col-span-1 md:col-span-2 text-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-white flex flex-col items-center justify-center gap-2">
                                                                <FiCalendar className="text-gray-300 text-3xl" />
                                                                <p className="text-xs text-gray-400">
                                                                    ไม่มีรายการในเดือน <br />
                                                                    <span className="font-bold text-gray-500">
                                                                        {viewDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                                                                    </span>
                                                                </p>
                                                            </div>
                                                        )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* สิ้นสุด */}

                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col h-[370px]">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-sm font-bold text-gray-600 flex items-center gap-2"><FiLayers className="text-blue-600" /> จัดการช่วงเวลา / คิว ({Array.isArray(slots) ? slots.length : 0})</h3>
                                            <button onClick={handleAddSlot} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-700 flex items-center gap-2 transition-colors shadow-sm"><FiPlus /> เพิ่ม</button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 ">
                                            {Array.isArray(slots) && slots.length > 0 ? (
                                                slots.map((s) => (
                                                    <div key={s.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col gap-2 group hover:border-emerald-200 transition-colors">
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-bold text-sm text-gray-700">{s.label}</span>
                                                            <div className="flex gap-1">
                                                                <button onClick={() => handleEditSlotFull(s)}
                                                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                                                    title="แก้ไข"><FiEdit2 size={12} />
                                                                </button>
                                                                <button onClick={() => handleDeleteSlot(s)}
                                                                    className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                                                                    title="ลบ"><FiTrash2 size={12} /></button>
                                                            </div>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all duration-500 ${s.remaining === 0 ? 'bg-rose-500' : (s.booked / s.capacity) >= 0.6 ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{ width: `${(s.booked / s.capacity) * 100}%` }}></div>
                                                        </div>
                                                        <div className="flex justify-between text-[11px] text-gray-500">
                                                            <span>จอง {s.booked}/{s.capacity}</span>
                                                            <span>{s.remaining === 0 ? 'เต็ม' : 'ว่าง ' + s.remaining}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center text-gray-400 text-xs mt-10"><p>ไม่พบข้อมูลรอบเวลา</p><button onClick={handleAddSlot} className="mt-2 text-emerald-600 underline hover:text-emerald-700">+ เพิ่มรอบแรก</button></div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                    // ... (ส่วน Scanner เหมือนเดิม) ...
                    <div className="w-full max-w-md animate-fade-in-up space-y-6">
                        {!scanData ? (
                            <>
                                {/* ส่วน Scanner */}
                                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-4 relative flex flex-col">
                                    {/* 1. ส่วนหัว: ชื่อ และ ปุ่มกดต่างๆ */}
                                    {/* <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-bold text-gray-700 flex gap-2 items-center"><FiCamera /> กล้อง</h3>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setAutoCheckIn(!autoCheckIn)}
                                                className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all border ${autoCheckIn
                                                    ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm'
                                                    : 'bg-gray-50 text-gray-400 border-gray-200'
                                                    }`}
                                            >
                                                {autoCheckIn ? '⚡ Auto Check-in' : 'Manual Scan'}
                                            </button>

                                            <button onClick={() => setCameraEnabled(!cameraEnabled)} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${cameraEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {cameraEnabled ? 'เปิดอยู่' : 'ปิดอยู่'}
                                            </button>
                                        </div>  
                                    </div> */}

                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-bold text-gray-700 flex gap-2 items-center"><FiCamera /> กล้อง</h3>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setAutoCheckIn(!autoCheckIn)}
                                                className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all border ${autoCheckIn ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
                                            >
                                                {autoCheckIn ? '⚡ Auto' : 'Manual'}
                                            </button>
                                            <button
                                                onClick={() => setCameraEnabled(!cameraEnabled)}
                                                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${cameraEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                                            >
                                                {cameraEnabled ? 'เปิดอยู่' : 'ปิดอยู่'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* ✨ เพิ่ม: Dropdown เลือกกล้อง (โชว์เฉพาะตอนมี > 1 ตัว และเปิดกล้องอยู่) ✨ */}
                                    {cameraEnabled && devices.length > 1 && (
                                        <div className="mb-3 px-1">
                                            <select
                                                className="w-full p-2 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                                value={selectedDeviceId}
                                                onChange={(e) => {
                                                    // พอเปลี่ยนปุ๊บ useEffect จะทำงานเองเพราะเราใส่ selectedDeviceId เป็น dependency ไว้แล้ว
                                                    setSelectedDeviceId(e.target.value);
                                                }}
                                            >
                                                {devices.map((device, index) => (
                                                    <option key={device.deviceId} value={device.deviceId}>
                                                        {device.label || `กล้องตัวที่ ${index + 1}`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}


                                    {/* 2. ส่วนแสดงกล้อง */}
                                    {/* <div className="relative w-full rounded-xl overflow-hidden bg-black min-h-[250px] mb-4">
                                        {cameraEnabled ? (
                                            <>
                                                <div id="reader" className="w-full h-full"></div>
                                                {scanStatus === 'starting' && <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100/90 z-20"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div><span className="text-xs text-gray-500">กำลังเปิด...</span></div>}
                                                {scanStatus === 'error' && <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-center p-4 z-20"><FiAlertTriangle className="text-rose-500 text-3xl mb-2" /><p className="text-xs text-gray-500 mb-2">{scanErrorMsg}</p><button onClick={() => setCameraEnabled(false)} className="text-emerald-600 underline text-xs">ปิดกล้อง</button></div>}
                                            </>
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400"><FiCameraOff size={40} /><p className="text-sm mt-2">กล้องถูกปิด</p></div>
                                        )}
                                    </div> */}

                                    <div className="relative w-full rounded-xl overflow-hidden bg-black min-h-[250px] mb-4">
                                        {cameraEnabled ? (
                                            <>
                                                {/* div นี้สำคัญมาก ห้ามลบ */}
                                                <div id="reader" className="w-full h-full"></div>

                                                {/* Loading State */}
                                                {scanStatus === 'starting' && (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100/90 z-20">
                                                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                                        <span className="text-xs text-gray-500">กำลังเปิดกล้อง...</span>
                                                    </div>
                                                )}

                                                {/* Error State */}
                                                {scanStatus === 'error' && (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-center p-4 z-20">
                                                        <FiAlertTriangle className="text-rose-500 text-3xl mb-2" />
                                                        <p className="text-xs text-gray-500 mb-2">{scanErrorMsg}</p>
                                                        <button onClick={() => setCameraEnabled(false)} className="text-emerald-600 underline text-xs">ลองปิดแล้วเปิดใหม่</button>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                                <FiCameraOff size={40} />
                                                <p className="text-sm mt-2">กล้องถูกปิด</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. ส่วนอัปโหลดรูป */}
                                    <div className="pt-2 border-t border-gray-100">
                                        <div id="reader-file-hidden" className="hidden"></div>
                                        <label className="flex items-center justify-center gap-2 w-full py-3 bg-stone-100 text-stone-600 rounded-xl font-semibold cursor-pointer hover:bg-stone-200 transition-colors"><FiImage /> เลือกรูป QR Code <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} /></label>
                                    </div>
                                </div>

                                {/* สว่นค้นหา */}
                                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><FiSearch /> หรือค้นหาด้วยรหัส/เบอร์โทร</h3>
                                    <div className="flex gap-2">
                                        <input type="text" value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="กรอกรหัสจอง..." className="placeholder-gray-400 text-gray-800 flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                                        <button onClick={() => handleScanSuccess(manualCode)} disabled={!manualCode} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">ค้นหา</button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            // <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 overflow-hidden">
                            //     <div className="bg-emerald-50 p-6 border-b border-emerald-100 text-center relative">
                            //         <button onClick={handleResetScan} className="absolute top-4 right-4 text-emerald-700 hover:bg-emerald-100 p-2 rounded-full"><FiRefreshCw /></button>
                            //         <div className="inline-block p-3 bg-white rounded-full shadow-sm mb-2 text-3xl">
                            //             {scanData.status === "CHECKED_IN" ? <FiCheckCircle className="text-emerald-500" /> : scanData.status === "CANCELLED" ? <FiXCircle className="text-rose-500" /> : <FiClock className="text-yellow-500" />}
                            //         </div>

                            //         <h2 className="text-xl font-bold text-emerald-900">{scanData.name}</h2>
                            //         <p className="text-sm text-emerald-600 font-mono">{scanData.code}</p>
                            //     </div>
                            //     <div className="p-6 space-y-4">
                            //         <div className="grid grid-cols-2 gap-4 text-sm">
                            //             <div className="bg-stone-50 p-3 rounded-xl">
                            //                 <p className="text-xs text-gray-900">วันที่</p>
                            //                 <b className="text-gray-600">{scanData.date}</b>
                            //             </div>
                            //             <div className="bg-stone-50 p-3 rounded-xl">
                            //                 <p className="text-xs text-gray-900">เวลา</p>
                            //                 <b className="text-gray-600">{scanData.slot}</b>
                            //             </div>
                            //             <div className="col-span-2 bg-stone-50 p-3 rounded-xl">
                            //                 <p className="text-xs text-gray-900">เบอร์โทร</p>
                            //                 <b className="text-gray-600">{scanData.phone}</b>
                            //             </div>
                            //         </div>
                            //         {scanData.status === "CHECKED_IN" && <div className="bg-blue-50 text-blue-700 p-3 rounded-xl text-sm flex gap-2 items-center"><FiCheckCircle /> รายการนี้เช็คอินไปแล้ว</div>}
                            //         {scanData.status === "CANCELLED" && <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-sm flex gap-2 items-center"><FiXCircle /> รายการนี้ถูกยกเลิก</div>}
                            //         <hr className="border-dashed border-gray-200" />
                            //         {scanData.status === "BOOKED" ? (
                            //             <div className="space-y-3">
                            //                 <button onClick={handleConfirmCheckIn} disabled={loading} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] disabled:opacity-50">
                            //                     {loading ? "กำลังบันทึก..." : "ยืนยันเช็คอิน"}
                            //                 </button>
                            //             </div>
                            //         ) : (
                            //             <button onClick={handleResetScan} className="w-full py-3 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl font-bold">สแกนรายการต่อไป</button>
                            //         )}
                            //     </div>
                            // </div>
                            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden relative flex flex-col border border-emerald-100 animate-fade-in">
                                {/* --- Header (เขียวเข้มสไตล์ Ticket) --- */}
                                <div className="bg-emerald-800 p-8 text-white relative overflow-hidden flex-shrink-0 text-center">
                                    {/* ลายกราฟิกจางๆ ด้านหลัง */}
                                    <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4 pointer-events-none">
                                        <FiActivity size={120} />
                                    </div>

                                    <button onClick={handleResetScan} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white/80 transition-all z-20">
                                        <FiRefreshCw size={18} />
                                    </button>

                                    <div className="relative z-10 flex flex-col items-center">
                                        {/* ✅ แสดงรูปโปรไฟล์ LINE */}
                                        <div className="relative mb-4">
                                            {scanData.line_picture_url ? (
                                                <img
                                                    src={scanData.line_picture_url}
                                                    alt="LINE Profile"
                                                    referrerPolicy="no-referrer"
                                                    className="w-24 h-24 rounded-2xl border-4 border-white/20 object-cover shadow-2xl"
                                                />
                                            ) : (
                                                <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                                                    <FiUser size={48} className="text-white/70" />
                                                </div>
                                            )}

                                            {/* Badge สถานะที่มุมรูป */}
                                            <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-lg border border-gray-50">
                                                {scanData.status === "CHECKED_IN" ? <FiCheckCircle className="text-emerald-500" size={20} /> : scanData.status === "CANCELLED" ? <FiXCircle className="text-rose-500" size={20} /> : <FiClock className="text-yellow-500" size={20} />}
                                            </div>
                                        </div>

                                        <h2 className="text-2xl font-bold tracking-tight mb-1">{scanData.name}</h2>
                                        <div className="bg-white/10 px-3 py-1 rounded-full border border-white/10">
                                            <p className="text-emerald-100 text-xs font-mono tracking-widest">#{scanData.code}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* --- Body Details --- */}
                                <div className="p-8 space-y-6 bg-white relative">
                                    {/* กราฟิก Notch รอยปรุเหมือนตั๋ว */}
                                    <div className="absolute -top-3 left-0 right-0 flex justify-between px-6 pointer-events-none">
                                        <div className="w-6 h-6 bg-emerald-800 rounded-full -ml-9"></div>
                                        <div className="w-6 h-6 bg-emerald-800 rounded-full -mr-9"></div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                        <div className="space-y-1">
                                            <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">วันที่นัดหมาย</label>
                                            <div className="flex items-center gap-2 text-gray-800 font-semibold text-sm">
                                                <FiCalendar className="text-emerald-500" /> {scanData.date}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">เวลาที่จอง</label>
                                            <div className="flex items-center gap-2 text-gray-800 font-semibold text-sm">
                                                <FiClock className="text-emerald-500" /> {scanData.slot}
                                            </div>
                                        </div>
                                        <div className="col-span-2 pt-2">
                                            <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                                            <div className="flex items-center gap-2 text-gray-800 font-medium text-sm bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <FiPhone className="text-emerald-500" /> {scanData.phone}
                                            </div>
                                        </div>
                                    </div>

                                    {/* --- แจ้งเตือนสถานะ (ถ้าเช็คอินหรือยกเลิกแล้ว) --- */}
                                    {scanData.status === "CHECKED_IN" && (
                                        <div className="bg-blue-50 border border-blue-100 text-blue-700 p-4 rounded-2xl text-xs flex gap-3 items-center">
                                            <FiCheckCircle size={18} className="flex-shrink-0" />
                                            <b>ท่านนี้เข้ารับบริการเรียบร้อยแล้ว</b>
                                        </div>
                                    )}
                                    {scanData.status === "CANCELLED" && (
                                        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl text-xs flex gap-3 items-center">
                                            <FiXCircle size={18} className="flex-shrink-0" />
                                            <b>รายการนี้ถูกยกเลิกแล้ว ไม่สามารถเช็คอินได้</b>
                                        </div>
                                    )}

                                    {/* --- Action Buttons --- */}
                                    <div className="pt-4 border-t border-gray-50">
                                        {scanData.status === "BOOKED" ? (
                                            <button
                                                onClick={handleConfirmCheckIn}
                                                disabled={loading}
                                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-xl shadow-emerald-100 transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                                            >
                                                {loading ? "กำลังบันทึกข้อมูล..." : <><FiCheckCircle /> ยืนยันการเช็คอิน</>}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleResetScan}
                                                className="w-full py-4 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-2xl font-bold transition-all text-sm"
                                            >
                                                สแกนรายการถัดไป
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )
                }
            </main >
        </div >
    );
}