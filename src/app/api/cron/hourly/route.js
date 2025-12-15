import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { lineClient } from '@/utils/line';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function GET() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const targetHour = now.getHours() + 2; // อีก 2 ชม. (เช่น ตอนนี้ 8:00 แจ้งคนรอบ 10:00)

    const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('booking_date', todayStr)
        .neq('status', 'CANCELLED')
        .neq('line_user_id', 'NO_LIFF');

    let count = 0;
    for (const b of bookings || []) {
        const slotHour = parseInt(b.slot_id.split(':')[0]);
        if (slotHour === targetHour) {
            const flex = lineClient.createUrgentFlex({
                name: b.customer_name,
                slot: b.slot_label,
                code: b.booking_code
            });
            await lineClient.push(b.line_user_id, flex);
            count++;
        }
    }
    return NextResponse.json({ count });
}