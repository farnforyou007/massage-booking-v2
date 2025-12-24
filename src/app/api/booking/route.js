// import { NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import { lineClient } from '@/utils/line';

// const supabase = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// );

// export async function POST(request) {
//     try {
//         const body = await request.json();
//         const { name, phone, date, slot_id, slotLabel, lineUserId } = body;
//         console.log("Booking Request:", { name, date, slot_id }); // log ดูค่า
//         // 1. เช็คซ้ำ (เหมือนเดิม)
//         const { data: existing } = await supabase
//             .from('bookings')
//             .select('id')
//             .eq('booking_date', date)
//             .eq('slot_id', slot_id)
//             .eq('phone', phone)
//             .neq('status', 'CANCELLED')
//             .maybeSingle();

//         if (existing) return NextResponse.json({ ok: false, message: "ขออภัย ! คุณจองช่วงเวลานี้ไปแล้ว" }, { status: 400 });

//         // 2. เช็คเต็ม (เหมือนเดิม)
//         const { data: slotData } = await supabase.from('slots').select('capacity').eq('start_time', slot_id).single();
//         const capacity = slotData?.capacity || 0;
//         const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true })
//             .eq('booking_date', date)
//             .eq('slot_id', slot_id)
//             .neq('status', 'CANCELLED');

//         // if (count >= (slotData?.capacity || 0)) return NextResponse.json({ ok: false, message: "Slot Full (เต็มแล้ว)" }, { status: 400 });
//         if (count >= capacity) {
//             console.error(`Full: ${count}/${capacity} for slot ${slot_id}`);
//             return NextResponse.json({ ok: false, message: "รอบเวลานี้เต็มแล้ว (Slot Full)" }, { status: 400 });
//         }
//         // 3. บันทึก (🔥 แก้ตรงนี้: เปลี่ยนวิธีสร้างรหัส)
//         // -------------------------------------------------------
//         const phoneClean = phone.replace(/[^0-9]/g, ""); // เอาเฉพาะตัวเลข
//         const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase(); // สุ่ม 4 ตัวท้าย
//         const newBookingCode = `${phoneClean}-${randomSuffix}`; // รวมร่าง: 0812345678-ABCD
//         // -------------------------------------------------------

//         const { error } = await supabase.from('bookings').insert([{
//             customer_name: name,
//             booking_date: date,
//             phone: phone,
//             slot_id: slot_id,
//             slot_label: slotLabel,
//             booking_code: newBookingCode, // ส่งรหัสใหม่เข้าไป
//             line_user_id: lineUserId || 'NO_LIFF',
//             status: 'BOOKED'
//         }]);

//         if (error) throw error;

//         // 4. ส่งไลน์ยืนยัน (แก้ส่งรหัสใหม่ไปด้วย)
//         // if (lineUserId && lineUserId !== 'NO_LIFF') {
//         //     const flex = lineClient.createBookingFlex({
//         //         code: newBookingCode, // ใช้รหัสใหม่
//         //         name, date, slot: slotLabel
//         //     });
//         //     await lineClient.push(lineUserId, flex);
//         // }

//         if (lineUserId && lineUserId !== 'NO_LIFF') {
//             try {
//                 // สร้างลิงก์สำหรับกดดูตั๋ว (ใช้ LIFF URL ที่คุณจะตั้งค่าใน Vercel)
//                 const liffUrl = process.env.NEXT_PUBLIC_LIFF_ID 
//                     ? `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/ticket?code=${newBookingCode}`
//                     : `https://google.com`;

//                 // สร้างการ์ด
//                 const flexMessage = lineClient.createBookingFlex({
//                     code: newBookingCode,
//                     name: name,
//                     date: date,
//                     slot: slotLabel,
//                     ticketUrl: liffUrl
//                 });

//                 // ส่งเข้าไลน์
//                 await lineClient.push(lineUserId, flexMessage);
//                 console.log("✅ Sent LINE to:", lineUserId);
//             } catch (lineErr) {
//                 console.error("⚠️ Failed to send LINE:", lineErr);
//                 // ไม่ต้อง throw error นะครับ เดี๋ยวหน้าเว็บพัง ให้แค่แจ้งเตือนใน log พอ
//             }
//         }

//         // ส่งกลับหน้าบ้าน
//         return NextResponse.json({ ok: true, bookingCode: newBookingCode });

//     } catch (error) {
//         return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
//     }
// }

// version promiss all
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { lineClient } from '@/utils/line';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// export async function POST(request) {
//     try {
//         const body = await request.json();
//         const { name, phone, date, slot_id, slotLabel, lineUserId , line_picture_url } = body;

//         console.log("🚀 New Booking Request:", { name, date, slot_id });

//         // --- STEP 1: ตรวจสอบเบื้องต้น (Validation) ---
//         // (ส่วนนี้ต้องทำแบบรอผล หรือ Sequential เพราะถ้าไม่ผ่าน ต้องหยุดทันที)

