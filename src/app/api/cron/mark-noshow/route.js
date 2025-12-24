import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { lineClient } from '@/utils/line'; // เรียกใช้ตัวส่งไลน์เดิมของคุณ

// เชื่อม Supabase (ใช้ Service Role Key ถ้ามี เพื่อความชัวร์ในการแก้ข้อมูล แต่ใช้ Anon Key ก็ได้ถ้านโยบายไม่เข้ม)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function GET(request) {
    // 1. ระบบความปลอดภัย: เช็คว่ามีกุญแจลับส่งมามั้ย (กันคนนอกกดเล่น)
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    // ⚠️ ให้ตั้งรหัสลับในใจขึ้นมา 1 ตัว เช่น "mySecretPass1234" เอาไว้ใส่ใน Apps Script
    if (key !== "6fecc57824e6f3b0") {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 2. หาวันที่ "เมื่อวาน"
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // 3. ดึงรายการที่ "ค้างสถานะ BOOKED" ของ "เมื่อวานหรือเก่ากว่า"
        const { data: bookings } = await supabase
            .from('bookings')
            .select('*')
            .eq('status', 'BOOKED')
            .lte('booking_date', yesterdayStr); // lte = น้อยกว่าหรือเท่ากับเมื่อวาน

        if (!bookings || bookings.length === 0) {
            return NextResponse.json({ message: "No overdue bookings found." });
        }

        let updatedCount = 0;

        // 4. วนลูปจัดการทีละคน
        for (const b of bookings) {
            // A. เปลี่ยนสถานะใน DB เป็น NO_SHOW
            await supabase.from('bookings').update({ status: 'NO_SHOW' }).eq('id', b.id);

            // B. ถ้ามี LINE User ID -> ส่งข้อความไปถาม
            if (b.line_user_id && b.line_user_id.length > 10) {
                // ลิงก์ไปยังหน้า Feedback (เดี๋ยวค่อยสร้างหน้านี้ทีหลัง)
                // สมมติ URL เว็บคุณคือ https://myshop.vercel.app
                const feedbackUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/feedback?code=${b.booking_code}`;

                const flexMsg = {
                    type: "flex",
                    altText: `❌ แจ้งเตือนการผิดนัด: ${b.booking_code}`,
                    contents: {
                        type: "bubble",
                        // --- 1. ส่วนหัว (Header) ---
                        header: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                { type: "text", text: "MISSED APPOINTMENT", weight: "bold", color: "#ffffff", size: "xs", align: "center" },
                                { type: "text", text: "คุณไม่ได้เข้ารับบริการ", weight: "bold", color: "#ffffff", size: "lg", align: "center", margin: "md" }
                            ],
                            backgroundColor: "#EF4444", // 🔥 เปลี่ยนเป็นสีแดง (Red-500) ให้ดูแตกต่าง
                            paddingAll: "20px"
                        },
                        // --- 2. ส่วนเนื้อหา (Body) ---
                        body: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                { type: "text", text: `คุณ ${b.customer_name || 'ลูกค้า'}`, weight: "bold", size: "xl", align: "center", color: "#1F2937" },
                                { type: "text", text: `รหัสจอง: ${b.booking_code}`, weight: "bold", size: "md", align: "center", color: "#EF4444", margin: "sm" },
                                { type: "separator", margin: "lg" },

                                // กล่องรายละเอียด
                                {
                                    type: "box",
                                    layout: "vertical",
                                    margin: "lg",
                                    spacing: "sm",
                                    contents: [
                                        // วันที่
                                        {
                                            type: "box",
                                            layout: "baseline",
                                            contents: [
                                                { type: "text", text: "วันที่", color: "#aaaaaa", size: "sm", flex: 2 },
                                                { type: "text", text: b.booking_date, wrap: true, color: "#666666", size: "sm", flex: 5, weight: "bold" }
                                            ]
                                        },
                                        // เวลา
                                        {
                                            type: "box",
                                            layout: "baseline",
                                            contents: [
                                                { type: "text", text: "เวลา", color: "#aaaaaa", size: "sm", flex: 2 },
                                                { type: "text", text: b.slot_label || "ไม่ระบุ", wrap: true, color: "#666666", size: "sm", flex: 5, weight: "bold" }
                                            ]
                                        },
                                        // สถานที่ (ใส่เหมือนเดิมเพื่อให้รูปแบบสวยงาม)
                                        {
                                            type: "box",
                                            layout: "baseline",
                                            contents: [
                                                { type: "text", text: "สถานที่", color: "#aaaaaa", size: "sm", flex: 2 },
                                                { type: "text", text: "อาคารสหเวช ชั้น 7\nห้อง TTM704", wrap: true, color: "#666666", size: "sm", flex: 5 }
                                            ]
                                        },
                                        // 💡 เพิ่มข้อความขอเหตุผล (ส่วนสำคัญ)
                                        {
                                            type: "box",
                                            layout: "vertical",
                                            margin: "lg",
                                            contents: [
                                                { type: "text", text: "ทางเราขอรบกวนสอบถามเหตุผลที่ไม่สามารถเข้ารับบริการได้ เพื่อนำข้อมูลไปปรับปรุงระบบครับ", wrap: true, size: "xs", color: "#9CA3AF", align: "center" }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        // --- 3. ส่วนท้าย (Footer) ---
                        footer: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                {
                                    type: "button",
                                    action: { type: "uri", label: "ระบุเหตุผล", uri: feedbackUrl }, // ลิงก์ไปหน้า Feedback
                                    style: "primary",
                                    color: "#EF4444" // สีปุ่มแดง ให้เข้ากับ Header
                                }
                            ]
                        }
                    }
                };

                // ใช้ฟังก์ชัน push เดิมที่มีใน utils/line.js
                await lineClient.push(b.line_user_id, flexMsg);
            }
            updatedCount++;
        }

        return NextResponse.json({ success: true, updated: updatedCount });

    } catch (error) {
        console.error("Cron Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}