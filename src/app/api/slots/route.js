import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    try {
        // 1. ดึงรอบเวลาทั้งหมด
        const { data: slots, error: slotError } = await supabase
            .from('slots')
            .select('*')
            .eq('is_active', true)
            .order('start_time');

        if (slotError) throw slotError;

        // 2. ดึงการจองของวันนั้น (เพื่อคำนวณที่เหลือ)
        const { data: bookings, error: bookingError } = await supabase
            .from('bookings')
            .select('slot_id')
            .eq('booking_date', date)
            .neq('status', 'CANCELLED');

        if (bookingError) throw bookingError;

        // 3. คำนวณ
        const result = slots.map(s => {
            const bookedCount = bookings.filter(b => b.slot_id === s.start_time).length;
            return {
                id: s.start_time,
                label: s.label,
                capacity: s.capacity,
                booked: bookedCount,
                remaining: Math.max(0, s.capacity - bookedCount),
                isFull: bookedCount >= s.capacity
            };
        });

        return NextResponse.json({ ok: true, items: result });

    } catch (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
}