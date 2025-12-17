const API_BASE = ""; // เรียก path เดียวกัน

export async function getSlots(date) {
    const res = await fetch(`${API_BASE}/api/slots?date=${date}`);
    return await res.json();
}

export async function createBooking(payload) {
    const res = await fetch(`${API_BASE}/api/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return await res.json();
}

export async function getBookingByCode(code) {
    const res = await fetch(`${API_BASE}/api/booking/${code}`);
    return await res.json();
}

export async function adminLogin(password) {
    const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
    });
    return await res.json();
}

export async function adminGetBookings(date, token) {
    const res = await fetch(`${API_BASE}/api/admin/bookings?date=${date}`);
    return await res.json();
}

export async function adminGetSlotsSummary(date, token) {
    // ใช้ API เดียวกันกับหน้าบ้านได้เลย
    // const res = await fetch(`${API_BASE}/api/slots?date=${date}`);
    const res = await fetch(`${API_BASE}/api/admin/slots?date=${date}`);
    return await res.json();
}

export async function adminUpdateBookingStatus(code, status, token) {
    console.log("🔥 API ถูกเรียกแล้ว!"); // เช็คว่าเข้ามาในไฟล์ไหม
    console.log("code:", code);
    const res = await fetch(`${API_BASE}/api/booking/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
    });
    return await res.json();
}

export async function userCancelBooking(code) {
    return adminUpdateBookingStatus(code, "CANCELLED", "");
}

// Date Management
export async function getOpenDates() { // หน้าบ้านใช้
    // เรียกใช้ API admin/dates เพื่อดึงวันเปิด (Reuse)
    const res = await fetch(`${API_BASE}/api/admin/dates`);
    const data = await res.json();
    // กรองเอาเฉพาะ OPEN
    const openDates = data.items.filter(d => d.status === 'OPEN').map(d => d.date);
    return { dates: openDates };
}

export async function getManageDates() { // หลังบ้านใช้
    const res = await fetch(`${API_BASE}/api/admin/dates`);
    return await res.json();
}

export async function addOpenDate(date) {
    const res = await fetch(`${API_BASE}/api/admin/dates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date })
    });
    return await res.json();
}

export async function deleteOpenDate(date) {
    const res = await fetch(`${API_BASE}/api/admin/dates`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date })
    });
    return await res.json();
}

export async function updateDateStatus(date, status) {
    const res = await fetch(`${API_BASE}/api/admin/dates`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, status })
    });
    return await res.json();
}

// ฟังก์ชัน Dummy ที่ไม่ได้ใช้แล้ว แต่คงไว้กัน Error
// export async function adminUpdateSlotCapacity(slotId, capacity) {
//     const res = await fetch(`/api/admin/slots`, { // เรียกไปที่ไฟล์ที่เราเพิ่งสร้าง
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ slot_id: slotId, capacity })
//     });
//     return await res.json();
// }

// export async function adminUpdateSlotCapacity(id, capacity) {
//     // ส่ง label เดิมไปก่อน (หรือจะไปแก้ที่หน้าเว็บให้ส่ง label มาด้วยก็ได้)
//     // แต่ทางที่ดีที่สุดคือ ให้หน้าเว็บเลิกใช้ฟังก์ชันนี้ครับ
//     console.warn("Function นี้เลิกใช้แล้ว กรุณาใช้ updateSlot แทน");
//     return { ok: false, message: "กรุณารีเฟรชหน้าเว็บ เพื่อใช้โค้ดล่าสุด" };
// }

// --- เพิ่มต่อท้ายในไฟล์ api.js ---

// เพิ่มรอบเวลาใหม่
export async function addSlot(label, capacity) {
    // สมมติว่า Backend คุณรับ label (เช่น "09:00-10:00") และ capacity
    // และอาจจะต้องสร้าง start_time จาก label หรือส่งไปตรงๆ ขึ้นอยู่กับ database
    const res = await fetch(`${API_BASE}/api/admin/slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, capacity })
    });
    return await res.json();
}

// ลบรอบเวลา
export async function deleteSlot(id) {
    const res = await fetch(`${API_BASE}/api/admin/slots`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
    });
    return await res.json();
}

// แก้ไขรอบเวลา (ชื่อรอบ + จำนวน)
export async function updateSlot(id, label, capacity) {
    const res = await fetch(`${API_BASE}/api/admin/slots`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, label, capacity })
    });
    return await res.json();
}

export async function adminChangePassword(currentPassword, newPassword) {
    const res = await fetch(`${API_BASE}/api/admin/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
    });
    return await res.json();
}