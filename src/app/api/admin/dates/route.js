import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function GET() {
    const { data } = await supabase.from('days').select('*').order('date');
    return NextResponse.json({ items: data });
}

export async function POST(request) { // เพิ่มวัน
    const { date } = await request.json();
    await supabase.from('days').insert([{ date, status: 'OPEN' }]);
    return NextResponse.json({ ok: true });
}

export async function DELETE(request) { // ลบวัน
    const { date } = await request.json();
    await supabase.from('days').delete().eq('date', date);
    return NextResponse.json({ ok: true });
}

export async function PUT(request) { // เปลี่ยนสถานะ
    const { date, status } = await request.json();
    await supabase.from('days').update({ status }).eq('date', date);
    return NextResponse.json({ ok: true });
}