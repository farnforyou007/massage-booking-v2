// import { NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';

// const supabase = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// );

// export async function POST(request) {
//     try {
//         const { slot_id, capacity } = await request.json();

//         // อัปเดตตาราง slots
//         // หมายเหตุ: ใน Database เราใช้ 'start_time' เป็น id หลักของรอบเวลา
//         const { error } = await supabase
//             .from('slots')
//             .update({ capacity: parseInt(capacity) })
//             .eq('start_time', slot_id); // หรือ .eq('id', slot_id) ถ้าคุณใช้ id เป็นตัวเลข

//         if (error) throw error;

//         return NextResponse.json({ ok: true, message: "อัปเดตเรียบร้อย" });

//     } catch (error) {
//         console.error(error);
//         return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
//     }
// }

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// --- 1. GET: ดึงข้อมูลรอบเวลา (ของเดิมที่คุณน่าจะมีอยู่แล้ว) ---
export async function GET(request) {
    try {
        // ดึง Slot ทั้งหมด
        const { data: slots, error } = await supabase
            .from('slots')
            .select('*')
            .order('start_time', { ascending: true }); // เรียงตามเวลา

        if (error) throw error;

        // ดึงยอดจองของวันนี้ เพื่อคำนวณว่าว่างกี่ที่
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        // (ส่วนนี้คือ Logic เดิมของคุณที่เอาไว้นับยอดจอง)
        let bookingCounts = {};
        if (date) {
            const { data: bookings } = await supabase
                .from('bookings')
                .select('slot_id')
                .eq('booking_date', date)
                .neq('status', 'CANCELLED');

            bookings?.forEach(b => {
                bookingCounts[b.slot_id] = (bookingCounts[b.slot_id] || 0) + 1;
            });
        }

        // รวมร่างข้อมูลส่งกลับหน้าบ้าน
        const items = slots.map(s => ({
            id: s.id,
            label: s.label, // เช่น "09:00-10:00"
            capacity: s.capacity,
            booked: bookingCounts[s.start_time] || 0, // ใช้ start_time หรือ id เป็น key ก็ได้ (เช็ค database คุณอีกทีนะ)
            remaining: Math.max(0, s.capacity - (bookingCounts[s.start_time] || 0))
        }));

        return NextResponse.json({ items });
    } catch (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
}

// --- 2. POST: เพิ่มรอบใหม่ (NEW) 🔥 ---
export async function POST(request) {
    try {
        const body = await request.json();
        const { label, capacity } = body;

        // **สำคัญ:** เราต้องสร้าง start_time เอาไว้เรียงลำดับด้วย
        // สมมติ label คือ "09:00-10:00" เราจะตัดเอาแค่ "09:00" มาเก็บ
        const startTime = label.split('-')[0].trim();

        const { error } = await supabase
            .from('slots')
            .insert([{
                label,
                capacity,
                start_time: startTime,
                is_active: true // ถ้าตารางคุณมี field นี้
            }]);

        if (error) throw error;

        return NextResponse.json({ ok: true, message: "เพิ่มรอบเรียบร้อย" });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
}

// --- 3. PUT: แก้ไขรอบ (NEW) 🔥 ---
export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, label, capacity } = body;

        // ถ้ามีการแก้เวลา ต้องแก้ start_time ใหม่ด้วย
        const startTime = label.split('-')[0].trim();

        const { error } = await supabase
            .from('slots')
            .update({ label, capacity, start_time: startTime })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ ok: true, message: "แก้ไขเรียบร้อย" });
    } catch (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
}

// --- 4. DELETE: ลบรอบ (NEW) 🔥 ---
export async function DELETE(request) {
    try {
        const body = await request.json();
        const { id } = body;

        const { error } = await supabase
            .from('slots')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ ok: true, message: "ลบเรียบร้อย" });
    } catch (error) {
        // กรณีลบไม่ได้ (เช่น มีคนจองค้างอยู่)
        return NextResponse.json({ ok: false, message: "ลบไม่ได้ (อาจมีประวัติการจองค้างอยู่)" }, { status: 500 });
    }
}