//         // 1.1 เช็คว่าจองซ้ำหรือไม่
//         const checkDuplicatePromise = supabase
//             .from('bookings')
//             .select('id')
//             .eq('booking_date', date)
//             .eq('slot_id', slot_id)
//             .eq('phone', phone)
//             .neq('status', 'CANCELLED')
//             .maybeSingle();

//         // 1.2 เช็คว่ารอบเต็มหรือไม่ (ดึง Capacity และ Count พร้อมกัน)
//         const slotInfoPromise = supabase.from('slots').select('capacity').eq('start_time', slot_id).single();
//         const countBookingPromise = supabase.from('bookings').select('*', { count: 'exact', head: true })
//             .eq('booking_date', date)
//             .eq('slot_id', slot_id)
//             .neq('status', 'CANCELLED');

//         // รอผลตรวจสอบทั้งหมดพร้อมกัน (เร็วขึ้นนิดหน่อย)
//         const [duplicateRes, slotRes, countRes] = await Promise.all([
//             checkDuplicatePromise, 
//             slotInfoPromise, 
//             countBookingPromise
//         ]);

//         // Logic ตรวจสอบ
//         if (duplicateRes.data) {
//             return NextResponse.json({ ok: false, message: "ขออภัย ! คุณจองช่วงเวลานี้ไปแล้ว" }, { status: 400 });
//         }

//         const capacity = slotRes.data?.capacity || 0;
//         const currentCount = countRes.count || 0;

//         if (currentCount >= capacity) {
//             console.error(`Full: ${currentCount}/${capacity} for slot ${slot_id}`);
//             return NextResponse.json({ ok: false, message: "รอบเวลานี้เต็มแล้ว (Slot Full)" }, { status: 400 });
//         }

//         // --- STEP 2: เตรียมข้อมูล ---
//         const phoneClean = phone.replace(/[^0-9]/g, ""); 
//         const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase(); 
//         const newBookingCode = `${phoneClean}-${randomSuffix}`; 

//         const bookingData = {
//             customer_name: name,
//             booking_date: date,
//             phone: phone,
//             slot_id: slot_id,
//             slot_label: slotLabel,
//             booking_code: newBookingCode,
//             line_user_id: lineUserId || 'NO_LIFF',
//             status: 'BOOKED' ,
//             line_picture_url: line_picture_url
//         };

//         // --- STEP 3: บันทึกและแจ้งเตือน (🔥 ทำพร้อมกันแบบ Parallel) ---

//         // งานที่ 1: บันทึกลง Supabase
//         const saveToDbPromise = supabase.from('bookings').insert([bookingData])
//             .then(({ error }) => {
//                 if (error) throw error;
//                 return { success: true };
//             });

//         // งานที่ 2: ส่ง LINE (ถ้ามี ID)
//         let sendLinePromise = Promise.resolve(); // สร้าง Promise ว่างๆ ไว้ก่อน

//         if (lineUserId && lineUserId !== 'NO_LIFF') {
//             const liffUrl = process.env.NEXT_PUBLIC_LIFF_ID 
//                 ? `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/ticket?code=${newBookingCode}`
//                 : `https://google.com`;

//             const flexMessage = lineClient.createBookingFlex({
//                 code: newBookingCode,
//                 name: name,
//                 date: date,
//                 slot: slotLabel,
//                 ticketUrl: liffUrl
//             });

//             // สั่งให้ส่ง LINE (แต่ไม่ต้องรอผลลัพธ์เพื่อ return)
//             sendLinePromise = lineClient.push(lineUserId, flexMessage)
//                 .then(() => console.log("✅ Sent LINE success"))
//                 .catch(err => console.error("⚠️ LINE Failed (but booking saved):", err));
//         }

//         // 🔥 จุดเปลี่ยนความเร็ว: สั่งให้ DB และ LINE ทำงานพร้อมกัน!
//         // เราจะรอแค่ Save DB ให้เสร็จก็พอ ส่วน LINE ให้มันทำงานของมันไป (หรือจะรอทั้งคู่ก็ได้ ถ้าเน็ตเร็วพอ)
//         await Promise.all([saveToDbPromise, sendLinePromise]);

//         // ส่ง Response กลับหน้าบ้านทันที
//         console.log("✅ Booking Completed:", newBookingCode);
//         return NextResponse.json({ ok: true, bookingCode: newBookingCode });

//     } catch (error) {
//         console.error("❌ Booking Error:", error);
//         return NextResponse.json({ ok: false, message: error.message || "ระบบขัดข้อง" }, { status: 500 });
//     }
// }

// version จองใหม่ เพิ่มกฎ "ต้องเช็คอินก่อน ถึงจองใหม่ได้"
// import { NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// // import { lineClient } from '@/utils/line'; // (ถ้ามี)

