import { TrainScheduleItem } from '../types/sniper';

export function generateTrainSchedules(
  departureStation: string,
  arrivalStation: string,
  _date: string,
  baseTime: string
): TrainScheduleItem[] {
  const startHour = parseInt(baseTime.slice(0, 2), 10) || 9;

  // Base list of typical KTX trains running on Gyeongbu/Honam lines
  const trainTemplates = [
    { no: '011', type: 'KTX', offsetMin: 15, durationMin: 162, generalAvail: false, specialAvail: false },
    { no: '015', type: 'KTX-산천', offsetMin: 35, durationMin: 154, generalAvail: false, specialAvail: false },
    { no: '019', type: 'KTX', offsetMin: 50, durationMin: 165, generalAvail: false, specialAvail: true },
    { no: '023', type: 'KTX-산천', offsetMin: 70, durationMin: 156, generalAvail: false, specialAvail: false },
    { no: '027', type: 'KTX', offsetMin: 95, durationMin: 160, generalAvail: false, specialAvail: false },
    { no: '031', type: 'KTX-청룡', offsetMin: 115, durationMin: 139, generalAvail: false, specialAvail: false },
    { no: '035', type: 'KTX', offsetMin: 140, durationMin: 168, generalAvail: false, specialAvail: false },
    { no: '039', type: 'KTX-산천', offsetMin: 165, durationMin: 155, generalAvail: false, specialAvail: false },
    { no: '043', type: 'KTX', offsetMin: 190, durationMin: 164, generalAvail: false, specialAvail: false },
  ];

  return trainTemplates.map((template) => {
    const totalMinutes = startHour * 60 + template.offsetMin;
    const depH = Math.floor(totalMinutes / 60) % 24;
    const depM = totalMinutes % 60;
    const depTime = `${depH.toString().padStart(2, '0')}:${depM.toString().padStart(2, '0')}`;

    const arrMinutes = totalMinutes + template.durationMin;
    const arrH = Math.floor(arrMinutes / 60) % 24;
    const arrM = arrMinutes % 60;
    const arrTime = `${arrH.toString().padStart(2, '0')}:${arrM.toString().padStart(2, '0')}`;

    const durH = Math.floor(template.durationMin / 60);
    const durM = template.durationMin % 60;
    const duration = `${durH}시간 ${durM}분`;

    // Pricing calculation based on station
    const basePrice = (departureStation === '서울' && arrivalStation === '부산') ? 59800 : 42500;
    const specialPrice = Math.round(basePrice * 1.4 / 100) * 100;

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
