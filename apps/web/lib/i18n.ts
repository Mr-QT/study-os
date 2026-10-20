export const locales = ["zh-CN", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "zh-CN";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export const dictionary = {
  "zh-CN": {
    appName: "Study OS",
    tagline: "个人 AI 学习工作台",
    intro:
      "阶段 1.1：访客身份、学习空间与真实持久化。后续里程碑会加入课程、任务、日历与笔记。",
    skipToContent: "跳到主要内容",
    languageLabel: "语言",
    switchTo: "English",
    phaseNote: "阶段 1.1 · 基础平台",
    statusTitle: "系统连接状态",
    statusChecking: "正在检查 API…",
    statusConnected: "API 已连接",
    statusDegraded: "API 在线，但数据库不可用",
    statusUnreachable: "无法连接 API",
    statusOffline: "网络已断开",
    statusHint: "状态来自 API 的 /health 接口，每 30 秒自动刷新。",
    retry: "重试",
    database: "数据库",
    dbDisabled: "未配置（本地模式）",
    dbOk: "正常",
    dbError: "连接失败",
    version: "版本",
    workspaceTitle: "学习空间",
    workspaceSubtitle: "你的所有课程、任务和笔记都会归属于某个空间。",
    workspaceLoading: "正在准备你的本地身份…",
    workspaceEmpty: "还没有空间，先创建一个。",
    workspaceNamePlaceholder: "空间名称，例如：高等数学",
    workspaceCreate: "创建空间",
    workspaceCreating: "创建中…",
    workspaceCreateError: "创建失败，请检查名称或稍后重试。",
    workspaceDbUnavailable: "数据库未配置：启动 PostgreSQL 并应用迁移后，就能创建真实空间。",
    workspaceError: "加载失败，请确认 API 正在运行。",
    offlineCached: "离线缓存：显示的是上次同步的空间，可能不是最新。",
    spacesCount: "个空间",
    guestLabel: "本地访客",
    privacyShared: "共享",
    privacyPersonal: "个人",
    privacyPrivateLocal: "仅本地",
    privacySensitive: "高敏",
    planned: "后续里程碑（尚未实现）：",
    plannedList: ["课程与课表", "任务与日历", "笔记与知识库", "专注与学习统计"],
  },
  en: {
    appName: "Study OS",
    tagline: "A personal AI learning workspace",
    intro:
      "Milestone 1.1: guest identity, learning spaces and real persistence. Courses, tasks, calendar and notes come next.",
    skipToContent: "Skip to main content",
    languageLabel: "Language",
    switchTo: "中文",
    phaseNote: "Milestone 1.1 · foundation",
    statusTitle: "System status",
    statusChecking: "Checking the API…",
    statusConnected: "API connected",
    statusDegraded: "API online, database unavailable",
    statusUnreachable: "Cannot reach the API",
    statusOffline: "You are offline",
    statusHint: "Status comes from the API /health endpoint and refreshes every 30 seconds.",
    retry: "Retry",
    database: "Database",
    dbDisabled: "Not configured (local mode)",
    dbOk: "Healthy",
    dbError: "Connection failed",
    version: "Version",
    workspaceTitle: "Learning spaces",
    workspaceSubtitle: "Every course, task and note belongs to a space.",
    workspaceLoading: "Preparing your local identity…",
    workspaceEmpty: "No spaces yet — create your first one.",
    workspaceNamePlaceholder: "Space name, e.g. Calculus",
    workspaceCreate: "Create space",
    workspaceCreating: "Creating…",
    workspaceCreateError: "Could not create the space. Check the name or try again.",
    workspaceDbUnavailable:
      "Database not configured: start PostgreSQL and run migrations to create real spaces.",
    workspaceError: "Failed to load. Make sure the API is running.",
    offlineCached: "Offline cache: showing the last synced spaces, which may be stale.",
    spacesCount: "spaces",
    guestLabel: "Local guest",
    privacyShared: "Shared",
    privacyPersonal: "Personal",
    privacyPrivateLocal: "Local only",
    privacySensitive: "Sensitive",
    planned: "Later milestones (not implemented yet):",
    plannedList: [
      "Courses and timetable",
      "Tasks and calendar",
      "Notes and knowledge base",
      "Focus and study analytics",
    ],
  },
} as const satisfies Record<Locale, unknown>;

export type Dictionary = (typeof dictionary)[Locale];

export function getDictionary(locale: Locale): Dictionary {
  return dictionary[locale];
}
