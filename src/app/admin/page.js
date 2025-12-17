'use client'
import { useEffect, useMemo, useState, useRef } from "react";
import Swal from "sweetalert2";
// import { Html5QrcodeScanner } from "html5-qrcode";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import * as XLSX from 'xlsx';
import { QRCodeCanvas } from "qrcode.react";

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
    FiCamera, FiImage, FiAlertTriangle, FiCameraOff, FiPlus, FiTrash2, FiPieChart, FiBarChart2,
    FiLoader, FiPhone, FiLock, FiUnlock, FiCopy, FiFileText, FiUser
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

function renderStatusBadge(status) {
    switch (status) {
        case "BOOKED": return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200"><FiClock /> รอใช้บริการ</span>;
        case "CHECKED_IN": return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200"><FiCheckCircle /> เช็คอินแล้ว</span>;
        case "CANCELLED": return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200"><FiXCircle /> ยกเลิก</span>;
        default: return <span className="text-gray-500">-</span>;
    }
}

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
    // const [authToken, setAuthToken] = useState("");
    const isAuthed = !!authToken;
    const [showDateManager, setShowDateManager] = useState(false)
    useEffect(() => {
        const savedToken = localStorage.getItem("admin_token");
        if (savedToken) {
            setAuthToken(savedToken);
        }
    }, []);
    async function reloadData() {
        if (!authToken) return;
        setLoading(true);
        try {
            const [resB, resS] = await Promise.all([
                adminGetBookings(date, authToken),
                adminGetSlotsSummary(date, authToken)
            ]);

            // 🔥 FIX: แปลงข้อมูลจาก Supabase ให้เข้ากับ UI เดิม
            const rawItems = resB.items || [];
            const mappedBookings = rawItems.map(b => ({
                ...b,
                name: b.customer_name || b.name, // ใช้ customer_name ถ้ามี
                code: b.booking_code || b.code,   // ใช้ booking_code ถ้ามี
                date: b.booking_date || b.date,
                slot: b.slot_label || b.slot
            }));

            setBookings(mappedBookings);
            setSlots(resS.items || []);
        } catch (err) {
            console.error(err);
            Toast.fire({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ' });
        } finally {
            setLoading(false);
        }
    }

    const loadDates = () => {
        getManageDates()
            .then(res => { if (res.items) setManageDates(res.items); })
            .catch(err => console.error("Load dates error:", err));
    };

    useEffect(() => { if (authToken) { reloadData(); loadDates(); } }, [date, authToken]);

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
        const actionName = newStatus === "CHECKED_IN" ? "เช็คอิน" : "ยกเลิก";

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

            // ถ้าหน้าสแกนเปิดอยู่ ก็อัปเดตด้วย
            if (scanData && (scanData.code === targetCode || scanData.booking_code === targetCode)) {
                setScanData(prev => ({ ...prev, status: newStatus }));
            }

            Toast.fire({ icon: 'success', title: `บันทึกสถานะเรียบร้อย` });
            // reloadData();

        } catch (err) {
            Swal.fire("Error", "บันทึกไม่สำเร็จ: " + err.message, "error");
        }
    }

    // async function handleEditCapacity(slot) {
    //     const { value: newCap } = await Swal.fire({
    //         title: `แก้ไขจำนวนรับ (${slot.label})`,
    //         input: "number",
    //         inputValue: slot.capacity,
    //         showCancelButton: true,
    //         confirmButtonText: "บันทึก",
    //         confirmButtonColor: "#059669"
    //     });

    //     if (newCap) {
    //         Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    //         try {
    //             const res = await adminUpdateSlotCapacity(slot.id, newCap, authToken);
    //             Swal.close();
    //             if (res.ok) {
    //                 Toast.fire({ icon: 'success', title: 'บันทึกสำเร็จ' });
    //                 reloadData();
    //             } else {
    //                 throw new Error(res.message);
    //             }
    //         } catch (err) { Swal.fire("Error", err.message, "error"); }
    //     }
    // }

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
            const searchLower = searchTerm.toLowerCase();
            const targetName = (b.name || b.customer_name || "").toLowerCase();
            const targetCode = (b.code || b.booking_code || "").toLowerCase();

            const matchSearch = targetName.includes(searchLower) ||
                (b.phone || "").includes(searchTerm) ||
                targetCode.includes(searchLower);
            const matchStatus = filterStatus === "ALL" || b.status === filterStatus;
            return matchSearch && matchStatus;
        });
    }, [bookings, searchTerm, filterStatus]);

    const chartData = useMemo(() => {
        const stats = {};
        bookings.forEach(b => {
            if (b.status !== "CANCELLED") {
                const time = b.slot || b.slot_label;
                stats[time] = (stats[time] || 0) + 1;
            }
        });
        return Object.keys(stats).sort().map(time => ({ name: time, count: stats[time] }));
    }, [bookings]);

    const pieData = useMemo(() => {
        const stats = { BOOKED: 0, CHECKED_IN: 0, CANCELLED: 0 };
        bookings.forEach(b => { if (stats[b.status] !== undefined) stats[b.status]++; });
        return [
            { name: 'รอรับบริการ', value: stats.BOOKED, color: '#EAB308' },
            { name: 'เช็คอินแล้ว', value: stats.CHECKED_IN, color: '#10B981' },
            { name: 'ยกเลิก', value: stats.CANCELLED, color: '#EF4444' }
        ].filter(i => i.value > 0);
    }, [bookings]);

    const kpiStats = useMemo(() => ({
        total: bookings.length,
        checkedIn: bookings.filter(b => b.status === "CHECKED_IN").length,
        cancelled: bookings.filter(b => b.status === "CANCELLED").length,
        waiting: bookings.filter(b => b.status === "BOOKED").length
    }), [bookings]);

    useEffect(() => {
        let mounted = true;
        if (activeTab === "scan" && !scanData && cameraEnabled) {
            const timer = setTimeout(() => { if (mounted) startScanner(); }, 300);
            return () => { mounted = false; clearTimeout(timer); stopScanner(); };
        } else { stopScanner(); }
    }, [activeTab, scanData, cameraEnabled]);

    // const startScanner = async () => {
    //     if (!document.getElementById("reader")) return;
    //     if (scannerRef.current) await stopScanner();
    //     const html5QrCode = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0, showTorchButtonIfSupported: true }, false);
    //     scannerRef.current = html5QrCode;
    //     setScanStatus("starting"); setScanErrorMsg("");

    //     html5QrCode.render((decodedText) => {
    //         handleScanSuccess(decodedText);
    //         html5QrCode.clear();
    //     }, (error) => { });
    //     setScanStatus("active");
    // };

    const startScanner = async () => {
        if (!document.getElementById("reader")) return;

        // เคลียร์ของเก่าก่อนเริ่มใหม่
        if (scannerRef.current) await stopScanner();

        // 1. สร้าง Instance แบบกำหนดเอง (ไม่ใช่ Scanner UI)
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        setScanStatus("starting");
        setScanErrorMsg("");

        try {
            // 2. สั่ง Start โดยบังคับ facingMode: "environment" (กล้องหลัง)
            await html5QrCode.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                (decodedText) => {
                    // เมื่อสแกนเจอ
                    handleScanSuccess(decodedText);
                    // ถ้าอยากให้เจอแล้วหยุดกล้องเลย ให้เปิดบรรทัดล่างนี้
                    // html5QrCode.stop().catch(err => console.error(err));
                },
                (errorMessage) => {
                    // กรณีสแกนไม่เจอในแต่ละเฟรม (ปล่อยว่างได้)
                }
            );
            setScanStatus("active");
        } catch (err) {
            console.error("Camera Error:", err);
            setScanStatus("error");
            setScanErrorMsg("ไม่สามารถเปิดกล้องหลังได้ หรือไม่มีสิทธิ์เข้าถึง");
        }
    };

    // const stopScanner = async () => {
    //     if (scannerRef.current) {
    //         try { await scannerRef.current.clear(); } catch (e) { }
    //         scannerRef.current = null;
    //         setScanStatus("idle");
    //     }
    // };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                // เช็คว่าเป็น Instance ของ Html5Qrcode หรือไม่ เพื่อสั่ง stop
                // (try-catch เผื่อไว้กรณีมันหยุดไปแล้ว)
                await scannerRef.current.stop();
                await scannerRef.current.clear();
            } catch (e) {
                console.log("Stop scanner error ignored:", e);
            }
            scannerRef.current = null;
            setScanStatus("idle");
        }
    };

    const handleScanSuccess = async (decodedText) => {
        let finalCode = decodedText;
        try { const url = new URL(decodedText); const c = url.searchParams.get("code"); if (c) finalCode = c; } catch (e) { }
        setCameraEnabled(false);
        Swal.fire({ title: 'กำลังค้นหา...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
        try {
            const res = await getBookingByCode(finalCode);
            Swal.close();
            if (res.ok && res.booking) {
                const b = res.booking;
                // Map ข้อมูลสำหรับหน้า Scan ให้ตรงกัน
                setScanData({
                    ...b,
                    name: b.customer_name || b.name,
                    code: b.booking_code || b.code,
                    slot: b.slot_label || b.slot,
                    date: b.booking_date || b.date
                });
            }
            else Swal.fire({ icon: "error", title: "ไม่พบข้อมูล", text: `รหัส: ${finalCode}`, timer: 2000, showConfirmButton: false });
        } catch (err) { Swal.fire("Error", err.message, "error"); }
    };

    // const handleFileUpload = async (e) => {
    //     if (!e.target.files || e.target.files.length === 0) return;
    //     const file = e.target.files[0];
    //     setCameraEnabled(false);
    //     Swal.fire({ title: 'กำลังอ่านรูป...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    //     const html5QrCode = new Html5Qrcode("reader-file-hidden");
    //     try {
    //         const result = await html5QrCode.scanFileV2(file, true);
    //         if (result && result.decodedText) handleScanSuccess(result.decodedText);
    //     } catch (err) {
    //         Swal.close(); Swal.fire("อ่านรูปไม่ได้", "ไม่พบ QR Code", "error");
    //     } finally {
    //         html5QrCode.clear().catch(() => { });
    //         e.target.value = '';
    //     }
    // };
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
                        <input id="confirm-pw" class="swal2-input custom-input" type="password" placeholder="พิมพ์อีกครั้ง">
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

                /* สีไอคอนกรณีผ่าน (เช็คอินแล้ว - Emerald) */
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

    const handleExportExcel = () => {
        if (filteredBookings.length === 0) {
            return Swal.fire("แจ้งเตือน", "ไม่มีข้อมูลสำหรับการส่งออก", "warning");
        }

        // 1. เตรียมข้อมูลที่จะใส่ใน Excel (เลือกเฉพาะฟิลด์ที่ต้องการ)
        const dataToExport = filteredBookings.map((b, index) => ({
            "ลำดับ": index + 1,
            "วันที่จอง": b.date,
            "รอบเวลา": b.slot,
            "ชื่อ-นามสกุล": b.name,
            "เบอร์โทรศัพท์": b.phone,
            "รหัสการจอง": b.code,
            "สถานะ": b.status === 'CHECKED_IN' ? 'เช็คอินแล้ว' :
                b.status === 'CANCELLED' ? 'ยกเลิก' : 'รอรับบริการ'
        }));

        // 2. สร้าง Worksheet
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);

        // 3. กำหนดความกว้างของคอลัมน์เพื่อให้ดูสวยงาม
        const wscols = [
            { wch: 6 },  // ลำดับ
            { wch: 12 }, // วันที่
            { wch: 15 }, // รอบเวลา
            { wch: 25 }, // ชื่อ
            { wch: 15 }, // เบอร์โทร
            { wch: 15 }, // รหัส
            { wch: 15 }  // สถานะ
        ];
        worksheet['!cols'] = wscols;

        // 4. สร้าง Workbook และบันทึกไฟล์
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "รายการจอง");

        // ตั้งชื่อไฟล์ตามวันที่ที่เลือก
        XLSX.writeFile(workbook, `Booking_Report_${date}.xlsx`);

        Toast.fire({
            icon: 'success',
            title: 'ส่งออกไฟล์ Excel สำเร็จ'
        });
    };
    return (
        <div className="min-h-screen bg-stone-50 font-sans flex flex-col">
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap'); .font-sans { font-family: 'Prompt', sans-serif; }`}</style>

            {loading && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-white/60 backdrop-blur-[2px] transition-all duration-300">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl border border-emerald-100 flex flex-col items-center animate-bounce-slow">
                        <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
                        <p className="text-emerald-800 font-semibold text-sm animate-pulse">กำลังโหลดข้อมูล...</p>
                    </div>
                </div>
            )}

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
                    <div className="w-full max-w-7xl space-y-6 animate-fade-in-up">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                                <FiCalendar className="text-gray-400" />
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-gray-900 bg-transparent border-none outline-none text-sm font-medium" />
                            </div>
                            <button onClick={reloadData} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-70">
                                <FiRefreshCw className={loading ? "animate-spin" : ""} /> {loading ? "กำลังโหลด..." : "อัปเดตข้อมูล"}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-gray-500">ทั้งหมด</p>
                                    <p className="text-xl font-bold text-gray-900">{kpiStats.total}</p>
                                </div>
                                <FiUsers className="text-gray-300 text-2xl" />
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-gray-500">รอรับบริการ</p>
                                    <p className="text-xl font-bold text-yellow-600">{kpiStats.waiting}</p>
                                </div>
                                <FiClock className="text-yellow-200 text-2xl" />
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-gray-500">เช็คอิน</p>
                                    <p className="text-xl font-bold text-emerald-600">{kpiStats.checkedIn}</p>
                                </div>
                                <FiCheckCircle className="text-emerald-200 text-2xl" />
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-gray-500">ยกเลิก</p>
                                    <p className="text-xl font-bold text-rose-600">{kpiStats.cancelled}</p>
                                </div>
                                <FiXCircle className="text-rose-200 text-2xl" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <div className="lg:col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="text-sm font-bold text-gray-600 mb-4 flex items-center gap-2">
                                    <FiBarChart2 /> สถิติการจองวันนี้
                                </h3>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name"
                                                fontSize={12}
                                                tick={{ fontSize: 10 }} />
                                            <YAxis allowDecimals={false}
                                                fontSize={12} />
                                            <Tooltip cursor={{ fill: '#f0fdf4' }}
                                                contentStyle={{ borderRadius: '8px' }}
                                                labelStyle={{
                                                    color: '#064e3b',
                                                    fontWeight: 'bold'
                                                }} />
                                            <Bar dataKey="count" name="จำนวน" fill="#059669" radius={[4, 4, 0, 0]} barSize={40} activeBar={{ fill: '#047857' }} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="text-sm font-bold text-gray-600 mb-4 flex items-center gap-2">
                                    <FiPieChart /> สัดส่วนสถานะ
                                </h3>
                                <div className="h-[250px] w-full flex justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%"
                                                innerRadius={50} outerRadius={80}
                                                paddingAngle={5} dataKey="value">
                                                {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <div className="lg:col-span-8 flex flex-col h-[653px] bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden">
                                <div className="p-4 border-b border-gray-100 flex gap-3 bg-gray-50/50">
                                    {/* <div className="flex gap-3 flex-1">
                                        <input type="text" placeholder="ค้นหา..." className="text-gray-900 placeholder:text-gray-400 flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                        <select
                                            // className="placeholder:text-gray-400 text-gray-900 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none cursor-pointer" 
                                            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-emerald-50 hover:text-emerald-600 transition-all shadow-sm"

                                            value={filterStatus}
                                            onChange={e => setFilterStatus(e.target.value)}>
                                            <option value="ALL">ทุกสถานะ</option>
                                            <option value="BOOKED">รอรับบริการ</option>
                                            <option value="CHECKED_IN">เช็คอินแล้ว</option>
                                            <option value="CANCELLED">ยกเลิกแล้ว</option>
                                        </select>
                                    </div> */}
                                    <div className="flex flex-wrap md:flex-nowrap gap-3 flex-1">
                                        {/* 1. ช่องค้นหา - ปรับขนาดใหญ่ขึ้น */}
                                        <div className="relative flex-1 group">
                                            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                                                <FiSearch className="text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="ค้นหาชื่อ, เบอร์โทร หรือรหัสจอง..."
                                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 text-gray-900 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                            />
                                        </div>

                                        {/* 2. Dropdown เลือกสถานะ - ปรับขนาดใหญ่ขึ้นให้เท่ากับ Input */}
                                        <div className="relative w-full md:w-[110px] group">
                                            <select
                                                className=" w-full appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-[14px] font-bold hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500/20 text-center"
                                                value={filterStatus}
                                                onChange={e => setFilterStatus(e.target.value)}
                                            >
                                                <option value="ALL">ทั้งหมด</option>
                                                <option value="BOOKED">รอรับบริการ</option>
                                                <option value="CHECKED_IN">เช็คอินแล้ว</option>
                                                <option value="CANCELLED">ยกเลิกแล้ว</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleExportExcel}
                                            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-emerald-50 hover:text-emerald-600 transition-all shadow-sm"
                                        >
                                            <FiFileText className="text-emerald-500 text-sm" /> Export Excel
                                            {/* <FiFileText className="text-emerald-600" />
                                            <span>Export Excel</span> */}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 sticky top-0 text-xs font-bold text-gray-500 uppercase">
                                            <tr>
                                                <th className="px-4 py-3">เวลา</th>
                                                <th className="px-4 py-3">ชื่อ-สกุล / รหัสการจอง</th>
                                                <th className="px-4 py-3">เบอร์โทร</th>
                                                <th className="px-4 py-3">สถานะ</th>
                                                <th className="px-4 py-3 text-right">จัดการ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm divide-y divide-gray-50">
                                            {filteredBookings.length > 0 ? (
                                                filteredBookings.map((b, i) => (
                                                    <tr key={i} className="hover:bg-emerald-50/30">
                                                        <td className="px-4 py-3 font-medium text-emerald-700">{b.slot}</td>
                                                        {/* <td className="px-4 py-3"> */}

                                                        {/* <div className="font-bold text-gray-800">{b.name}</div> */}
                                                        {/* <div className="flex items-center gap-2">
                                                                <span className="font-bold text-gray-800">{b.name}</span>
                                                                <button
                                                                    onClick={() => handleCopy(b.name, "ชื่อ")}
                                                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-emerald-600 transition-all"
                                                                    title="คัดลอกชื่อ"
                                                                >
                                                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 17.7L8 19.2C8 20.3 8.9 21.2 10 21.2L20.5 21.2C21.6 21.2 22.5 20.3 22.5 19.2L22.5 8.7C22.5 7.6 21.6 6.7 20.5 6.7L19 6.7M14 14.8L14 3.3C14 2.2 13.1 1.3 12 1.3L1.5 1.3C0.4 1.3 -0.5 2.2 -0.5 3.3L-0.5 14.8C-0.5 15.9 0.4 16.8 1.5 16.8L12 16.8C13.1 16.8 14 15.9 14 14.8Z"></path></svg>
                                                                </button>
                                                            </div>

                                                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">#{b.code}</div> */}

                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-1.5 group/name">
                                                                <span className="font-bold text-gray-800">{b.name}</span>
                                                                <button
                                                                    onClick={() => handleCopy(b.name, "ชื่อ")}
                                                                    className="text-gray-300 hover:text-emerald-600 transition-colors"
                                                                    title="คัดลอกชื่อ"
                                                                >
                                                                    <FiCopy size={13} />
                                                                </button>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-0.5 group/code">
                                                                <span className="text-[10px] text-gray-400 font-mono">#{b.code}</span>
                                                                <button
                                                                    onClick={() => handleCopy(b.code, "รหัสจอง")}
                                                                    className="text-gray-300 hover:text-emerald-500 transition-colors"
                                                                    title="คัดลอกรหัส"
                                                                >
                                                                    <FiCopy size={10} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                        {/* </td> */}
                                                        {/* <td className="px-4 py-3 font-mono text-gray-600 text-xs">{b.phone}</td> */}
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-1.5 group/phone">
                                                                <span className="font-mono text-gray-600 text-xs">{b.phone}</span>
                                                                <button
                                                                    onClick={() => handleCopy(b.phone, "เบอร์โทร")}
                                                                    className="text-gray-300 hover:text-blue-500 transition-colors"
                                                                    title="คัดลอกเบอร์โทร"
                                                                >
                                                                    <FiCopy size={12} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">{renderStatusBadge(b.status)}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            {b.status === "BOOKED" && <div className="flex justify-end gap-2"><button onClick={() => handleChangeStatus(b, "CHECKED_IN")} className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"><FiCheckSquare /></button><button onClick={() => handleChangeStatus(b, "CANCELLED")} className="p-1.5 bg-rose-100 text-rose-700 rounded hover:bg-rose-200"><FiXCircle /></button></div>}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                // <tr>
                                                //     <td colSpan="5" className="px-4 py-20 text-center">
                                                //         <div className="flex flex-col items-center justify-center text-gray-400 gap-2">
                                                //             <FiSearch size={40} className="opacity-20" />
                                                //             <p className="text-sm font-medium">ไม่พบข้อมูลการจองที่ค้นหา</p>
                                                //             <p className="text-xs opacity-60">ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ</p>
                                                //         </div>
                                                //     </td>
                                                // </tr>
                                                <tr>
                                                    <td colSpan="5" className="p-0">

                                                        <div className="flex flex-col items-center justify-center h-[450px] text-gray-400 gap-3">
                                                            <div className="p-4 bg-gray-50 rounded-full">
                                                                <FiSearch size={48} className="opacity-20" />
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-base font-semibold text-gray-500">ไม่พบข้อมูลที่ค้นหา</p>
                                                                <p className="text-xs opacity-60">ตรวจสอบคำสะกด หรือเปลี่ยนตัวกรองสถานะใหม่</p>
                                                            </div>
                                                            {/* ปุ่มสำหรับล้างการค้นหา (Option เสริม) */}
                                                            <button
                                                                onClick={() => { setSearchTerm(""); setFilterStatus("ALL"); }}
                                                                className="mt-2 text-xs text-emerald-600 hover:underline font-medium"
                                                            >
                                                                ล้างตัวกรองทั้งหมด
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                    <h3 className="text-sm font-bold text-gray-600 mb-4 flex items-center gap-2"><FiCalendar className="text-emerald-600" /> จัดการวันเปิดให้บริการ</h3>
                                    <div className="flex gap-2 mb-4">
                                        {/* 1. กล่องใส่วันที่ */}
                                        <div className="relative flex-1 border border-gray-200 rounded-lg bg-white focus-within:ring-1 focus-within:ring-emerald-500 overflow-hidden">

                                            <input
                                                type="date"
                                                value={newDate}
                                                onChange={e => setNewDate(e.target.value)}
                                                onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                                onFocus={() => setIsFocused(true)}
                                                onBlur={() => setIsFocused(false)}
                                                style={{ colorScheme: 'light' }}
                                                className={`
                                                text-gray-900 w-full h-full px-2 py-1.5 text-xs outline-none bg-transparent border-none
                                                relative z-10 
                                                ${!newDate ? 'text-transparent' : 'text-gray-900'}
                                            `}
                                            />

                                            {/* 2. Placeholder: วางซ้อนข้างหลัง */}
                                            {(!newDate && !isFocused) && (
                                                <span className="absolute left-2 top-1.5 text-xs text-gray-400 pointer-events-none z-0">
                                                    --เลือกวันที่เปิดให้บริการ--
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleAddDate}
                                            disabled={!newDate || addingDate}
                                            className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {addingDate ? <FiLoader className="animate-spin" /> : <FiPlus />} {addingDate ? "..." : "เพิ่มวันที่"}
                                        </button>
                                    </div>
                                    {/* <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1" > */}
                                    <div className="grid grid-cols-2 gap-2 max-h-[155px] overflow-y-auto pr-1 ">
                                        {manageDates.length > 0 ? manageDates.map((item) => (
                                            <div
                                                key={item.date}
                                                className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all h-[45px] ${item.status === "OPEN"
                                                    ? "bg-emerald-50 border-emerald-200"
                                                    : "bg-gray-50 border-gray-200 opacity-75"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => handleToggleStatus(item)}
                                                        className={`p-1.5 rounded-full transition-colors ${item.status === "OPEN"
                                                            ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                                                            : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                                                            }`}
                                                        title={item.status === "OPEN" ? "คลิกเพื่อปิด" : "คลิกเพื่อเปิด"}
                                                    >
                                                        {item.status === "OPEN" ? <FiUnlock size={14} /> : <FiLock size={14} />}
                                                    </button>
                                                    <span className={`text-sm font-medium ${item.status === "OPEN" ? "text-emerald-900" : "text-gray-500 line-through decoration-gray-400"}`}>
                                                        {formatThaiDateAdmin(item.date)}
                                                    </span>
                                                </div>
                                                <button onClick={() => handleDeleteDate(item.date)} className="text-gray-400 hover:text-rose-500 p-1 rounded-md hover:bg-rose-50 transition-colors"><FiTrash2 size={16} /></button>
                                            </div>
                                        )) : (
                                            <div className="col-span-2 text-center py-6 border-2 border-dashed border-gray-100 rounded-xl"><p className="text-xs text-gray-400">ยังไม่มีวันเปิดจอง</p></div>
                                        )}
                                    </div>
                                </div>



                                {/* ส่วนแสดงผลจัดการคิว */}
                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col h-[350px]">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-sm font-bold text-gray-600 flex items-center gap-2">
                                            <FiLayers className="text-blue-600" /> จัดการช่วงเวลา / คิว ({Array.isArray(slots) ? slots.length : 0})
                                        </h3>
                                        {/* ปุ่มเพิ่มรอบเวลาใหม่ */}
                                        {/* <button
                                            onClick={handleAddSlot}
                                            className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-100 flex items-center gap-1 transition-colors"
                                        >
                                            <FiPlus /> เพิ่มรอบ
                                        </button> */}
                                        <button
                                            onClick={handleAddSlot}
                                            className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-700 flex items-center gap-2 transition-colors shadow-sm"
                                        >
                                            <FiPlus /> เพิ่ม
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                        {Array.isArray(slots) && slots.length > 0 ? (
                                            slots.map((s) => (
                                                <div key={s.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col gap-2 group hover:border-emerald-200 transition-colors">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-bold text-sm text-gray-700">{s.label}</span>
                                                        <div className="flex gap-1">
                                                            {/* ปุ่มแก้ไข */}
                                                            <button
                                                                onClick={() => handleEditSlotFull(s)}
                                                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                                                title="แก้ไข"
                                                            >
                                                                <FiEdit2 size={12} />
                                                            </button>
                                                            {/* ปุ่มลบ */}
                                                            <button
                                                                onClick={() => handleDeleteSlot(s)}
                                                                className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                                                                title="ลบ"
                                                            >
                                                                <FiTrash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {/* Progress Bar */}
                                                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                        {/* <div
                                                            className={`h-full rounded-full transition-all duration-500 ${s.remaining === 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                            style={{ width: `${(s.booked / s.capacity) * 100}%` }}
                                                        ></div> */}
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${s.remaining === 0
                                                                ? 'bg-rose-500' // สีแดงเมื่อเต็ม
                                                                : (s.booked / s.capacity) >= 0.6
                                                                    ? 'bg-orange-500' // 🔥 สีส้มเมื่อจองเกิน 80%
                                                                    : 'bg-emerald-500' // สีเขียวปกติ
                                                                }`}
                                                            style={{ width: `${(s.booked / s.capacity) * 100}%` }}
                                                        ></div>
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
                                                <button onClick={handleAddSlot} className="mt-2 text-emerald-600 underline hover:text-emerald-700">
                                                    + เพิ่มรอบแรก
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // ... (ส่วน Scanner เหมือนเดิม) ...
                    <div className="w-full max-w-md animate-fade-in-up space-y-6">
                        {!scanData ? (
                            <>
                                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-4 relative flex flex-col">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-bold text-gray-700 flex gap-2 items-center"><FiCamera /> กล้อง</h3>
                                        <button onClick={() => setCameraEnabled(!cameraEnabled)} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${cameraEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{cameraEnabled ? 'เปิดอยู่' : 'ปิดอยู่'}</button>
                                    </div>
                                    <div className="relative w-full rounded-xl overflow-hidden bg-black min-h-[250px] mb-4">
                                        {cameraEnabled ? (
                                            <>
                                                <div id="reader" className="w-full h-full"></div>
                                                {scanStatus === 'starting' && <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100/90 z-20"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div><span className="text-xs text-gray-500">กำลังเปิด...</span></div>}
                                                {scanStatus === 'error' && <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-center p-4 z-20"><FiAlertTriangle className="text-rose-500 text-3xl mb-2" /><p className="text-xs text-gray-500 mb-2">{scanErrorMsg}</p><button onClick={() => setCameraEnabled(false)} className="text-emerald-600 underline text-xs">ปิดกล้อง</button></div>}
                                            </>
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400"><FiCameraOff size={40} /><p className="text-sm mt-2">กล้องถูกปิด</p></div>
                                        )}
                                    </div>
                                    <div className="pt-2 border-t border-gray-100">
                                        <div id="reader-file-hidden" className="hidden"></div>
                                        <label className="flex items-center justify-center gap-2 w-full py-3 bg-stone-100 text-stone-600 rounded-xl font-semibold cursor-pointer hover:bg-stone-200 transition-colors"><FiImage /> เลือกรูป QR Code <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} /></label>
                                    </div>
                                </div>
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
                                            <b>ผู้ป่วยท่านนี้เข้ารับบริการเรียบร้อยแล้ว</b>
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
                )}
            </main>
        </div>
    );
}