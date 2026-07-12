import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

/** 旅行地点类型定义 */
export interface TravelPlace {
  /** 地点名称 */
  name: string;
  /** 国家 */
  country: string;
  /** 日期，格式 YYYY-MM */
  date: string;
  /** 描述 */
  description: string;
  /** 经纬度 [纬度, 经度] */
  coordinates: [number, number];
  /** 地点 emoji 图标 */
  emoji: string;
}

const TRAVEL_PATH = path.join(process.cwd(), 'data', 'travel.yaml');

let cachedPlaces: TravelPlace[] | null = null;

/**
 * 加载旅行地点数据
 * 服务端组件 / 构建时使用，读取 data/travel.yaml 并校验格式
 */
export function getTravelPlaces(): TravelPlace[] {
  if (cachedPlaces) return cachedPlaces;

  if (!fs.existsSync(TRAVEL_PATH)) {
    cachedPlaces = [];
    return cachedPlaces;
  }

  const raw = fs.readFileSync(TRAVEL_PATH, 'utf-8');
  const data = yaml.load(raw) as Record<string, unknown> | null;

  if (!data || !Array.isArray(data.places)) {
    cachedPlaces = [];
    return cachedPlaces;
  }

  cachedPlaces = data.places
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null,
    )
    .filter(
      (item) =>
        typeof item.name === 'string' &&
        typeof item.country === 'string' &&
        typeof item.date === 'string' &&
        typeof item.description === 'string' &&
        Array.isArray(item.coordinates) &&
        item.coordinates.length === 2 &&
        typeof item.emoji === 'string',
    )
    .map((item) => ({
      name: item.name as string,
      country: item.country as string,
      date: item.date as string,
      description: item.description as string,
      coordinates: (() => {
        const coords = item.coordinates as number[];
        return [coords[0], coords[1]] as [number, number];
      })(),
      emoji: item.emoji as string,
    }));

  return cachedPlaces;
}
