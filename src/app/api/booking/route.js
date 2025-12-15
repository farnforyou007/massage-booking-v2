import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { lineClient } from '@/utils/line';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, phone, date, slotId, slotLabel, lineUserId } = body;

        // 1. เช็คซ้ำ
        const { data: existing } = await supabase
            .from('bookings')
            .select('id')
            .eq('booking_date', date)
            .eq('slot_id', slotId)
            .eq('phone', phone)
            .neq('status', 'CANCELLED')
            .maybeSingle();

        if (existing) return NextResponse.json({ ok: false, message: "คุณจองรอบนี้ไปแล้ว" }, { status: 400 });

        // 2. เช็คเต็ม
        const { data: slotData } = await supabase.from('slots').select('capacity').eq('start_time', slotId).single();
        const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('booking_date', date).eq('slot_id', slotId).neq('status', 'CANCELLED');

        if (count >= (slotData?.capacity || 0)) return NextResponse.json({ ok: false, message: "รอบเต็มแล้ว" }, { status: 400 });

        // 3. บันทึก
        const randomCode = 'B-' + Math.random().toString(36).substr(2, 5).toUpperCase();
        const { error } = await supabase.from('bookings').insert([{
            customer_name: name,
            booking_date: date,
            phone: phone,
            slot_id: slotId,
            slot_label: slotLabel,
            booking_code: randomCode,
            line_user_id: lineUserId || 'NO_LIFF',
            status: 'BOOKED'
        }]);

        if (error) throw error;

        // 4. ส่งไลน์ยืนยัน
        if (lineUserId && lineUserId !== 'NO_LIFF') {
            const flex = lineClient.createBookingFlex({
                code: randomCode, name, date, slot: slotLabel
            });
            await lineClient.push(lineUserId, flex);
        }

        return NextResponse.json({ ok: true, bookingCode: randomCode });

    } catch (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
}