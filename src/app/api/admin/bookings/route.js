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

// export async function GET(request) {
//     try {
//         const { searchParams } = new URL(request.url);
//         const date = searchParams.get('date');
//         const startDate = searchParams.get('startDate');
//         const endDate = searchParams.get('endDate');
//         const page = parseInt(searchParams.get('page')) || 1;
//         const limit = parseInt(searchParams.get('limit')) || 50;

//         // --- ส่วนที่ 1: เตรียมตัวกรอง (Filter Logic) ---
//         // เราแยก Logic การกรองออกมา เพื่อเอาไปใช้กับทั้ง 2 คำสั่ง (ดึงข้อมูลใส่ตาราง และ ดึงตัวเลข KPI)
//         const applyFilters = (queryBuilder) => {
//             if (date) {
//                 return queryBuilder.eq('booking_date', date);
//             } else if (startDate && endDate) {
//                 return queryBuilder.gte('booking_date', startDate).lte('booking_date', endDate);
//             }
//             return queryBuilder;
//         };

//         // --- ส่วนที่ 2: คำสั่งดึงข้อมูลใส่ตาราง (Items) ---
//         // อันนี้เหมือนโค้ดเดิม คือมีการทำ Pagination (.range)
//         let queryItems = supabase.from('bookings').select('*', { count: 'exact' });
//         queryItems = applyFilters(queryItems); // ใส่ตัวกรอง

//         const from = (page - 1) * limit;
//         const to = from + limit - 1;

//         queryItems = queryItems
//             .order('booking_date', { ascending: false })
//             .order('slot_id', { ascending: true })
//             .range(from, to); // ตัดหน้า

//         // --- ส่วนที่ 3: คำสั่งดึงยอด KPI (Stats) ---
//         // 🔥 อันนี้คือส่วนที่เพิ่มมาใหม่: ดึงเฉพาะ status ของ "ทั้งหมด" (ไม่ทำ Pagination)
//         let queryStats = supabase.from('bookings').select('status, booking_date, slot_label');
//         queryStats = applyFilters(queryStats); // ใช้ตัวกรองเดียวกับตาราง

//         // --- ส่วนที่ 4: ยิงคำสั่งพร้อมกัน (Parallel Execution) ---
//         const [resItems, resStats] = await Promise.all([
//             queryItems,
//             queryStats
//         ]);

//         if (resItems.error) throw resItems.error;
//         if (resStats.error) throw resStats.error;

//         // --- ส่วนที่ 5: คำนวณตัวเลข KPI ---
//         // เอาข้อมูลดิบทั้งหมด มานับแยกประเภท
//         const allData = resStats.data || [];
//         const stats = {
//             total: allData.length,
//             waiting: allData.filter(b => b.status === 'BOOKED').length,
//             checkedIn: allData.filter(b => b.status === 'CHECKED_IN').length,
//             cancelled: allData.filter(b => b.status === 'CANCELLED').length
//         };

//         // --- ส่งข้อมูลกลับหน้าบ้าน ---
//         return NextResponse.json({
//             ok: true,
//             items: resItems.data || [],
//             total: resItems.count, // จำนวนรายการทั้งหมด (สำหรับ Pagination)
//             page,
//             limit,
//             stats: stats, // ✅ ส่งยอด KPI ที่ถูกต้องกลับไปด้วย
//             chartDataRaw: resStats.data || [] // ส่งข้อมูลดิบสำหรับทำกราฟไปด้วย
//         });

//     } catch (error) {
//         return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
//     }
// }

// ในไฟล์ src/app/api/admin/bookings/route.js


// export async function GET(request) {
//     try {
//         const { searchParams } = new URL(request.url);
//         const date = searchParams.get('date');
//         const startDate = searchParams.get('startDate');
//         const endDate = searchParams.get('endDate');
//         const search = searchParams.get('search');
//         const page = parseInt(searchParams.get('page')) || 1;
//         const limit = parseInt(searchParams.get('limit')) || 50;

//         // ฟังก์ชันช่วยจัดการตัวกรอง (ใช้ซ้ำได้ทั้ง Items และ Stats)
//         const applyFilters = (queryBuilder) => {
//             let q = queryBuilder;
//             // 1. กรองตามช่วงเวลา
//             if (date) {
//                 q = q.eq('booking_date', date);
//             } else if (startDate && endDate) {
//                 q = q.gte('booking_date', startDate).lte('booking_date', endDate);
//             }
//             // 2. 🔥 กรองตามคำค้นหา (ถ้ามี)
//             if (search) {
//                 q = q.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%,booking_code.ilike.%${search}%`);
//             }
//             return q;
//         };

