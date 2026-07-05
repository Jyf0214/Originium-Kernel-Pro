import type { Metadata } from 'next';
import { getTravelPlaces } from '@/lib/travel';
import { TravelContent } from './TravelContent';

export const metadata: Metadata = {
  title: '旅行足迹 - Originium Kernel',
  description: '记录走过的每一个地方',
};

export const revalidate = 300; // 5 分钟 ISR

/**
 * 旅行足迹页 — 服务端组件，从 YAML 加载数据
 */
export default function TravelPage() {
  const places = getTravelPlaces();
  return <TravelContent places={places} />;
}
