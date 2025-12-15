// เปลี่ยน API_BASE เป็น empty string เพราะเราเรียก route ในโดเมนเดียวกัน
const API_BASE = "/api";

export async function getSlots(date) {
    const res = await fetch(`${API_BASE}/slots?date=${date}`);
    return await res.json();
}

export async function createBooking(payload) {
    const res = await fetch(`${API_BASE}/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return await res.json();
}

export async function getBookingByCode(code) {
    const res = await fetch(`${API_BASE}/booking/${code}`);
    return await res.json();
}

export async function adminLogin(password) {
    // ใช้เช็คแบบง่ายๆ หรือ Environment Variable เอาก็ได้ครับ
    if (password === "123456") return { ok: true, token: "dummy-token" };
    return { ok: false };
}

export async function userCancelBooking(code) {
    const res = await fetch(`${API_BASE}/booking/${code}`, {
        method: "POST",
        body: JSON.stringify({ status: "CANCELLED" })
    });
    return await res.json();
}

// Admin API
export async function getManageDates() {
    const res = await fetch(`${API_BASE}/admin/dates`);
    return await res.json();
}

export async function addOpenDate(date) {
    const res = await fetch(`${API_BASE}/admin/dates`, {
        method: "POST",
        body: JSON.stringify({ date })
    });
    return await res.json();
}

export async function deleteOpenDate(date) {
    const res = await fetch(`${API_BASE}/admin/dates`, {
        method: "DELETE",
        body: JSON.stringify({ date })
    });
    return await res.json();
}

export async function updateDateStatus(date, status) {
    const res = await fetch(`${API_BASE}/admin/dates`, {
        method: "PUT",
        body: JSON.stringify({ date, status })
    });
    return await res.json();
}

export async function adminUpdateBookingStatus(code, status, token) {
    const res = await fetch(`${API_BASE}/booking/${code}`, {
        method: "POST",
        body: JSON.stringify({ status })
    });
    return await res.json();
}