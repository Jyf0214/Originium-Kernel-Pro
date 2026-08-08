/**
 * 颜文字库
 *
 * 分类：
 * - tabTitle: 标签页切换提示
 * - delete: 删除操作确认
 * - logout: 退出登录确认
 * - restore: 恢复操作
 * - reset: 重置/清空操作
 * - submit: 提交确认
 * - general: 通用确认
 *
 * 文案统一存于 i18n 字典（zh-CN.json / en.json），此处仅存 key。
 */

import { getTranslate } from '@/i18n/translate';
import type { I18nKey } from '@/i18n/keys';

// ── 标签页切换 ──
const TAB_TITLE_KEYS: readonly I18nKey[] = [
  'kaomoji.tabTitle.comeBack',
  'kaomoji.tabTitle.missYou',
  'kaomoji.tabTitle.dontGo',
  'kaomoji.tabTitle.waiting',
  'kaomoji.tabTitle.dontLeave',
  'kaomoji.tabTitle.comeQuickly',
  'kaomoji.tabTitle.thinking',
  'kaomoji.tabTitle.lonely',
  'kaomoji.tabTitle.whereTo',
  'kaomoji.tabTitle.forgot',
  'kaomoji.tabTitle.waitingDutifully',
  'kaomoji.tabTitle.notFarYet',
  'kaomoji.tabTitle.slacking',
  'kaomoji.tabTitle.playWithMe',
  'kaomoji.tabTitle.cuterWithoutYou',
];

// ── 删除确认 ──
const DELETE_MESSAGES: readonly { kaomoji: string; textKey: I18nKey }[] = [
  { kaomoji: '(╥﹏╥)', textKey: 'kaomoji.delete.really' },
  { kaomoji: '(´；ω；`)', textKey: 'kaomoji.delete.noReturn' },
  { kaomoji: '(ಥ﹏ಥ)', textKey: 'kaomoji.delete.sad' },
  { kaomoji: '(｡•́︿•̀｡)', textKey: 'kaomoji.delete.disappear' },
  { kaomoji: '(´・ω・`)', textKey: 'kaomoji.delete.goneForever' },
  { kaomoji: '(っ˘̩╭╮˘̩)っ', textKey: 'kaomoji.delete.abandon' },
  { kaomoji: '(゜ロ゜)', textKey: 'kaomoji.delete.eh' },
  { kaomoji: '(；´д｀)', textKey: 'kaomoji.delete.noTakeBack' },
];

// ── 退出登录 ──
const LOGOUT_MESSAGES: readonly { kaomoji: string; textKey: I18nKey }[] = [
  { kaomoji: '(｡•́︿•̀｡)', textKey: 'kaomoji.logout.leaving' },
  { kaomoji: '(╥﹏╥)', textKey: 'kaomoji.logout.dontLeaveMe' },
  { kaomoji: '(っ˘̩╭╮˘̩)っ', textKey: 'kaomoji.logout.notDonePlaying' },
  { kaomoji: '(´；ω；`)', textKey: 'kaomoji.logout.comeBackSoon' },
  { kaomoji: '♪(´▽`)', textKey: 'kaomoji.logout.seeYou' },
  { kaomoji: '(◕‿◕)♡', textKey: 'kaomoji.logout.missYou' },
];

// ── 恢复操作 ──
const RESTORE_MESSAGES: readonly { kaomoji: string; textKey: I18nKey }[] = [
  { kaomoji: '(◕ᴗ◕✿)', textKey: 'kaomoji.restore.welcomeBack' },
  { kaomoji: '♪(´▽`)', textKey: 'kaomoji.restore.restored' },
  { kaomoji: '(≧▽≦)', textKey: 'kaomoji.restore.returned' },
  { kaomoji: '(●´∀｀●)', textKey: 'kaomoji.restore.foundAgain' },
];

// ── 重置/清空 ──
const RESET_MESSAGES: readonly { kaomoji: string; textKey: I18nKey }[] = [
  { kaomoji: '(゜ロ゜)', textKey: 'kaomoji.reset.clearAll' },
  { kaomoji: '(´・ω・`)', textKey: 'kaomoji.reset.goneAfter' },
  { kaomoji: '(｡ŏ﹏ŏ)', textKey: 'kaomoji.reset.allGone' },
];

// ── 提交确认 ──
const SUBMIT_MESSAGES: readonly { kaomoji: string; textKey: I18nKey }[] = [
  { kaomoji: '(◕ᴗ◕✿)', textKey: 'kaomoji.submit.confirmSubmit' },
  { kaomoji: '(*´▽`*)', textKey: 'kaomoji.submit.ready' },
  { kaomoji: '(●´∀｀●)', textKey: 'kaomoji.submit.allGood' },
];

// ── 通用确认 ──
const GENERAL_MESSAGES: readonly { kaomoji: string; textKey: I18nKey }[] = [
  { kaomoji: '(◕ᴗ◕✿)', textKey: 'kaomoji.general.confirm' },
  { kaomoji: '(´・ω・`)', textKey: 'kaomoji.general.thoughtThrough' },
  { kaomoji: '(゜ロ゜)', textKey: 'kaomoji.general.sure' },
];

export type ConfirmCategory = 'delete' | 'logout' | 'restore' | 'reset' | 'submit' | 'general';

interface ConfirmMessage { kaomoji: string; text: string }

const CATEGORY_MAP: Record<string, readonly { kaomoji: string; textKey: I18nKey }[]> = {
  delete: DELETE_MESSAGES,
  logout: LOGOUT_MESSAGES,
  restore: RESTORE_MESSAGES,
  reset: RESET_MESSAGES,
  submit: SUBMIT_MESSAGES,
  general: GENERAL_MESSAGES,
};

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] ?? arr[0]!;
}

/**
 * 根据操作类别随机获取一条颜文字确认语
 */
export function getConfirmMessage(category: ConfirmCategory): ConfirmMessage {
  const messages = CATEGORY_MAP[category] ?? CATEGORY_MAP['general'] ?? [];
  const picked = pickRandom(messages);
  return { kaomoji: picked.kaomoji, text: getTranslate(picked.textKey) };
}

/**
 * 随机获取一条标签页标题颜文字
 */
export function getRandomTabTitle(): string {
  return getTranslate(pickRandom(TAB_TITLE_KEYS));
}
