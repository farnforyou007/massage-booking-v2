import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId'); // รับ LINE User ID

    if (!userId) {
        return NextResponse.json({ ok: false, message: 'User ID is required' }, { status: 400 });
    }

    try {
        // ดึงข้อมูลการจองทั้งหมดของ User นี้ เรียงจากใหม่ไปเก่า
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('line_user_id', userId)
            .order('booking_date', { ascending: false }) // วันที่ล่าสุดขึ้นก่อน
            .order('slot_label', { ascending: true });   // เวลาเช้าขึ้นก่อน

        if (error) throw error;

        return NextResponse.json({ ok: true, bookings: data });

    } catch (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
}