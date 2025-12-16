import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
    try {
        const { slot_id, capacity } = await request.json();

        // อัปเดตตาราง slots
        // หมายเหตุ: ใน Database เราใช้ 'start_time' เป็น id หลักของรอบเวลา
        const { error } = await supabase
            .from('slots')
            .update({ capacity: parseInt(capacity) })
            .eq('start_time', slot_id); // หรือ .eq('id', slot_id) ถ้าคุณใช้ id เป็นตัวเลข

        if (error) throw error;

        return NextResponse.json({ ok: true, message: "อัปเดตเรียบร้อย" });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
}