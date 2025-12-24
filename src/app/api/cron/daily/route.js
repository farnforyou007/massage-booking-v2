// import { NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import { lineClient } from '@/utils/line';

// const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// export async function GET() {
//     const tomorrow = new Date();
//     tomorrow.setDate(tomorrow.getDate() + 1);
//     const dateStr = tomorrow.toISOString().split('T')[0];

//     const { data: bookings } = await supabase
//         .from('bookings')
//         .select('*')
//         .eq('booking_date', dateStr)
//         .neq('status', 'CANCELLED')
//         .neq('line_user_id', 'NO_LIFF');

//     for (const b of bookings || []) {
//         const flex = lineClient.createReminderFlex({
//             name: b.customer_name,
//             date: b.booking_date,
//             slot: b.slot_label,
//             code: b.booking_code
//         });
//         await lineClient.push(b.line_user_id, flex);
//     }
//     return NextResponse.json({ count: bookings?.length || 0 });
// }