//         // --- ส่วนที่ 1: ดึงข้อมูลใส่ตาราง (มี Pagination) ---
//         // let queryItems = supabase.from('bookings').select('*', { count: 'exact' });
//         // queryItems = applyFilters(queryItems);

//         // const from = (page - 1) * limit;
//         // const to = from + limit - 1;

//         // const { data: items, count, error: err1 } = await queryItems
//         //     .order('booking_date', { ascending: false })
//         //     .order('slot_id', { ascending: true })
//         //     .range(from, to);
//         // --- ส่วนที่ 1: ดึงข้อมูลใส่ตาราง (Items) ---
//         // let queryItems = supabase.from('bookings').select('*', { count: 'exact' });
//         // queryItems = applyFilters(queryItems);

//         // const from = (page - 1) * limit;
//         // const to = from + limit - 1;

//         // const { data: items, count, error: err1 } = await queryItems
//         //     // 1. เรียงตามวันที่จอง (ใหม่ที่สุดขึ้นก่อน)
//         //     .order('created_at', { ascending: false })
//         //     // 2. ถ้าวันเดียวกัน ให้เรียงตามเวลาที่กดยืนยันจองจริง (ใครเพิ่งกดจองมาให้ขึ้นก่อน)
//         //     .order('booking_date', { ascending: false })
//         //     .range(from, to);

//         // if (err1) throw err1;

//         // version รายวันเรียงตามวันจอง รายเดือนเรียงตามเวลา
//         // --- ส่วนที่ 1: ดึงข้อมูลใส่ตาราง (Items) ---
//         // let queryItems = supabase.from('bookings').select('*', { count: 'exact' });
//         // queryItems = applyFilters(queryItems);

//         // // 🔥 LOGIC การเรียงลำดับ (Sorting) แก้ตรงนี้ครับ 🔥
//         // if (date) {
//         //     // ✅ กรณีดู "รายวัน" (Daily):
//         //     // ให้เรียงตาม "เวลาที่ลูกค้ากดทำรายการ" (created_at) จาก ใหม่ -> เก่า
//         //     // Admin จะได้เห็นคนที่เพิ่งจองเข้ามาอยู่บรรทัดบนสุด
//         //     queryItems = queryItems.order('created_at', { ascending: false });
//         // } else {
//         //     // ✅ กรณีดู "รายเดือน / รายปี / ทั้งหมด":
//         //     // ให้เรียงตาม "ปฏิทินนัดหมาย" (booking_date) จาก อดีต -> อนาคต
//         //     // และเรียงตามรอบเวลา (slot_label หรือ slot_id) จาก เช้า -> เย็น
//         //     queryItems = queryItems
//         //         .order('booking_date', { ascending: true })  // วันที่
//         //         .order('slot_label', { ascending: true });   // เวลา (09:00, 10:00...)
//         // }

//         // const from = (page - 1) * limit;

//         // 
//         // --- รับค่า Sort จาก URL ---
//         const sortKey = searchParams.get('sortKey'); // เช่น 'customer_name'
//         const sortDir = searchParams.get('sortDir'); // 'asc' หรือ 'desc'

//         // 🔥 LOGIC การเรียงลำดับ (Sorting) ใหม่ 🔥
//         if (sortKey && sortDir) {
//             // ✅ กรณี 1: ผู้ใช้กดหัวตารางเอง (Manual Sort)
//             // เราต้องแปลงชื่อคอลัมน์จากหน้าบ้าน ให้ตรงกับใน Database
//             let dbColumn = sortKey;

//             // Mapping ชื่อให้ตรง DB
//             if (sortKey === 'name') dbColumn = 'customer_name';
//             if (sortKey === 'code') dbColumn = 'booking_code';
//             if (sortKey === 'slot') dbColumn = 'slot_id'; // เรียงตาม ID จะแม่นกว่า string
//             if (sortKey === 'date') dbColumn = 'booking_date';

//             queryItems = queryItems.order(dbColumn, { ascending: sortDir === 'asc' });

//         } else {
//             // ✅ กรณี 2: โหลดปกติ (Default Logic เดิม)
//             if (date) {
//                 // รายวัน: เอาล่าสุดขึ้นก่อน
//                 queryItems = queryItems.order('created_at', { ascending: false });
//             } else {
//                 // อื่นๆ: เรียงตามปฏิทิน และ เวลา
//                 queryItems = queryItems
//                     .order('booking_date', { ascending: true })
//                     .order('slot_label', { ascending: true });
//             }
//         }

//         const from = (page - 1) * limit;
//         const to = from + limit - 1;

//         const { data: items, count, error: err1 } = await queryItems.range(from, to);

//         if (err1) throw err1;

