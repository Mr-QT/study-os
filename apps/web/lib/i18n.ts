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
      "当前是阶段 0 的工程骨架：只验证架构、启动链路与质量门槛。学习空间、任务、课程等功能尚未实现。",
    skipToContent: "跳到主要内容",
    languageLabel: "语言",
    switchTo: "English",
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
    phaseNote: "阶段 0 · 架构验证与工程初始化",
    planned: "以下能力尚未实现，已列入路线图：",
    plannedList: ["学习空间与课程", "任务与日历", "笔记与知识库", "AI 学习助手"],
  },
  en: {
    appName: "Study OS",
    tagline: "A personal AI learning workspace",
    intro:
      "This is the Phase 0 engineering skeleton: it only verifies architecture, startup path, and quality gates. Spaces, tasks, and courses are not implemented yet.",
    skipToContent: "Skip to main content",
    languageLabel: "Language",
    switchTo: "中文",
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
    phaseNote: "Phase 0 · architecture validation and project init",
    planned: "Not implemented yet — tracked on the roadmap:",
    plannedList: ["Spaces and courses", "Tasks and calendar", "Notes and knowledge base", "AI study assistant"],
  },
} as const satisfies Record<Locale, unknown>;

export type Dictionary = (typeof dictionary)[Locale];

export function getDictionary(locale: Locale): Dictionary {
  return dictionary[locale];
}
