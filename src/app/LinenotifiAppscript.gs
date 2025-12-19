// ================= CONFIGURATION =================
const SUPABASE_URL = 'https://zvhovbcrgmxgediltnuk.supabase.co'; // 🔴 ใส่ URL Supabase
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2aG92YmNyZ214Z2VkaWx0bnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzE0NDAsImV4cCI6MjA4MTQ0NzQ0MH0.MVYPZK8yKlI_QeYpeAHeP-LgY-45Q6vpOcIXOeIEdcE';                // 🔴 ใส่ Service Role / Anon Key
const LINE_ACCESS_TOKEN = 'qKMb3Nu5HjNlg5L2sooWlIE+ABBp/+19vYXbKOaSXlZ2e8YYkQcDY8ObI7kScoCWeLEmxL+4w7DX5fdGLUjMbO74gR8Zea59fWpidys1moW62pkprtGx79wEV/Hn0dTEO0MSB05tJ1j8wLC980lgfgdB04t89/1O/w1cDnyilFU=';             // 🔴 ใส่ LINE Channel Access Token
const LIFF_URL = 'https://liff.line.me/2008703655-Q4b7ke69';    // 🔴 ใส่ Link LIFF ของคุณ (เช่น https://liff.line.me/165xxxx-xxxx)

// ================= MAIN FUNCTIONS =================

// 1. แจ้งเตือนล่วงหน้า 1 วัน (รันวันละ 1 ครั้ง ตอน 8.00 น.)
function notifyTomorrowBookings() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = Utilities.formatDate(tomorrow, "GMT+7", "yyyy-MM-dd");

  Logger.log("🔎 ตรวจสอบคิวพรุ่งนี้: " + tomorrowStr);

  // ดึงข้อมูลจาก Supabase
  const bookings = fetchBookingsFromSupabase(tomorrowStr);

  if (bookings.length === 0) {
    Logger.log("✅ ไม่มีคิวพรุ่งนี้");
    return;
  }

  bookings.forEach(booking => {
    if (booking.line_user_id) {
      // แปลงข้อมูลให้ตรงกับ Template
      const templateData = {
        name: booking.customer_name || booking.name,
        date: formatDateThai(booking.booking_date),
        slot: booking.slot_label || booking.slot,
        code: booking.booking_code || booking.code
      };

      // สร้าง Flex Message สีส้ม
      const flexMessage = createReminderFlex(templateData);

      // ส่งไลน์
      sendLineMessage(booking.line_user_id, flexMessage);
    }
  });
}

// 2. แจ้งเตือนด่วนก่อน 1 ชม. (รันทุกชั่วโมง)
function notifyUrgentBookings() {
  const now = new Date();
  const todayStr = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd");

  // คำนวณเวลาชั่วโมงถัดไป (เช่น ตอนนี้ 08:30 -> หาคิว 09:00 - 09:xx)
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1);
  const nextHourStr = Utilities.formatDate(nextHour, "GMT+7", "HH"); // ได้เลขชั่วโมง เช่น "09", "10"

  Logger.log(`🔎 ตรวจสอบคิววันนี้ (${todayStr}) รอบเวลาขึ้นต้นด้วย ${nextHourStr}:00`);

  // ดึงข้อมูลทั้งหมดของวันนี้มาก่อน
  const bookings = fetchBookingsFromSupabase(todayStr);

  bookings.forEach(booking => {
    // เช็คว่าเวลาเริ่มของ Slot ตรงกับชั่วโมงถัดไปหรือไม่ (เช่น "09:00-10:00" เริ่มด้วย "09")
    const slotTime = booking.slot_label || booking.slot || ""; // เช่น "09:00-10:30"

    if (slotTime.startsWith(nextHourStr) && booking.line_user_id) {
      Logger.log(`⚡ พบคิวด่วน: ${booking.customer_name} รอบ ${slotTime}`);

      const templateData = {
        name: booking.customer_name || booking.name,
        date: formatDateThai(booking.booking_date),
        slot: slotTime,
        code: booking.booking_code || booking.code
      };

      // สร้าง Flex Message สีแดง
      const flexMessage = createUrgentFlex(templateData);

      // ส่งไลน์
      sendLineMessage(booking.line_user_id, flexMessage);
    }
  });
}

