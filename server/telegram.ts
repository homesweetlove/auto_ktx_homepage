import type { ReservedTicket } from '../shared/types';

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

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatKstDeadline(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function buildReservationAlertHtml(ticket: ReservedTicket): string {
  const e = escapeHtml;
  const title = ticket.isMock ? '[테스트] KTX 취소표 선점 시뮬레이션' : 'KTX 취소표 자동 선점 성공!';
  const lines = [
    `🚨 <b>${title}</b> 🚨`,
    '',
    `🚄 <b>열차</b>: ${e(ticket.trainType)} ${e(ticket.trainNumber)}호`,
    `📍 <b>구간</b>: ${e(ticket.departureStation)} (${e(ticket.departureTime)}) ➔ ${e(ticket.arrivalStation)} (${e(ticket.arrivalTime)})`,
    `💺 <b>좌석</b>: ${ticket.seatInfo ? e(ticket.seatInfo) : `${e(ticket.seatType)} (호차·좌석은 코레일톡에서 확인)`}`,
  ];
  if (ticket.totalPrice !== null) {
    lines.push(`💳 <b>결제금액</b>: ${ticket.totalPrice.toLocaleString()}원`);
  }
  lines.push(
    ticket.reservationNumber
      ? `🎫 <b>예약번호(PNR)</b>: <code>${e(ticket.reservationNumber)}</code>`
      : '🎫 <b>예약번호</b>: 응답에서 확인하지 못했습니다. 코레일톡에서 직접 확인하세요.'
  );
  lines.push('');
  lines.push(
    ticket.paymentDeadline
      ? `⚠️ <b>[필독] ${formatKstDeadline(ticket.paymentDeadline)}까지 결제 필수!</b>`
      : '⚠️ <b>[필독] 결제 기한을 코레일톡에서 확인하고 즉시 결제하세요!</b>'
  );
  lines.push('지금 즉시 <b>공식 코레일톡 앱</b> 실행 ➔ [장바구니/승차권] 메뉴에서 결제를 완료해 주세요!');
  lines.push('(※ 세션 충돌 방지를 위해 백엔드는 즉각 로그아웃되었습니다)');
  return lines.join('\n');
}
