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
 */

// ── 标签页切换 ──
const TAB_TITLE_MESSAGES = [
  '再回来看看呀～(◕ᴗ◕✿)',
  '想你了 (｡•́︿•̀｡)',
  '别走嘛～(っ˘̩╭╮˘̩)っ',
  '我在这里等你哦 ♪(´▽`)',
  '不要离开我... (ಥ﹏ಥ)',
  '快回来！(´；ω；`)',
  '偷偷想你中... (◡‿◡✿)',
  '一个人好寂寞 (｡ŏ﹏ŏ)',
  '去哪了嘛 (´・ω・`)',
  '你是不是忘了什么？(゜ロ゜)',
  '我会乖乖等你的 (◕‿◕)♡',
  '还没走远吧？快回来！(ﾉ◕ヮ◕)ﾉ*:・ﾟ',
  '摸鱼被我发现了吧 (∩｀-´)⊃━☆ﾟ.*・',
  '回来陪我玩嘛～(≧▽≦)',
  '趁你不在偷偷变可爱 (●´∀｀●)',
] as const;

// ── 删除确认 ──
const DELETE_MESSAGES = [
  { kaomoji: '(╥﹏╥)', text: '真的要删掉吗...' },
  { kaomoji: '(´；ω；`)', text: '删了就回不来了哦...' },
  { kaomoji: '(ಥ﹏ಥ)', text: '好伤心...你确定吗？' },
  { kaomoji: '(｡•́︿•̀｡)', text: '它会消失的...想好了吗？' },
  { kaomoji: '(´・ω・`)', text: '删除后就找不到了呢...' },
  { kaomoji: '(っ˘̩╭╮˘̩)っ', text: '不要丢下它嘛...' },
  { kaomoji: '(゜ロ゜)', text: '诶？！要删掉吗？' },
  { kaomoji: '(；´д｀)', text: '这可不能反悔的哦...' },
] as const;

// ── 退出登录 ──
const LOGOUT_MESSAGES = [
  { kaomoji: '(｡•́︿•̀｡)', text: '要走了吗...' },
  { kaomoji: '(╥﹏╥)', text: '不要离开我嘛...' },
  { kaomoji: '(っ˘̩╭╮˘̩)っ', text: '我还没玩够呢...' },
  { kaomoji: '(´；ω；`)', text: '下次要快点回来哦...' },
  { kaomoji: '♪(´▽`)', text: '下次再见啦～' },
  { kaomoji: '(◕‿◕)♡', text: '我会想你的...' },
] as const;

// ── 恢复操作 ──
const RESTORE_MESSAGES = [
  { kaomoji: '(◕ᴗ◕✿)', text: '欢迎回来！' },
  { kaomoji: '♪(´▽`)', text: '恢复成功啦～' },
  { kaomoji: '(≧▽≦)', text: '它又回来了！' },
  { kaomoji: '(●´∀｀●)', text: '失而复得～' },
] as const;

// ── 重置/清空 ──
const RESET_MESSAGES = [
  { kaomoji: '(゜ロ゜)', text: '全部清掉吗？' },
  { kaomoji: '(´・ω・`)', text: '清空后就没有了哦...' },
  { kaomoji: '(｡ŏ﹏ŏ)', text: '这下全都没了呢...' },
] as const;

// ── 提交确认 ──
const SUBMIT_MESSAGES = [
  { kaomoji: '(◕ᴗ◕✿)', text: '确认提交吗？' },
  { kaomoji: '(*´▽`*)', text: '准备好了就提交吧～' },
  { kaomoji: '(●´∀｀●)', text: '确认无误的话就提交～' },
] as const;

// ── 通用确认 ──
const GENERAL_MESSAGES = [
  { kaomoji: '(◕ᴗ◕✿)', text: '确认吗？' },
  { kaomoji: '(´・ω・`)', text: '想好了吗？' },
  { kaomoji: '(゜ロ゜)', text: '确定吗？' },
] as const;

export type ConfirmCategory = 'delete' | 'logout' | 'restore' | 'reset' | 'submit' | 'general';

interface ConfirmMessage { kaomoji: string; text: string }

const CATEGORY_MAP: Record<string, readonly ConfirmMessage[]> = {
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
  return pickRandom(messages);
}

/**
 * 随机获取一条标签页标题颜文字
 */
export function getRandomTabTitle(): string {
  return pickRandom(TAB_TITLE_MESSAGES);
}
