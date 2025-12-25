'use client'
import { useState } from "react";
import Swal from "sweetalert2";
import { FiLoader, FiLock } from "react-icons/fi";
import { adminLogin } from "../../api"; // ปรับ path ตามจริงของคุณ

export default function LoginForm({ onLoginSuccess, onForgotPassword }) {
    const [passwordInput, setPasswordInput] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);

    async function handleLogin(e) {
        e.preventDefault();
        if (!passwordInput.trim()) return;
        setLoginLoading(true);

        try {
            const res = await adminLogin(passwordInput.trim());
            if (res.ok) {
                // แจ้งแม่ว่า Login สำเร็จ พร้อมส่ง token กลับไป (ถ้า API ไม่ส่ง token มา ให้ใช้ dummy หรือค่าที่ถูกต้อง)
                const token = "logged-in";
                localStorage.setItem("admin_token", token);

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                    icon: 'success',
                    title: 'เข้าสู่ระบบสำเร็จ'
                });

                // เรียกฟังก์ชันของแม่ เพื่อเปลี่ยนหน้า
                onLoginSuccess(token);
                setPasswordInput("");
            } else {
                Swal.fire("ผิดพลาด", "รหัสผ่านไม่ถูกต้อง", "error");
            }
        } catch (err) {
            Swal.fire("Error", err.message, "error");
        } finally {
            setLoginLoading(false);
        }
    }

    return (
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
                        type="button"
                        onClick={onForgotPassword}
                        className="text-xs text-gray-400 hover:text-emerald-600 transition-colors"
                    >
                        ลืมรหัสผ่าน ?
                    </button>
                </div>
            </form>
        </div>
    );
}