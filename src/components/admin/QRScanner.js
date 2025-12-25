'use client'
import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { FiCamera, FiCameraOff, FiRefreshCw, FiImage, FiSearch, FiAlertTriangle, FiUser, FiCheckCircle, FiXCircle, FiClock, FiCalendar, FiPhone } from "react-icons/fi";
import Swal from "sweetalert2";

export default function QRScanner({
    activeTab, scanData, setScanData, onScanSuccess, onConfirmCheckIn, onReset, loading, manualCode, setManualCode
}) {
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [scanStatus, setScanStatus] = useState("idle");
    const [scanErrorMsg, setScanErrorMsg] = useState("");
    const [devices, setDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [autoCheckIn, setAutoCheckIn] = useState(true);
    const autoCheckInRef = useRef(autoCheckIn);
    const scannerRef = useRef(null);

    useEffect(() => {
        autoCheckInRef.current = autoCheckIn;
    }, [autoCheckIn]);

    useEffect(() => {
        if (activeTab === 'scan') {
            const getDevices = async () => {
                try {
                    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
                    await navigator.mediaDevices.getUserMedia({ video: true });
                    const allDevices = await navigator.mediaDevices.enumerateDevices();
                    const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
                    setDevices(videoDevices);
                    if (videoDevices.length > 0 && !selectedDeviceId) {
                        const backCam = videoDevices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'));
                        setSelectedDeviceId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
                    }
                } catch (error) { console.error("Cam Error", error); }
            };
            getDevices();
        }
    }, [activeTab]);

    useEffect(() => {
        let mounted = true;
        if (activeTab === "scan" && !scanData && cameraEnabled && selectedDeviceId) {
            const timer = setTimeout(() => { if (mounted) startScanner(); }, 500);
            return () => { mounted = false; clearTimeout(timer); stopScanner(); };
        } else { stopScanner(); }
    }, [activeTab, scanData, cameraEnabled, selectedDeviceId]);

    const startScanner = async () => {
        if (!document.getElementById("reader")) return;
        if (scannerRef.current) await stopScanner();
        await new Promise(r => setTimeout(r, 1000));

        // ✅✅✅ Security Check ครั้งที่ 2 (สำคัญมาก!): 
        // เช็คอีกทีว่าหลังจากรอ 1 วิแล้ว กล่อง reader ยังอยู่ไหม?
        // ถ้าผู้ใช้กดปิดกล้อง หรือเปลี่ยนหน้าไปแล้ว ระหว่างรอ -> ให้หยุดทำงานทันที อย่าฝืนสร้างกล้อง
        if (!document.getElementById("reader") || !cameraEnabled) return;
        
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        setScanStatus("starting"); setScanErrorMsg("");
        const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
        try {
            await html5QrCode.start(selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : { facingMode: "environment" }, config,
                (decodedText) => onScanSuccess(decodedText, autoCheckIn),
                // (decodedText) => onScanSuccess(decodedText, autoCheckInRef.current),
                () => { });
            setScanStatus("active");
        } catch (err) {
            try {
                await html5QrCode.start({ facingMode: "user" }, config,
                    (decodedText) => onScanSuccess(decodedText, autoCheckIn),
                    // (decodedText) => onScanSuccess(decodedText, autoCheckInRef.current),
                    () => { }); setScanStatus("active");
            }
            catch (err2) { setScanStatus("error"); setScanErrorMsg("กล้องค้าง! กรุณารีเฟรชหน้าเว็บ"); }
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try { if (scannerRef.current.isScanning) await scannerRef.current.stop(); scannerRef.current.clear(); } catch (e) { }
            scannerRef.current = null; setScanStatus("idle");
        }
    };

    const handleFileUpload = async (e) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        setCameraEnabled(false);
        Swal.fire({ title: 'กำลังอ่านรูป...', didOpen: () => Swal.showLoading() });
        try {
            const html5QrCode = new Html5Qrcode("reader-file-hidden");
            const result = await html5QrCode.scanFileV2(file, true);
            if (result && result.decodedText) onScanSuccess(result.decodedText, autoCheckIn);
            // if (result && result.decodedText) onScanSuccess(result.decodedText, autoCheckInRef.current);
        } catch (err) { Swal.close(); Swal.fire("อ่านรูปไม่ได้", "ไม่พบ QR Code", "error"); } finally { e.target.value = ''; }
    };

    return (
        <div className="w-full max-w-md animate-fade-in-up space-y-6">
            {!scanData ? (
                <>
                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-4 relative flex flex-col">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-gray-700 flex gap-2 items-center"><FiCamera /> กล้อง</h3>
                            <div className="flex gap-2">
                                <button onClick={() => setAutoCheckIn(!autoCheckIn)} className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all border ${autoCheckIn ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>{autoCheckIn ? '⚡ Auto' : 'Manual'}</button>
                                <button onClick={() => setCameraEnabled(!cameraEnabled)} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${cameraEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{cameraEnabled ? 'เปิดอยู่' : 'ปิดอยู่'}</button>
                            </div>
                        </div>
                        {cameraEnabled && devices.length > 1 && (<div className="mb-3 px-1"><select className="w-full p-2 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" value={selectedDeviceId} onChange={(e) => setSelectedDeviceId(e.target.value)}>{devices.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `กล้อง ${i + 1}`}</option>)}</select></div>)}
                        <div className="relative w-full rounded-xl overflow-hidden bg-black min-h-[250px] mb-4">
                            {cameraEnabled ? (
                                <>
                                    <div id="reader" className="w-full h-full"></div>
                                    {scanStatus === 'starting' && <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100/90 z-20"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div><span className="text-xs text-gray-500">เปิดกล้อง...</span></div>}
                                    {scanStatus === 'error' && <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-center p-4 z-20"><FiAlertTriangle className="text-rose-500 text-3xl mb-2" /><p className="text-xs text-gray-500 mb-2">{scanErrorMsg}</p><button onClick={() => setCameraEnabled(false)} className="text-emerald-600 underline text-xs">ปิดแล้วเปิดใหม่</button></div>}
                                </>
                            ) : (<div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400"><FiCameraOff size={40} /><p className="text-sm mt-2">กล้องถูกปิด</p></div>)}
                        </div>
                        <div className="pt-2 border-t border-gray-100"><div id="reader-file-hidden" className="hidden"></div><label className="flex items-center justify-center gap-2 w-full py-3 bg-stone-100 text-stone-600 rounded-xl font-semibold cursor-pointer hover:bg-stone-200 transition-colors"><FiImage /> เลือกรูป QR Code <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} /></label></div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100"><h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><FiSearch /> หรือค้นหาด้วยรหัส/เบอร์โทร</h3><div className="flex gap-2"><input type="text" value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="กรอกรหัสจอง..." className="placeholder-gray-400 text-gray-800 flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" /><button onClick={() => onScanSuccess(manualCode, false)} disabled={!manualCode} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">ค้นหา</button></div></div>
                </>
            ) : (
                <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden relative flex flex-col border border-emerald-100 animate-fade-in">
                    <div className="bg-emerald-800 p-8 text-white relative overflow-hidden flex-shrink-0 text-center"><button onClick={onReset} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white/80 transition-all z-20"><FiRefreshCw size={18} /></button><div className="relative z-10 flex flex-col items-center"><div className="relative mb-4">{scanData.line_picture_url ? (<img src={scanData.line_picture_url} alt="Profile" className="w-24 h-24 rounded-2xl border-4 border-white/20 object-cover shadow-2xl" />) : (<div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20"><FiUser size={48} className="text-white/70" /></div>)}<div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-lg border border-gray-50">{scanData.status === "CHECKED_IN" ? <FiCheckCircle className="text-emerald-500" size={20} /> : scanData.status === "CANCELLED" ? <FiXCircle className="text-rose-500" size={20} /> : <FiClock className="text-yellow-500" size={20} />}</div></div><h2 className="text-2xl font-bold tracking-tight mb-1">{scanData.name}</h2><div className="bg-white/10 px-3 py-1 rounded-full border border-white/10"><p className="text-emerald-100 text-xs font-mono tracking-widest">#{scanData.code}</p></div></div></div>
                    <div className="p-8 space-y-6 bg-white relative">
                        <div className="grid grid-cols-2 gap-y-6 gap-x-4"><div className="space-y-1"><label className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">วันที่นัดหมาย</label><div className="flex items-center gap-2 text-gray-800 font-semibold text-sm"><FiCalendar className="text-emerald-500" /> {scanData.date}</div></div><div className="space-y-1"><label className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">เวลาที่จอง</label><div className="flex items-center gap-2 text-gray-800 font-semibold text-sm"><FiClock className="text-emerald-500" /> {scanData.slot}</div></div><div className="col-span-2 pt-2"><label className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">เบอร์โทรศัพท์ติดต่อ</label><div className="flex items-center gap-2 text-gray-800 font-medium text-sm bg-gray-50 p-3 rounded-xl border border-gray-100"><FiPhone className="text-emerald-500" /> {scanData.phone}</div></div></div>
                        {scanData.status === "CHECKED_IN" && <div className="bg-blue-50 border border-blue-100 text-blue-700 p-4 rounded-2xl text-xs flex gap-3 items-center"><FiCheckCircle size={18} /> <b>ท่านนี้เข้ารับบริการเรียบร้อยแล้ว</b></div>}{scanData.status === "CANCELLED" && <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl text-xs flex gap-3 items-center"><FiXCircle size={18} /> <b>รายการนี้ถูกยกเลิกแล้ว ไม่สามารถเช็คอินได้</b></div>}
                        <div className="pt-4 border-t border-gray-50">{scanData.status === "BOOKED" ? (<button onClick={onConfirmCheckIn} disabled={loading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-xl shadow-emerald-100 transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2 text-sm">{loading ? "กำลังบันทึกข้อมูล..." : <><FiCheckCircle /> ยืนยันการเช็คอิน</>}</button>) : (<button onClick={onReset} className="w-full py-4 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-2xl font-bold transition-all text-sm">สแกนรายการถัดไป</button>)}</div>
                    </div>
                </div>
            )}
        </div>
    );
}