// ================= HELPERS =================

function fetchBookingsFromSupabase(dateStr) {
  // ดึงเฉพาะสถานะ BOOKED
  const url = `${SUPABASE_URL}/rest/v1/bookings?booking_date=eq.${dateStr}&status=eq.BOOKED&select=*`;
  const options = {
    method: 'get',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  };

  try {
    const res = UrlFetchApp.fetch(url, options);
    return JSON.parse(res.getContentText());
  } catch (e) {
    Logger.log("❌ Error fetching Supabase: " + e);
    return [];
  }
}

// function sendLineMessage(userId, flexContent) {
//   try {
//     UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
//       method: "post",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": "Bearer " + LINE_ACCESS_TOKEN
//       },
//       payload: JSON.stringify({
//         to: userId,
//         messages: [flexContent] // ส่ง Flex Message ที่สร้างมา
//       })
//     });
//     Logger.log(`📤 ส่งข้อความหา User สำเร็จ`);
//   } catch (e) {
//     Logger.log(`❌ Error sending LINE: ` + e);
//   }
// }
function sendLineMessage(userId, flexContent) {
  // 1. เช็คความถูกต้องของข้อมูลก่อนส่ง
  if (!userId) {
    Logger.log("❌ Error: ไม่มี User ID (userId เป็นค่าว่าง) ข้ามการส่ง...");
    return;
  }
  
  if (!flexContent) {
    Logger.log("❌ Error: Flex Message เป็นค่าว่าง (ฟังก์ชัน Template ไม่คืนค่า)");
    return;
  }

  // 2. เตรียม Payload
  const payload = JSON.stringify({
    to: userId,
    messages: [flexContent]
  });

  // (Optional) เปิดบรรทัดนี้ถ้าอยากเห็นว่าส่งอะไรไป
  // Logger.log("📤 กำลังส่ง Payload: " + payload);

  try {
    const response = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + LINE_ACCESS_TOKEN
      },
      payload: payload,
      muteHttpExceptions: true // 🔥 สำคัญ: ใส่เพื่อไม่ให้ Script หยุดทำงานเมื่อเจอ Error 400
    });

    const resCode = response.getResponseCode();
    const resBody = response.getContentText();

    if (resCode === 200) {
      Logger.log(`✅ ส่งข้อความสำเร็จหา: ${userId}`);
    } else {
      // ถ้า Error จะแสดงรายละเอียดทั้งหมดออกมา
      Logger.log(`❌ LINE API Error (${resCode}): ${resBody}`);
    }

  } catch (e) {
    Logger.log(`❌ System Exception: ` + e);
  }
}

function formatDateThai(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]} ${parseInt(parts[0]) + 543}`;
}

// ================= TEMPLATES (จากที่คุณให้มา) =================

const createReminderFlex = (booking) => ({
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
      backgroundColor: "#F59E0B", // สีส้ม Amber
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
            },
            {
              type: "box",
              layout: "baseline",
              contents: [
                { type: "text", text: "สถานที่", color: "#aaaaaa", size: "sm", flex: 2 },
                { type: "text", text: "อาคารสหเวช ชั้น 7\nห้อง TTM704", wrap: true, "color": "#666666", size: "sm", flex: 5 }
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
          action: { type: "uri", label: "ดูรายละเอียด / ยกเลิก", uri: `${LIFF_URL}/ticket?code=${booking.code}` },
          style: "primary",
          color: "#F59E0B"
        }
      ]
    }
  }
});

const createUrgentFlex = (booking) => ({
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
      backgroundColor: "#EF4444", // สีแดง
      paddingAll: "20px"
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: `คุณ ${booking.name}`, weight: "bold", size: "xl", align: "center", color: "#1F2937" },
        { type: "text", text: `รหัสจอง: ${booking.code}`, weight: "bold", size: "md", align: "center", color: "#EF4444", margin: "sm" },
        { type: "text", text: "อีกประมาณ 15 นาที จะถึงเวลานัด", size: "xs", color: "#6B7280", align: "center", margin: "xs" },
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
          action: { type: "uri", label: "ดูรายละเอียด / ยกเลิก", uri: `${LIFF_URL}/ticket?code=${booking.code}` },
          style: "primary",
          color: "#EF4444"
        }
      ]
    }
  }
});