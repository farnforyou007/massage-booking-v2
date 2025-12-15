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
        const events = body.events;

        if (!events || events.length === 0) return NextResponse.json({ status: 'ok' });

        for (const event of events) {
            if (event.type === 'message' && event.message.type === 'text') {
                const userMsg = event.message.text.trim();
                const replyToken = event.replyToken;
                const userId = event.source.userId;

                // 1. กดจอง
                if (userMsg === "จองคิว" || userMsg === "ลงทะเบียน") {
                    const liffUrl = `https://liff.line.me/${process.env.VITE_LIFF_ID}`;
                    await lineClient.reply(replyToken, {
                        type: "text",
                        text: `กดที่ลิงก์นี้เพื่อลงทะเบียนจองคิวได้เลยครับ\n👉 ${liffUrl}`
                    });
                }
                // 2. เช็คสถานะ (ค้นหาจาก DB จริงๆ)
                else if (userMsg === "การจองของฉัน" || userMsg === "เช็คสถานะ") {
                    const { data: booking } = await supabase
                        .from('bookings')
                        .select('*')
                        .eq('line_user_id', userId)
                        .neq('status', 'CANCELLED')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (booking) {
                        const ticketUrl = `https://liff.line.me/${process.env.VITE_LIFF_ID}/ticket?code=${booking.booking_code}`;
                        const msg = `📅 ข้อมูลการจองของคุณ\nรหัส: ${booking.booking_code}\nชื่อ: ${booking.customer_name}\nวันที่: ${booking.booking_date}\nเวลา: ${booking.slot_label}\n\nดู QR Code: ${ticketUrl}`;
                        await lineClient.reply(replyToken, { type: "text", text: msg });
                    } else {
                        await lineClient.reply(replyToken, { type: "text", text: "ไม่พบข้อมูลการจองของคุณ หรือคุณอาจยังไม่ได้ลงทะเบียนครับ" });
                    }
                }
                // 3. แอดมิน
                else if (userMsg === "แอดมิน" || userMsg === "ผู้ดูแล") {
                    await lineClient.reply(replyToken, { type: "text", text: `เข้าสู่ระบบผู้ดูแล:\nhttps://${request.headers.get('host')}/admin` });
                }
                // 4. อื่นๆ
                else {
                    await lineClient.reply(replyToken, { type: "text", text: "ผมไม่เข้าใจคำสั่งครับ 😅\nลองพิมพ์ 'เมนู' เพื่อดูคำสั่งที่ใช้ได้นะครับ" });
                }
            }
        }
        return NextResponse.json({ status: 'ok' });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ status: 'error' }, { status: 500 });
    }
}