import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        let query = supabase.from('bookings').select('*');

        // ถ้ามีการส่งวันที่มา ให้กรองเฉพาะวันนั้น
        if (date) {
            query = query.eq('booking_date', date);
        }

        // เรียงลำดับตามรอบเวลา (slot_id) และวันที่สร้าง
        query = query.order('slot_id', { ascending: true })
            .order('created_at', { ascending: true });

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ ok: true, items: data || [] });

    } catch (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
}