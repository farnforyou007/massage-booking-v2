// import { NextResponse } from 'next/server';

// export async function POST(request) {
//     const { password } = await request.json();
//     // เปลี่ยนรหัสผ่านตรงนี้ หรือใช้ Env Var
//     const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123456";

//     if (password === ADMIN_PASSWORD) {
//         return NextResponse.json({ ok: true, token: "session-token-123" });
//     }
//     return NextResponse.json({ ok: false, message: "รหัสผิด" });
// }

// version with hashed password
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs'; // อย่าลืม npm install bcryptjs

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
    try {
        const { password } = await request.json();
        
        const { data: config } = await supabase
            .from('admin_config')
            .select('key_value')
            .eq('key_name', 'admin_password')
            .single();

        if (!config) throw new Error("ไม่พบการตั้งค่ารหัสผ่าน");

        // ตรวจสอบรหัสผ่าน (Hash vs Plain Text)
        const isMatch = await bcrypt.compare(password, config.key_value);

        if (isMatch) {
            return NextResponse.json({ ok: true });
        } else {
            return NextResponse.json({ ok: false, message: "รหัสผ่านไม่ถูกต้อง" });
        }
    } catch (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
}