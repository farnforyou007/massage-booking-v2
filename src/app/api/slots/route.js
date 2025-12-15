import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const { data: slots } = await supabase.from('slots').select('*').order('start_time');
    const { data: bookings } = await supabase.from('bookings').select('slot_id').eq('booking_date', date).neq('status', 'CANCELLED');

    const result = slots.map(s => {
        const booked = bookings.filter(b => b.slot_id === s.start_time).length;
        return {
            id: s.start_time,
            label: s.label,
            capacity: s.capacity,
            booked,
            remaining: Math.max(0, s.capacity - booked),
            is_active: s.is_active
        };
    });

    return NextResponse.json({ ok: true, items: result });
}