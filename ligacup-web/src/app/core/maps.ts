export function mapsUrl(address: string): string {
  const query = encodeURIComponent(address);
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;

  if (/Android/i.test(userAgent)) return `geo:0,0?q=${query}`;
  if (/iPhone|iPad|iPod|Macintosh/i.test(userAgent)) {
    return `https://maps.apple.com/?q=${query}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}