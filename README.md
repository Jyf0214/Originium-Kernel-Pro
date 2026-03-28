# Originium Kernel

Modern content publishing platform built with Next.js.

## Features

- **Article Management** - Create, edit, publish articles with Markdown support
- **GitHub Sync** - Published articles automatically sync to GitHub repository
- **User System** - Role-based access control (sudo/admin/user) with user groups
- **Password Reset** - SMTP email-based password reset functionality
- **i18n** - Full internationalization support (Chinese/English)
- **Custom Background** - Configurable background image with opacity overlay
- **Static Pages** - Published articles generate static HTML pages at `/{user}/{articleId}`

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `AUTH_SECRET` | Session encryption secret | Yes |
| `GITHUB_REPO` | GitHub repository (user/repo) | No |
| `GITHUB_TOKEN` | GitHub personal access token | No |
| `SMTP_HOST` | SMTP server host | No |
| `SMTP_PORT` | SMTP server port | No |
| `SMTP_USER` | SMTP username | No |
| `SMTP_PASS` | SMTP password | No |
| `SMTP_FROM` | Sender email address | No |
| `ADMIN_PASSWORD` | Force reset admin password on build | No |

## Tech Stack

- **Framework**: Next.js 16 + Turbopack
- **Database**: PostgreSQL + Prisma
- **UI**: Ant Design + @lobehub/ui
- **Styling**: Tailwind CSS
- **Auth**: Custom session-based authentication

## License

Private project. All rights reserved.
