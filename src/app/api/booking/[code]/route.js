import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// GET: ค้นหาด้วยรหัส
export async function GET(request, { params }) {
    const { code } = params;
    // ค้นหาทั้งรหัสเต็ม หรือ 4 ตัวท้าย
    let query = supabase.from('bookings').select('*');
    if (code.length === 4) {
        query = query.like('booking_code', `%${code.toUpperCase()}`).order('created_at', { ascending: false }).limit(1);
    } else {
        query = query.eq('booking_code', code.toUpperCase());
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) return NextResponse.json({ ok: false, message: "ไม่พบข้อมูล" });

    return NextResponse.json({
        ok: true,
        booking: {
            code: data.booking_code,
            date: data.booking_date,
            slot: data.slot_label,
            name: data.customer_name,
            phone: data.phone,
            status: data.status
        }
    });
}

// POST: ยกเลิก (หรืออัปเดตสถานะ)
export async function POST(request, { params }) {
    const { code } = params;
    const body = await request.json(); // { status: "CANCELLED" }

    const { error } = await supabase
        .from('bookings')
        .update({ status: body.status })
        .eq('booking_code', code);

    if (error) return NextResponse.json({ ok: false, message: error.message });
    return NextResponse.json({ ok: true });
}