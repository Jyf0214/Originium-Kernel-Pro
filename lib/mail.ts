import nodemailer from 'nodemailer';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * 获取 SMTP 配置
 * 从环境变量读取 SMTP 连接参数
 */
function getSmtpConfig() {
  return {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? '',
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
  };
}

/**
 * 检查 SMTP 是否已配置
 * 至少需要 host、user、pass 三个字段
 */
export function isSmtpConfigured(): boolean {
  const config = getSmtpConfig();
  return !!(config.host && config.user && config.pass);
}

/** 缓存的 transporter 单例，避免每次发送邮件都重新创建连接 */
let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  const config = getSmtpConfig();
  cachedTransporter ??= nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
  return cachedTransporter;
}

/**
 * 发送邮件
 * @param options 邮件选项，包含收件人、主题和 HTML 内容
 * @returns 发送是否成功
 */
export async function sendMail(options: MailOptions): Promise<boolean> {
  const config = getSmtpConfig();

  if (!isSmtpConfigured()) {
    console.error('SMTP未配置');
    return false;
  }

  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: config.from ?? config.user,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    return true;
  } catch (error) {
    console.error('[mail] 发送邮件失败:', error instanceof Error ? error.message : String(error));
    return false;
  }
}
