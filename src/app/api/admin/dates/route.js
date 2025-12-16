import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function GET() {
    const { data } = await supabase.from('days').select('*').order('date');
    return NextResponse.json({ items: data });
}

export async function POST(request) {
    const { date } = await request.json();
    // เช็คซ้ำก่อน
    const { data: exist } = await supabase.from('days').select('id').eq('date', date).maybeSingle();
    if (exist) return NextResponse.json({ ok: false, message: "วันนี้มีอยู่แล้ว" });

    await supabase.from('days').insert([{ date, status: 'OPEN' }]);
    return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
    const { date } = await request.json();
    await supabase.from('days').delete().eq('date', date);
    return NextResponse.json({ ok: true });
}

export async function PUT(request) {
    const { date, status } = await request.json();
    await supabase.from('days').update({ status }).eq('date', date);
    return NextResponse.json({ ok: true });
}