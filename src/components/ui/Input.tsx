import { type InputHTMLAttributes, type ChangeEvent, type ReactNode, type Ref, memo, forwardRef, useId, useState } from 'react';
import { cn } from '@/lib/ui';
import { roundedStyles, sizeStyles, ringStyles, FormControl, type FormSize, type FormRounded, type FormRing } from './form-styles';
import { Eye, EyeOff, X } from 'lucide-react';

export type InputSize = FormSize;
export type InputRounded = FormRounded;
export type InputRing = FormRing;

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  label?: string;
  error?: string;
  /** 高度档位:sm=h-9 / md=h-10 / lg=h-11 / xl=h-12 */
  size?: InputSize;
  /** 圆角档位:sm=rounded-lg / md=rounded-xl / lg=rounded-2xl / full=rounded-full / none=rounded-none */
  rounded?: InputRounded;
  /** 焦点环强度:default=ring-1 ring-zinc-400 / strong=ring-2 ring-zinc-900 */
  ring?: InputRing;
  /** 显示一键清除按钮（受控 value + onChange 时生效） */
  allowClear?: boolean;
  /** 左侧图标插槽 */
  prefix?: ReactNode;
  /** 右侧插槽（password 模式时被内置眼睛按钮替代） */
  suffix?: ReactNode;
  /** 密码模式：内置可见性切换按钮 */
  password?: boolean;
}

const sideBtnCls =
  'absolute top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors';

/** 受控输入且有值时才显示清除按钮（password 模式除外） */
function shouldShowClear(
  allowClear: boolean | undefined,
  isPassword: boolean,
  value: InputHTMLAttributes<HTMLInputElement>['value'],
): boolean {
  return !!allowClear && !isPassword && value !== undefined && value !== '';
}

interface InputDerivedState {
  effectiveType: InputHTMLAttributes<HTMLInputElement>['type'];
  showClear: boolean;
  hasPrefix: boolean;
  hasSuffix: boolean;
  prClass: string | undefined;
}

/** 由 props + 可见性状态推导输入框渲染所需派生值 */
function getInputDerivedState({
  allowClear,
  password,
  suffix,
  prefix,
  type,
  value,
  showPassword,
}: {
  allowClear: boolean | undefined;
  password: boolean | undefined;
  suffix: ReactNode;
  prefix: ReactNode;
  type: InputHTMLAttributes<HTMLInputElement>['type'];
  value: InputHTMLAttributes<HTMLInputElement>['value'];
  showPassword: boolean;
}): InputDerivedState {
  const isPassword = password === true;
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const showClear = shouldShowClear(allowClear, isPassword, value);
  const hasPrefix = prefix !== undefined;
  const hasSuffix = suffix !== undefined || isPassword || showClear;
  // 密码模式与外部 suffix 并存时需更宽的右侧留白
  const prClass = isPassword && suffix !== undefined ? 'pr-14' : hasSuffix ? 'pr-9' : undefined;
  return { effectiveType, showClear, hasPrefix, hasSuffix, prClass };
}

interface InputInnerProps {
  inputId: string | undefined;
  error: string | undefined;
  className: string;
  inputProps: InputHTMLAttributes<HTMLInputElement>;
  inputRef: Ref<HTMLInputElement>;
  hasPrefix: boolean;
  prefix: ReactNode;
  isPassword: boolean;
  showPassword: boolean;
  showClear: boolean;
  onTogglePassword: () => void;
  onClear: () => void;
  suffix: ReactNode;
}

/** 输入框本体 + 前置/后置插槽 + 密码眼睛 + 清除按钮 */
function InputInner({
  inputId,
  error,
  className,
  inputProps,
  inputRef,
  hasPrefix,
  prefix,
  isPassword,
  showPassword,
  showClear,
  onTogglePassword,
  onClear,
  suffix,
}: InputInnerProps) {
  return (
    <div className="relative w-full">
      {hasPrefix && (
        <span className={`${sideBtnCls} left-3 pointer-events-none`}>{prefix}</span>
      )}
      <input
        ref={inputRef}
        id={inputId}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={className}
        {...inputProps}
      />
      {isPassword && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={showPassword ? 'hide password' : 'show password'}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onTogglePassword}
          className={`${sideBtnCls} right-9 w-6 h-6 rounded-full`}
        >
          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      )}
      {suffix !== undefined && (
        <span className={`${sideBtnCls} right-2`}>{suffix}</span>
      )}
      {showClear && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="clear"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClear}
          className={`${sideBtnCls} right-2.5 w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-600 text-zinc-500 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-500`}
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}

/**
 * 自定义输入框组件
 * - 默认 h-10 px-3 rounded-lg text-sm + focus:ring-1 focus:ring-zinc-400
 * - size 改变高度,rounded 改变圆角,ring 改变焦点环强度
 * - prefix/suffix 提供图标插槽，password 内置可见性切换，allowClear 内置一键清除
 */
export const Input = memo(
  forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, id, size = 'md', rounded = 'sm', ring = 'default', allowClear, prefix, suffix, password, ...props }, ref) => {
      const uniqueId = useId();
      const inputId = id ?? (label ? `${label.toLowerCase().replace(/\s+/g, '-')}-${uniqueId}` : undefined);
      const [showPassword, setShowPassword] = useState(false);
      const derived = getInputDerivedState({
        allowClear,
        password,
        suffix,
        prefix,
        type: props.type,
        value: props.value,
        showPassword,
      });

      const inputClassName = cn(
        'w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none transition-colors',
        sizeStyles[size],
        roundedStyles[rounded],
        ringStyles[ring],
        'placeholder:text-zinc-400 dark:placeholder:text-zinc-600',
        derived.hasPrefix && 'pl-10',
        derived.prClass,
        error && 'border-red-400 focus:border-red-500 focus:ring-red-500',
        className,
      );

      return (
        <FormControl inputId={inputId} label={label} error={error}>
          <InputInner
            inputId={inputId}
            error={error}
            className={inputClassName}
            inputProps={{ type: derived.effectiveType, ...props }}
            inputRef={ref}
            hasPrefix={derived.hasPrefix}
            prefix={prefix}
            isPassword={password === true}
            showPassword={showPassword}
            showClear={derived.showClear}
            onTogglePassword={() => setShowPassword((v) => !v)}
            onClear={() =>
              props.onChange?.({
                target: { value: '' },
                currentTarget: { value: '' },
              } as ChangeEvent<HTMLInputElement>)
            }
            suffix={suffix}
          />
        </FormControl>
      );
    },
  ),
);

Input.displayName = 'Input';
export default Input;