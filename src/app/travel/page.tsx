import type { Metadata } from 'next';
import { getTravelPlaces } from '@/lib/travel';
import { TravelContent } from './TravelContent';
import { getTranslate } from '@/i18n/translate';

export const metadata: Metadata = {
  title: getTranslate('travel.metaTitle'),
  description: getTranslate('travel.metaDescription'),
};


/**
 * 旅行足迹页 — 服务端组件，从 YAML 加载数据
 */
export default function TravelPage() {
  const places = getTravelPlaces();
  return <TravelContent places={places} />;
}