// const supabase = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// );

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, phone, date, slot_id, slotLabel, lineUserId , line_picture_url , line_display_name } = body;

        // -----------------------------------------------------------------------
        // 🔥 แก้ไขส่วนที่ 1: กฎ "ต้องเช็คอินก่อน ถึงจองใหม่ได้"
        // -----------------------------------------------------------------------

        // สร้างเงื่อนไขค้นหา: เช็คเบอร์โทร หรือ Line ID (ถ้ามี)
        let query = supabase.from('bookings')
            .select('booking_date, slot_label, booking_code')
            .eq('status', 'BOOKED'); // 👈 หัวใจสำคัญ: หาเฉพาะรายการที่ "ยังไม่เช็คอิน"

        // ถ้ามี Line ID ให้เช็คทั้งเบอร์ และ Line ID (เผื่อเปลี่ยนเบอร์แต่ใช้ไลน์เดิม)
        if (lineUserId && lineUserId !== 'NO_LIFF') {
            query = query.or(`phone.eq.${phone},line_user_id.eq.${lineUserId}`);
        } else {
            // ถ้าไม่มี Line ID เช็คแค่เบอร์
            query = query.eq('phone', phone);
        }

        const { data: pendingBooking } = await query.maybeSingle();
        // ถ้าเจอว่ามีคิวค้างอยู่ (ยังไม่ได้ Check-in และยังไม่ Cancel)
        // ในส่วนที่เช็ค pendingBooking ใน API
        if (pendingBooking) {
            const d = new Date(pendingBooking.booking_date);
            const thaiDate = `${d.getDate()} ${d.toLocaleDateString('th-TH', { month: 'long' })} ${d.getFullYear() + 543}`;

            // ✅ ใช้ HTML แทน String ธรรมดาเพื่อให้จัดระเบียบได้
            const htmlMessage = `
    <div style="text-align: left; font-size: 13px; line-height: 1.4; color: #374151;">
        <p style="text-align: center; font-size: 14px; margin-bottom: 5px; color: #991b1b;">
            🚫 <b>ทำรายการไม่สำเร็จ</b>
        </p>
        <hr style="border: 0; border-top: 1px dashed #fca5a5; margin: 6px 0; opacity: 0.5;">
        <p style="margin-bottom: 2px; font-size: 12px;">📌 <b>ท่านมีรายการจองอยู่แล้ว :</b></p>
        <div style="margin-left: 10px; color: #4b5563; font-size: 12px;">
            <p>• ${thaiDate}</p>
            <p>• รอบ ${pendingBooking.slot_label}</p>
        </div>
        <hr style="border: 0; border-top: 1px dashed #fca5a5; margin: 6px 0; opacity: 0.5;">
        <p style="color: #6b7280; font-size: 11px; text-align: center;">
            💡 กรุณาใช้บริการคิวเดิมให้เรียบร้อยก่อนค่ะ หรือ ยกเลิกการจอง
        </p>
    </div>
`;

            return NextResponse.json({
                ok: false,
                message: htmlMessage // ส่ง HTML นี้ไปแทน
            }, { status: 400 });
        }

        // -----------------------------------------------------------------------
        // ส่วนที่ 2: ตรวจสอบซ้ำ และเต็ม (เหมือนเดิม)
        // -----------------------------------------------------------------------

        // 2. เช็คเต็ม (เหมือนเดิม)
        const { data: slotData } = await supabase.from('slots').select('capacity').eq('start_time', slot_id).single();
        const capacity = slotData?.capacity || 0;

        const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true })
            .eq('booking_date', date)
            .eq('slot_id', slot_id)
            .neq('status', 'CANCELLED');

        if (count >= capacity) {
            return NextResponse.json({ ok: false, message: "รอบเวลานี้เต็มแล้ว (Slot Full)" }, { status: 400 });
        }

        // 3. บันทึก (เหมือนเดิม)
        const phoneClean = phone.replace(/[^0-9]/g, "");
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const newBookingCode = `${phoneClean}-${randomSuffix}`;

        const { error } = await supabase.from('bookings').insert([{
            customer_name: name,
            booking_date: date,
            phone: phone,
            slot_id: slot_id,
            slot_label: slotLabel,
            booking_code: newBookingCode,
            line_user_id: lineUserId || 'NO_LIFF',
            status: 'BOOKED',
            line_picture_url: line_picture_url || 'No line picture' ,
            line_display_name: line_display_name || 'No line name'
        }]);

        if (error) throw error;

        // ✅ ส่ง LINE ยืนยันการจอง
        if (lineUserId && lineUserId !== 'NO_LIFF') {
            try {
                const flexMessage = lineClient.createBookingFlex({
                    code: newBookingCode,
                    name: name,
                    date: date,
                    slot: slotLabel
                });
                await lineClient.push(lineUserId, flexMessage);
                console.log("✅ Sent LINE confirmation to:", lineUserId);
            } catch (lineErr) {
                console.error("⚠️ Failed to send LINE:", lineErr);
                // ไม่ throw error เดี๋ยวหน้าเว็บพัง ให้แค่ log warning
            }
        }

        return NextResponse.json({ ok: true, bookingCode: newBookingCode });

    } catch (error) {
        console.error("Booking Error:", error);
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
}