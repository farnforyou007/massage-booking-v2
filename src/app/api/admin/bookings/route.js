// src/app/api/admin/bookings/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// export async function GET(request) {
//     try {
//         const { searchParams } = new URL(request.url);
//         const date = searchParams.get('date');

//         let query = supabase.from('bookings').select('*');

//         // ถ้ามีการส่งวันที่มา ให้กรองเฉพาะวันนั้น
//         if (date) {
//             query = query.eq('booking_date', date);
//         }

//         // เรียงลำดับตามรอบเวลา (slot_id) และวันที่สร้าง
//         query = query.order('slot_id', { ascending: true })
//             .order('created_at', { ascending: true });

//         const { data, error } = await query;

//         if (error) throw error;

//         return NextResponse.json({ ok: true, items: data || [] });

//     } catch (error) {
//         return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
//     }
// }

// version with pagination
// export async function GET(request) {
//     try {
//         const { searchParams } = new URL(request.url);
//         const date = searchParams.get('date');
//         const startDate = searchParams.get('startDate');
//         const endDate = searchParams.get('endDate');
//         const page = parseInt(searchParams.get('page')) || 1;
//         const limit = parseInt(searchParams.get('limit')) || 20; // แสดงหน้าละ 20 รายการ

//         let query = supabase.from('bookings').select('*', { count: 'exact' });

//         // --- กรองข้อมูลตามเงื่อนไข ---
//         if (date) {
//             query = query.eq('booking_date', date);
//         } else if (startDate && endDate) {
//             query = query.gte('booking_date', startDate).lte('booking_date', endDate);
//         }

//         // --- ทำ Pagination ---
//         const from = (page - 1) * limit;
//         const to = from + limit - 1;

//         query = query
//             .order('booking_date', { ascending: false })
//             .order('slot_id', { ascending: true })
//             .range(from, to);

//         const { data, error, count } = await query;
//         if (error) throw error;

//         return NextResponse.json({ 
//             ok: true, 
//             items: data || [], 
//             total: count, // ส่งจำนวนทั้งหมดกลับไปให้หน้าบ้านทำ Pagination
//             page,
//             limit
//         });

//     } catch (error) {
//         return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
//     }
// }

// version with pagination and user info


export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 20;

        // --- ส่วนที่ 1: เตรียมตัวกรอง (Filter Logic) ---
        // เราแยก Logic การกรองออกมา เพื่อเอาไปใช้กับทั้ง 2 คำสั่ง (ดึงข้อมูลใส่ตาราง และ ดึงตัวเลข KPI)
        const applyFilters = (queryBuilder) => {
            if (date) {
                return queryBuilder.eq('booking_date', date);
            } else if (startDate && endDate) {
                return queryBuilder.gte('booking_date', startDate).lte('booking_date', endDate);
            }
            return queryBuilder;
        };

        // --- ส่วนที่ 2: คำสั่งดึงข้อมูลใส่ตาราง (Items) ---
        // อันนี้เหมือนโค้ดเดิม คือมีการทำ Pagination (.range)
        let queryItems = supabase.from('bookings').select('*', { count: 'exact' });
        queryItems = applyFilters(queryItems); // ใส่ตัวกรอง

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        queryItems = queryItems
            .order('booking_date', { ascending: false })
            .order('slot_id', { ascending: true })
            .range(from, to); // ตัดหน้า

        // --- ส่วนที่ 3: คำสั่งดึงยอด KPI (Stats) ---
        // 🔥 อันนี้คือส่วนที่เพิ่มมาใหม่: ดึงเฉพาะ status ของ "ทั้งหมด" (ไม่ทำ Pagination)
        let queryStats = supabase.from('bookings').select('status, booking_date, slot_label');
        queryStats = applyFilters(queryStats); // ใช้ตัวกรองเดียวกับตาราง

        // --- ส่วนที่ 4: ยิงคำสั่งพร้อมกัน (Parallel Execution) ---
        const [resItems, resStats] = await Promise.all([
            queryItems,
            queryStats
        ]);

        if (resItems.error) throw resItems.error;
        if (resStats.error) throw resStats.error;

        // --- ส่วนที่ 5: คำนวณตัวเลข KPI ---
        // เอาข้อมูลดิบทั้งหมด มานับแยกประเภท
        const allData = resStats.data || [];
        const stats = {
            total: allData.length,
            waiting: allData.filter(b => b.status === 'BOOKED').length,
            checkedIn: allData.filter(b => b.status === 'CHECKED_IN').length,
            cancelled: allData.filter(b => b.status === 'CANCELLED').length
        };

        // --- ส่งข้อมูลกลับหน้าบ้าน ---
        return NextResponse.json({
            ok: true,
            items: resItems.data || [],
            total: resItems.count, // จำนวนรายการทั้งหมด (สำหรับ Pagination)
            page,
            limit,
            stats: stats, // ✅ ส่งยอด KPI ที่ถูกต้องกลับไปด้วย
            chartDataRaw: resStats.data || [] // ส่งข้อมูลดิบสำหรับทำกราฟไปด้วย
        });

    } catch (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
}