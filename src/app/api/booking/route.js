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
        const { name, phone, date, slot_id, slotLabel, lineUserId } = body;
        console.log("Booking Request:", { name, date, slot_id }); // log ดูค่า
        // 1. เช็คซ้ำ (เหมือนเดิม)
        const { data: existing } = await supabase
            .from('bookings')
            .select('id')
            .eq('booking_date', date)
            .eq('slot_id', slot_id)
            .eq('phone', phone)
            .neq('status', 'CANCELLED')
            .maybeSingle();

        if (existing) return NextResponse.json({ ok: false, message: "ขออภัย ! คุณจองช่วงเวลานี้ไปแล้ว" }, { status: 400 });

        // 2. เช็คเต็ม (เหมือนเดิม)
        const { data: slotData } = await supabase.from('slots').select('capacity').eq('start_time', slot_id).single();
        const capacity = slotData?.capacity || 0;
        const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true })
            .eq('booking_date', date)
            .eq('slot_id', slot_id)
            .neq('status', 'CANCELLED');

        // if (count >= (slotData?.capacity || 0)) return NextResponse.json({ ok: false, message: "Slot Full (เต็มแล้ว)" }, { status: 400 });
        if (count >= capacity) {
            console.error(`Full: ${count}/${capacity} for slot ${slot_id}`);
            return NextResponse.json({ ok: false, message: "รอบเวลานี้เต็มแล้ว (Slot Full)" }, { status: 400 });
        }
        // 3. บันทึก (🔥 แก้ตรงนี้: เปลี่ยนวิธีสร้างรหัส)
        // -------------------------------------------------------
        const phoneClean = phone.replace(/[^0-9]/g, ""); // เอาเฉพาะตัวเลข
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase(); // สุ่ม 4 ตัวท้าย
        const newBookingCode = `${phoneClean}-${randomSuffix}`; // รวมร่าง: 0812345678-ABCD
        // -------------------------------------------------------

        const { error } = await supabase.from('bookings').insert([{
            customer_name: name,
            booking_date: date,
            phone: phone,
            slot_id: slot_id,
            slot_label: slotLabel,
            booking_code: newBookingCode, // ส่งรหัสใหม่เข้าไป
            line_user_id: lineUserId || 'NO_LIFF',
            status: 'BOOKED'
        }]);

        if (error) throw error;

        // 4. ส่งไลน์ยืนยัน (แก้ส่งรหัสใหม่ไปด้วย)
        if (lineUserId && lineUserId !== 'NO_LIFF') {
            const flex = lineClient.createBookingFlex({
                code: newBookingCode, // ใช้รหัสใหม่
                name, date, slot: slotLabel
            });
            await lineClient.push(lineUserId, flex);
        }

        // ส่งกลับหน้าบ้าน
        return NextResponse.json({ ok: true, bookingCode: newBookingCode });

    } catch (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
}


// version จองใหม่ เพิ่มกฎ "ต้องเช็คอินก่อน ถึงจองใหม่ได้"
// import { NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// // import { lineClient } from '@/utils/line'; // (ถ้ามี)

// const supabase = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// );

// export async function POST(request) {
//     try {
//         const body = await request.json();
//         const { name, phone, date, slot_id, slotLabel, lineUserId } = body;

//         // -----------------------------------------------------------------------
//         // 🔥 แก้ไขส่วนที่ 1: กฎ "ต้องเช็คอินก่อน ถึงจองใหม่ได้"
//         // -----------------------------------------------------------------------

//         // สร้างเงื่อนไขค้นหา: เช็คเบอร์โทร หรือ Line ID (ถ้ามี)
//         let query = supabase.from('bookings')
//             .select('booking_date, slot_label, booking_code')
//             .eq('status', 'BOOKED'); // 👈 หัวใจสำคัญ: หาเฉพาะรายการที่ "ยังไม่เช็คอิน"

//         // ถ้ามี Line ID ให้เช็คทั้งเบอร์ และ Line ID (เผื่อเปลี่ยนเบอร์แต่ใช้ไลน์เดิม)
//         if (lineUserId && lineUserId !== 'NO_LIFF') {
//             query = query.or(`phone.eq.${phone},line_user_id.eq.${lineUserId}`);
//         } else {
//             // ถ้าไม่มี Line ID เช็คแค่เบอร์
//             query = query.eq('phone', phone);
//         }

//         const { data: pendingBooking } = await query.maybeSingle();

//         // ถ้าเจอว่ามีคิวค้างอยู่ (ยังไม่ได้ Check-in และยังไม่ Cancel)
//         if (pendingBooking) {
//             return NextResponse.json({
//                 ok: false,
//                 message: `คุณมีคิวที่จองไว้อยู่แล้ว !\n(${pendingBooking.booking_date} เวลา ${pendingBooking.slot_label})\n\n⚠️ กรุณาไปใช้บริการและเช็คอินก่อน จึงจะจองคิวครั้งถัดไปได้ครับ`
//             }, { status: 400 });
//         }
//         // -----------------------------------------------------------------------


//         // 2. เช็คเต็ม (เหมือนเดิม)
//         const { data: slotData } = await supabase.from('slots').select('capacity').eq('start_time', slot_id).single();
//         const capacity = slotData?.capacity || 0;

//         const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true })
//             .eq('booking_date', date)
//             .eq('slot_id', slot_id)
//             .neq('status', 'CANCELLED');

//         if (count >= capacity) {
//             return NextResponse.json({ ok: false, message: "รอบเวลานี้เต็มแล้ว (Slot Full)" }, { status: 400 });
//         }

//         // 3. บันทึก (เหมือนเดิม)
//         const phoneClean = phone.replace(/[^0-9]/g, "");
//         const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
//         const newBookingCode = `${phoneClean}-${randomSuffix}`;

//         const { error } = await supabase.from('bookings').insert([{
//             customer_name: name,
//             booking_date: date,
//             phone: phone,
//             slot_id: slot_id,
//             slot_label: slotLabel,
//             booking_code: newBookingCode,
//             line_user_id: lineUserId || 'NO_LIFF',
//             status: 'BOOKED'
//         }]);

//         if (error) throw error;

//         return NextResponse.json({ ok: true, bookingCode: newBookingCode });

//     } catch (error) {
//         console.error("Booking Error:", error);
//         return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
//     }
// }