//         // --- ส่วนที่ 2: ดึงข้อมูลสรุป KPI (ไม่มี Pagination) ---
//         let queryStats = supabase.from('bookings').select('status, booking_date, slot_label');
//         queryStats = applyFilters(queryStats);

//         const { data: allData, error: err2 } = await queryStats;
//         if (err2) throw err2;

//         // คำนวณ KPI จากข้อมูลที่ถูกกรองแล้ว
//         const stats = {
//             total: allData.length,
//             waiting: allData.filter(b => b.status === 'BOOKED').length,
//             checkedIn: allData.filter(b => b.status === 'CHECKED_IN').length,
//             cancelled: allData.filter(b => b.status === 'CANCELLED').length
//         };

//         return NextResponse.json({
//             ok: true,
//             items: items || [],
//             total: count,
//             page,
//             limit,
//             stats: stats,           // ✅ ส่งกลับไปเพื่อให้หน้าบ้านแสดงตัวเลขข้างบน
//             chartDataRaw: allData    // ✅ ส่งกลับไปเพื่อให้กราฟแสดงผล
//         });

//     } catch (error) {
//         console.error("API Error:", error);
//         return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
//     }
// }


export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        
        // รับค่าพารามิเตอร์ต่างๆ
        const date = searchParams.get('date');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const search = searchParams.get('search');
        
        const sortKey = searchParams.get('sortKey'); 
        const sortDir = searchParams.get('sortDir');

        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 50;

        // ✅ 1. ฟังก์ชันกรอง "วันที่" (ใช้ร่วมกันทั้ง ตาราง และ กราฟ)
        const applyDateFilter = (queryBuilder) => {
            let q = queryBuilder;
            if (date) {
                q = q.eq('booking_date', date);
            } else if (startDate && endDate) {
                q = q.gte('booking_date', startDate).lte('booking_date', endDate);
            }
            return q;
        };

        // =========================================================
        // 🔹 ส่วนที่ 1: ดึงข้อมูลใส่ตาราง (ต้องกรอง วันที่ + คำค้นหา)
        // =========================================================
        let queryItems = supabase.from('bookings').select('*', { count: 'exact' });
        
        // 1.1 ใส่กรองวันที่
        queryItems = applyDateFilter(queryItems);

        // 1.2 ใส่กรองคำค้นหา (เฉพาะตารางเท่านั้น)
        if (search) {
            const cleanSearch = search.trim();
            queryItems = queryItems.or(`customer_name.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,booking_code.ilike.%${cleanSearch}%`);
        }

        // 1.3 เรียงลำดับ (Sorting)
        if (sortKey && sortDir) {
            let dbColumn = sortKey;
            if (sortKey === 'name') dbColumn = 'customer_name';
            if (sortKey === 'code') dbColumn = 'booking_code';
            if (sortKey === 'date') dbColumn = 'booking_date';
            if (sortKey === 'slot') dbColumn = 'slot_id'; 
            
            queryItems = queryItems.order(dbColumn, { ascending: sortDir === 'asc' });
        } else {
            if (date) {
                queryItems = queryItems.order('created_at', { ascending: false });
            } else {
                queryItems = queryItems
                    .order('booking_date', { ascending: true })
                    .order('slot_id', { ascending: true });
            }
        }

        // 1.4 ตัดหน้า (Pagination)
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data: items, count, error: err1 } = await queryItems.range(from, to);

        if (err1) {
            console.error("Query Items Error:", err1);
            throw err1;
        }

        // =========================================================
        // 🔹 ส่วนที่ 2: ดึงข้อมูลกราฟ (ต้องกรอง "วันที่" อย่างเดียว!)
        // =========================================================
        // ❌ ไม่ใส่ Search ตรงนี้ เพื่อให้กราฟแสดงยอดรวมทั้งหมดของวันนั้นๆ
        let queryStats = supabase.from('bookings').select('status, booking_date, slot_label, slot_id'); // แถม slot_id ไปด้วยเผื่อใช้
        
        // ใส่แค่กรองวันที่พอ
        queryStats = applyDateFilter(queryStats);

        const { data: allData, error: err2 } = await queryStats;
        if (err2) {
            console.error("Query Stats Error:", err2);
            throw err2;
        }

        // คำนวณ KPI
        const stats = {
            total: allData.length,
            waiting: allData.filter(b => b.status === 'BOOKED').length,
            checkedIn: allData.filter(b => b.status === 'CHECKED_IN').length,
            cancelled: allData.filter(b => b.status === 'CANCELLED').length,
            noShow: allData.filter(b => b.status === 'NO_SHOW').length
        };

        return NextResponse.json({
            ok: true,
            items: items || [],
            total: count,
            page,
            limit,
            stats: stats,
            chartDataRaw: allData
        });

    } catch (error) {
        console.error("API 500 Error:", error);
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
}