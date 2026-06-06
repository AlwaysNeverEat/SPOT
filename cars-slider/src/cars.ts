export interface Car {
  name: string;
  volume: string;
  oil: string;
  filter: string;
  price: number;
  image: string;
}

// Pre-calculated «promo» offers, ported from the original site.
// Images live in the static site at photos/cars/*.webp (root-relative).
export const cars: Car[] = [
  { name: 'Chevrolet Cruze 1.6', volume: '4.5 л', oil: 'SPOT STANDART 5w-30 (A3/B4, SN)', filter: 'LYNXauto LO-1520', price: 4562, image: 'photos/cars/chevrolet-cruze.webp' },
  { name: 'Geely Coolray 1.5', volume: '5.6 л', oil: 'SPOT OPTIMAL 5w-30 (A3/B4, SN/CF)', filter: 'LYNX LC-171', price: 7220, image: 'photos/cars/geely-coolray.webp' },
  { name: 'Chery Tiggo 4 Pro 1.5', volume: '4.5 л', oil: 'SPOT OPTIMAL 5w-30 (A3/B4, SN/CF)', filter: 'LYNX LC-171', price: 5900, image: 'photos/cars/chery-tiggo-4-pro.webp' },
  { name: 'Haval Jolion 1.5', volume: '4.3 л', oil: 'ROLF Professional 5W-30 (A5/B5, SP)', filter: 'LYNX LC-1320', price: 6599, image: 'photos/cars/haval-jolion.webp' },
  { name: 'Lada Vesta 1.6', volume: '4 л', oil: 'SPOT STANDART 5w-40 (A3/B4, SN)', filter: 'LYNX LC-1030', price: 3944, image: 'photos/cars/lada-vesta.webp' },
  { name: 'Chery Tiggo 7 Pro Max 1.5', volume: '4.7 л', oil: 'SPOT OPTIMAL 5w-30 (A3/B4, SN/CF)', filter: 'LYNX LC-171', price: 6140, image: 'photos/cars/chery-tiggo-7-pro-max.webp' },
  { name: 'Omoda C5 1.5', volume: '4.7 л', oil: 'SPOT OPTIMAL 5w-30 (A3/B4, SN/CF)', filter: 'LYNX LC-171', price: 6135, image: 'photos/cars/omoda-c5.webp' },
  { name: 'Lada Granta 1.6', volume: '3.5 л', oil: 'SPOT STANDART 5w-40 (A3/B4, SN)', filter: 'LYNXauto LC-1030', price: 3515, image: 'photos/cars/lada-granta.webp' },
  { name: 'Toyota Camry 2.5', volume: '4.8 л', oil: 'ROLF Professional 5W-30 (A5/B5, SP)', filter: 'LYNX LO-212', price: 7180, image: 'photos/cars/toyota-camry.webp' },
  { name: 'Skoda Rapid 1.6', volume: '4 л', oil: 'SPOT OPTIMAL 5w-40 (A3/B4, SL/CF)', filter: 'LYNX LC-1925', price: 5180, image: 'photos/cars/skoda-rapid.webp' },
  { name: 'Renault Logan 1.4', volume: '3.3 л', oil: 'SPOT STANDART 5w-30 (A3/B4, SN)', filter: 'LYNXauto LC-1400', price: 3454, image: 'photos/cars/renault-logan.webp' },
  { name: 'Skoda Octavia 1.6', volume: '4 л', oil: 'SPOT OPTIMAL 5w-40 (A3/B4, SL/CF)', filter: 'LYNX LC-1925', price: 5200, image: 'photos/cars/skoda-octavia.webp' },
  { name: 'Volkswagen Polo 1.6', volume: '4 л', oil: 'SPOT OPTIMAL 5w-40 (A3/B4, SL/CF)', filter: 'LYNX LC-1925', price: 5180, image: 'photos/cars/volkswagen-polo.webp' },
  { name: 'Kia Rio 1.6', volume: '3.6 л', oil: 'SPOT STANDART 5w-30 (A3/B4, SN)', filter: 'LYNXauto LC-331', price: 3519, image: 'photos/cars/kia-rio.webp' },
  { name: 'Kia Ceed 1.6', volume: '3.6 л', oil: 'SPOT STANDART 5w-30 (A3/B4, SN)', filter: 'LYNXauto LC-331', price: 3519, image: 'photos/cars/kia-ceed.webp' },
  { name: 'Ford Focus 1.6', volume: '4.1 л', oil: 'ROLF Professional 5W-30 (A5/B5, SP)', filter: 'LYNX LC-1610', price: 6110, image: 'photos/cars/ford-focus.webp' },
  { name: 'Hyundai Solaris 1.6', volume: '3.6 л', oil: 'SPOT OPTIMAL 5w-30 (A3/B4, SN/CF)', filter: 'LYNXauto LC-331', price: 4635, image: 'photos/cars/hyundai-solaris.webp' },
];
