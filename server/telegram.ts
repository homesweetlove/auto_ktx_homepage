export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ success: boolean; message?: string }> {
  if (!botToken || !chatId) {
    return { success: false, message: '토큰 또는 Chat ID가 비어있습니다.' };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
    const data = await res.json() as any;
    if (data?.ok) {
      return { success: true };
    }
    return { success: false, message: data?.description || '텔레그램 전송 실패' };
  } catch (e: any) {
    return { success: false, message: e.message || String(e) };
  }
}

export function buildReservationAlertHtml(params: {
  trainNumber: string;
  trainType: string;
  depStation: string;
  arrStation: string;
  depTime: string;
  arrTime: string;
  seatInfo: string;
  price: number;
  pnrNo: string;
}): string {
  return `🚨 <b>[KTX 취소표 자동 선점 성공!]</b> 🚨

🚄 <b>열차</b>: ${params.trainType} ${params.trainNumber}호
📍 <b>구간</b>: ${params.depStation} (${params.depTime}) ➔ ${params.arrStation} (${params.arrTime})
💺 <b>좌석</b>: ${params.seatInfo}
💳 <b>결제금액</b>: ${params.price.toLocaleString()}원
🎫 <b>예약번호(PNR)</b>: <code>${params.pnrNo}</code>

⚠️ <b>[필독] 10분 이내 결제 필수!</b>
지금 즉시 <b>공식 코레일톡 앱</b> 실행 ➔ [장바구니/승차권] 메뉴에서 결제를 완료해 주세요!
(※ 세션 충돌 방지를 위해 백엔드는 즉각 로그아웃되었습니다)`;
}
