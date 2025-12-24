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
                    altText: "แบบสอบถามการเข้ารับบริการ",
                    contents: {
                        type: "bubble",
                        header: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                { type: "text", text: "MISSED APPOINTMENT", color: "#ffffff", weight: "bold", size: "xs", align: "center" }
                            ],
                            backgroundColor: "#EF4444" // สีแดง (บ่งบอกสถานะ)
                        },
                        body: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                // 1. หัวข้อ: ใช้คำว่า "ไม่ได้เข้ารับบริการ" แทน "ไม่มาตามนัด"
                                { type: "text", text: "ท่านไม่ได้เข้ารับบริการตามนัด", weight: "bold", size: "lg", color: "#333333", align: "center" },

                                // 2. วันที่
                                { type: "text", text: `รอบวันที่: ${b.booking_date}`, size: "sm", color: "#666666", margin: "md", align: "center" },

                                { type: "separator", margin: "lg" },

                                // 3. เนื้อหา: ขอความร่วมมือแบบนุ่มนวล
                                {
                                    type: "text",
                                    text: "ทางเราขอรบกวนสอบถามสาเหตุที่ไม่สามารถเข้ารับบริการได้ เพื่อนำข้อมูลไปปรับปรุงให้ดียิ่งขึ้นครับ",
                                    wrap: true,
                                    size: "sm",
                                    color: "#666666",
                                    margin: "lg",
                                    align: "center"
                                }
                            ]
                        },
                        footer: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                {
                                    type: "button",
                                    // 4. ปุ่ม: ใช้คำว่า "ให้ข้อมูล" หรือ "แจ้งสาเหตุ"
                                    action: { type: "uri", label: "แจ้งสาเหตุ", uri: feedbackUrl },
                                    style: "primary",
                                    color: "#EF4444",
                                    height: "sm"
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