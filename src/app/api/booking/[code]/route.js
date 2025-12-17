import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 1. GET: ค้นหาข้อมูล
export async function GET(request, { params }) {
    try {
        // ✅ 1. ต้อง await params เสมอ (สำหรับ Next.js 15+)
        const resolvedParams = await params;
        const rawCode = decodeURIComponent(resolvedParams.code).trim(); // ถอดรหัส URL และตัดช่องว่าง
        const upperCode = rawCode.toUpperCase();

        let query = supabase.from('bookings').select('*');

        // ✅ 2. ตรวจสอบว่าเป็น "เบอร์โทร" หรือ "รหัสจอง"
        // ถ้าเป็นตัวเลขล้วน 9-10 หลัก หรือมีขีดคั่น ให้ถือว่าเป็นเบอร์โทร
        const isPhone = /^0[0-9-]{8,12}$/.test(rawCode);

        if (isPhone) {
            // ค้นหาด้วยเบอร์โทร (ตัดขีดออกก่อน)
            const cleanPhone = rawCode.replace(/[^0-9]/g, "");
            console.log("🔍 ค้นหาด้วยเบอร์โทร:", cleanPhone);
            query = query.eq('phone', cleanPhone);
        } else if (upperCode.length === 4) {
            // ค้นหาด้วยรหัสย่อ 4 ตัวท้าย (เช่น A1B2)
            console.log("🔍 ค้นหาด้วยรหัสย่อ:", upperCode);
            query = query.like('booking_code', `%${upperCode}`);
        } else {
            // ค้นหาด้วยรหัสเต็ม (เช่น 0812345678-ABCD)
            console.log("🔍 ค้นหาด้วยรหัสเต็ม:", upperCode);
            query = query.eq('booking_code', upperCode);
        }

        // เอาใบล่าสุดเสมอ
        const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

        if (error || !data) {
            console.warn("❌ ไม่พบข้อมูล:", rawCode);
            return NextResponse.json({ ok: false, message: "ไม่พบข้อมูลการจอง" });
        }

        return NextResponse.json({
            ok: true,
            booking: {
                // แปลงชื่อตัวแปรให้หน้าบ้านใช้ง่ายๆ
                code: data.booking_code,
                name: data.customer_name,
                phone: data.phone,
                date: data.booking_date,
                slot: data.slot_label,
                status: data.status,
                line_user_id: data.line_user_id ,
                line_picture_url: data.line_picture_url
            }
        });

    } catch (error) {
        console.error("GET Error:", error);
        return NextResponse.json({ ok: false, message: "Server Error" }, { status: 500 });
    }
}

// 2. POST: อัปเดตสถานะ (แก้จุดที่พัง)
export async function POST(request, { params }) {
    try {
        // 🔥 ย้ายเข้ามาใน try เพื่อกัน Error
        // 🔥 ใส่ await params เพื่อรองรับ Next.js รุ่นใหม่ล่าสุด
        const resolvedParams = await params; 
        const code = resolvedParams.code.toUpperCase(); 

        console.log("🔥 กำลังอัปเดต:", code);

        const body = await request.json();
        const { status } = body;

        // สั่งอัปเดตลง Supabase
        const { data, error } = await supabase
            .from('bookings')
            .update({ status: status }) 
            .eq('booking_code', code) 
            .select();

        if (error) throw error;

        // เช็คว่าเจอไหม
        if (!data || data.length === 0) {
            console.error("❌ หา Booking ไม่เจอใน DB:", code);
            return NextResponse.json({ 
                ok: false, 
                message: `ไม่พบรหัส ${code} ในระบบ (ตรวจสอบความถูกต้องของรหัส)` 
            }, { status: 404 });
        }

        return NextResponse.json({ 
            ok: true, 
            message: "อัปเดตสถานะเรียบร้อย",
            data: data 
        });

    } catch (error) {
        console.error("Update Error:", error);
        // ส่ง Error กลับไปเป็น JSON เสมอ (หน้าเว็บจะได้ไม่พัง)
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
}