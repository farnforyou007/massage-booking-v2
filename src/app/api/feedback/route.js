import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(request) {
    try {
        const { code, reason } = await request.json();

        // อัปเดตเหตุผลลงใน DB
        const { error } = await supabase
            .from('bookings')
            .update({ noshow_reason: reason }) 
            .eq('booking_code', code);

        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}