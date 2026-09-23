import { TrainScheduleItem } from '../types/sniper';

export function getEstimatedPriceAndDuration(dep: string, arr: string): { price: number; durationMin: number } {
  const pair = `${dep}-${arr}`;
  const reversePair = `${arr}-${dep}`;

  if (pair.includes('부산') || reversePair.includes('부산') || pair.includes('신해운대')) {
    return { price: 59800, durationMin: 155 };
  }
  if (pair.includes('동대구') || reversePair.includes('동대구') || pair.includes('서대구') || pair.includes('경주')) {
    return { price: 43500, durationMin: 110 };
  }
  if (pair.includes('대전') || reversePair.includes('대전') || pair.includes('서대전') || pair.includes('오송')) {
    return { price: 23700, durationMin: 65 };
  }
  if (pair.includes('광주') || reversePair.includes('광주') || pair.includes('나주')) {
    return { price: 46800, durationMin: 115 };
  }
  if (pair.includes('여수') || reversePair.includes('여수') || pair.includes('순천')) {
    return { price: 47200, durationMin: 190 };
  }
  if (pair.includes('목포') || reversePair.includes('목포')) {
    return { price: 52800, durationMin: 145 };
  }
  if (pair.includes('강릉') || reversePair.includes('강릉') || pair.includes('동해')) {
    return { price: 27600, durationMin: 120 };
  }
  if (pair.includes('포항') || reversePair.includes('포항')) {
    return { price: 53600, durationMin: 140 };
  }
  if (pair.includes('전주') || reversePair.includes('전주') || pair.includes('남원')) {
    return { price: 34400, durationMin: 95 };
  }
  if (pair.includes('진주') || reversePair.includes('진주') || pair.includes('마산') || pair.includes('창원')) {
    return { price: 57400, durationMin: 195 };
  }
  if (pair.includes('안동') || reversePair.includes('안동') || pair.includes('영주') || pair.includes('제천')) {
    return { price: 25100, durationMin: 125 };
  }

  return { price: 38000, durationMin: 130 };
}

export function generateTrainSchedules(
  departureStation: string,
  arrivalStation: string,
  _date: string,
  baseTime: string
): TrainScheduleItem[] {
  const startHour = parseInt(baseTime.slice(0, 2), 10) || 8;
  const { price: basePrice, durationMin: avgDuration } = getEstimatedPriceAndDuration(departureStation, arrivalStation);

  const trainTemplates = [
    { no: '011', type: 'KTX', offsetMin: 12, durationDelta: -5, generalAvail: false, specialAvail: false },
    { no: '015', type: 'KTX-산천', offsetMin: 35, durationDelta: -8, generalAvail: false, specialAvail: false },
    { no: '019', type: 'KTX', offsetMin: 52, durationDelta: 3, generalAvail: false, specialAvail: true },
    { no: '023', type: 'KTX-산천', offsetMin: 75, durationDelta: -6, generalAvail: false, specialAvail: false },
    { no: '027', type: 'KTX', offsetMin: 98, durationDelta: 2, generalAvail: false, specialAvail: false },
    { no: '031', type: 'KTX-청룡', offsetMin: 118, durationDelta: -16, generalAvail: false, specialAvail: false },
    { no: '035', type: 'KTX', offsetMin: 142, durationDelta: 5, generalAvail: false, specialAvail: false },
    { no: '039', type: 'KTX-산천', offsetMin: 168, durationDelta: -4, generalAvail: false, specialAvail: false },
    { no: '043', type: 'KTX', offsetMin: 195, durationDelta: 6, generalAvail: false, specialAvail: false },
  ];

  return trainTemplates.map((template) => {
    const totalMinutes = startHour * 60 + template.offsetMin;
    const depH = Math.floor(totalMinutes / 60) % 24;
    const depM = totalMinutes % 60;
    const depTime = `${depH.toString().padStart(2, '0')}:${depM.toString().padStart(2, '0')}`;

    const tripDuration = Math.max(45, avgDuration + template.durationDelta);
    const arrMinutes = totalMinutes + tripDuration;
    const arrH = Math.floor(arrMinutes / 60) % 24;
    const arrM = arrMinutes % 60;
    const arrTime = `${arrH.toString().padStart(2, '0')}:${arrM.toString().padStart(2, '0')}`;

    const durH = Math.floor(tripDuration / 60);
    const durM = tripDuration % 60;
    const duration = `${durH}시간 ${durM}분`;

    const specialPrice = Math.round((basePrice * 1.4) / 100) * 100;

    return {
      trainNumber: template.no,
      trainType: template.type,
      departureTime: depTime,
      arrivalTime: arrTime,
      duration,
      departureStation,
      arrivalStation,
      generalSeatStatus: template.generalAvail ? 'AVAILABLE' : 'SOLD_OUT',
      specialSeatStatus: template.specialAvail ? 'AVAILABLE' : 'SOLD_OUT',
      generalPrice: basePrice,
      specialPrice,
    };
  });
}
