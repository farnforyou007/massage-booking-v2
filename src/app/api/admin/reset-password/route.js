import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function PUT(request) {
    try {
        const { recoveryKey, newPw } = await request.json();

        // 1. ดึง Master Key จาก DB มาเทียบ (เทียบแบบตรงๆ ไม่ Hash)
        const { data: masterData } = await supabase
            .from('admin_config')
            .select('key_value')
            .eq('key_name', 'master_recovery_key')
            .single();

        if (!masterData || recoveryKey !== masterData.key_value) {
            return NextResponse.json({ ok: false, message: "Master Key ไม่ถูกต้อง" }, { status: 401 });
        }

        // 2. ถ้า Master Key ถูก -> Hash รหัสใหม่แล้วบันทึกทับ admin_password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPw, salt);

        const { error } = await supabase
            .from('admin_config')
            .update({ key_value: hashedPassword })
            .eq('key_name', 'admin_password');

        if (error) throw error;
        return NextResponse.json({ ok: true });

    } catch (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
}