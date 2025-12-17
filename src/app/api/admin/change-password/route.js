import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function PUT(request) {
    try {
        const { currentPassword, newPassword } = await request.json();

        // 1. ดึงรหัสปัจจุบันมาเช็ค
        const { data: config } = await supabase
            .from('admin_config')
            .select('key_value')
            .eq('key_name', 'admin_password')
            .single();

        const isMatch = await bcrypt.compare(currentPassword, config.key_value);
        if (!isMatch) return NextResponse.json({ ok: false, message: "รหัสผ่านเดิมไม่ถูกต้อง" }, { status: 400 });

        // if (currentPassword !== config.key_value) return NextResponse.json({ ok: false, message: "รหัสผ่านเดิมไม่ถูกต้อง" });

        // 2. Hash รหัสใหม่ก่อนบันทึก
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const { error } = await supabase
            .from('admin_config')
            .update({ key_value: hashedPassword })
            .eq('key_name', 'admin_password');

        if (error) throw error;
        return NextResponse.json({ ok: true, message: "เปลี่ยนรหัสผ่านสำเร็จ" });
    } catch (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
}