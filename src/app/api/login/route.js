import { NextResponse } from 'next/server';

export async function POST(request) {
    const { password } = await request.json();
    // เปลี่ยนรหัสผ่านตรงนี้ หรือใช้ Env Var
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123456";

    if (password === ADMIN_PASSWORD) {
        return NextResponse.json({ ok: true, token: "session-token-123" });
    }
    return NextResponse.json({ ok: false, message: "รหัสผิด" });
}