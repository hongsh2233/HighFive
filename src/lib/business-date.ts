// Target dates are stored as UTC date-only values. Today's day must not depend
// on a deployment host running in UTC when the workspace operates in Korea.
export function businessDateKey(date = new Date(), timeZone = process.env.BUSINESS_TIME_ZONE || 'Asia/Seoul') {
  const parts = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const value = (type: string) => parts.find(part => part.type === type)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
