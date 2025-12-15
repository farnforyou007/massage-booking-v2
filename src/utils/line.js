import { createClient } from '@supabase/supabase-js';

// Setup Supabase (สำหรับใช้ในไฟล์นี้)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LIFF_URL = `https://liff.line.me/${process.env.VITE_LIFF_ID}`; // อ่านจาก .env

export const lineClient = {
    reply: async (replyToken, messages) => {
        if (!Array.isArray(messages)) messages = [messages];
        await fetch("https://api.line.me/v2/bot/message/reply", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ replyToken, messages }),
        });
    },

    push: async (userId, messages) => {
        if (!userId || userId === 'NO_LIFF') return;
        if (!Array.isArray(messages)) messages = [messages];
        await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ to: userId, messages }),
        });
    },

    // Template: ยืนยันการจอง (สีเขียว)
    createBookingFlex: (booking) => ({
        type: "flex",
        altText: `✅ ยืนยันการจองคิว: ${booking.code}`,
        contents: {
            type: "bubble",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "text", text: "CONFIRMED", weight: "bold", color: "#ffffff", size: "xs", align: "center" },
                    { type: "text", text: "ข้อมูลการจองคิว", weight: "bold", color: "#ffffff", size: "lg", align: "center", margin: "md" }
                ],
                backgroundColor: "#047857",
                paddingAll: "20px"
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "text", text: `คุณ ${booking.name}`, weight: "bold", size: "xl", align: "center", color: "#1F2937" },
                    { type: "text", text: `รหัสจอง: ${booking.code}`, weight: "bold", size: "md", align: "center", color: "#047857", margin: "sm" },
                    { type: "separator", margin: "lg" },
                    {
                        type: "box",
                        layout: "vertical",
                        margin: "lg",
                        spacing: "sm",
                        contents: [
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "วันที่", color: "#aaaaaa", size: "sm", flex: 2 },
                                    { type: "text", text: booking.date, wrap: true, color: "#666666", size: "sm", flex: 5, weight: "bold" }
                                ]
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "เวลา", color: "#aaaaaa", size: "sm", flex: 2 },
                                    { type: "text", text: booking.slot, wrap: true, color: "#666666", size: "sm", flex: 5, weight: "bold" }
                                ]
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "สถานที่", color: "#aaaaaa", size: "sm", flex: 2 },
                                    { type: "text", text: "อาคารสหเวช ชั้น 7\nห้อง TTM704", wrap: true, color: "#666666", size: "sm", flex: 5 }
                                ]
                            }
                        ]
                    }
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        action: { type: "uri", label: "ดูรายละเอียด / QR Code", uri: `${LIFF_URL}/ticket?code=${booking.code}` },
                        style: "primary",
                        color: "#047857"
                    }
                ]
            }
        }
    }),

    // Template: แจ้งเตือนล่วงหน้า 1 วัน (สีส้ม)
    createReminderFlex: (booking) => ({
        type: "flex",
        altText: `🔔 แจ้งเตือนนัดหมาย: ${booking.name}`,
        contents: {
            type: "bubble",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "text", text: "REMINDER", weight: "bold", color: "#ffffff", size: "xs", align: "center" },
                    { type: "text", text: "แจ้งเตือนนัดหมาย", weight: "bold", color: "#ffffff", "size": "lg", align: "center", margin: "md" }
                ],
                backgroundColor: "#F59E0B",
                paddingAll: "20px"
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "text", text: `สวัสดีคุณ ${booking.name}`, weight: "bold", size: "md", align: "center", color: "#1F2937" },
                    { type: "text", text: "พรุ่งนี้คุณมีนัดนวดรักษาอาการ", size: "xs", color: "#6B7280", align: "center", margin: "sm" },
                    { type: "separator", margin: "lg" },
                    {
                        type: "box",
                        layout: "vertical",
                        margin: "lg",
                        spacing: "sm",
                        contents: [
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "วันที่", color: "#aaaaaa", size: "sm", flex: 2 },
                                    { type: "text", text: booking.date, wrap: true, color: "#666666", size: "sm", flex: 5, weight: "bold" }
                                ]
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "เวลา", color: "#aaaaaa", size: "sm", flex: 2 },
                                    { type: "text", text: booking.slot, wrap: true, color: "#666666", size: "sm", flex: 5, weight: "bold" }
                                ]
                            }
                        ]
                    }
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        action: { type: "uri", label: "ดูรายละเอียด", uri: `${LIFF_URL}/ticket?code=${booking.code}` },
                        style: "primary",
                        color: "#F59E0B"
                    }
                ]
            }
        }
    }),

    // Template: แจ้งเตือนด่วน 1 ชม. (สีแดง)
    createUrgentFlex: (booking) => ({
        type: "flex",
        altText: `⏳ ใกล้ถึงเวลานัด: ${booking.name}`,
        contents: {
            type: "bubble",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "text", text: "URGENT", weight: "bold", color: "#ffffff", size: "xs", align: "center" },
                    { type: "text", text: "ใกล้ถึงเวลานัดหมาย", weight: "bold", color: "#ffffff", "size": "lg", align: "center", margin: "md" }
                ],
                backgroundColor: "#EF4444",
                paddingAll: "20px"
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "text", text: `คุณ ${booking.name}`, weight: "bold", size: "xl", align: "center", color: "#1F2937" },
                    { type: "text", text: "อีกประมาณ 1 ชม. จะถึงเวลานัด", size: "xs", color: "#6B7280", align: "center", margin: "xs" },
                    { type: "separator", margin: "lg" },
                    {
                        type: "box",
                        layout: "vertical",
                        margin: "lg",
                        spacing: "sm",
                        contents: [
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "เวลา", color: "#aaaaaa", size: "sm", flex: 2 },
                                    { type: "text", text: booking.slot, wrap: true, color: "#EF4444", size: "xl", flex: 5, weight: "bold" }
                                ]
                            }
                        ]
                    }
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        action: { type: "uri", label: "ดูตั๋วของคุณ", uri: `${LIFF_URL}/ticket?code=${booking.code}` },
                        style: "primary",
                        color: "#EF4444"
                    }
                ]
            }
        }
    })
};