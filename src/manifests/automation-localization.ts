import type { RecommendedAutomation } from "@openhands/extensions/automations";

/** Display-only translations. Never change template prompts, IDs or payloads. */
export const isSimplifiedChinese = (language?: string) =>
  language?.toLowerCase().startsWith("zh-cn") ||
  language?.toLowerCase() === "zh";

const catalog: Record<string, { name: string; description: string }> = {
  "cve-remediation-factory": {
    name: "GitHub 漏洞修复工厂",
    description: "部署扫描器和智能体，及时发现并修复安全漏洞。",
  },
  "github-pr-reviewer": {
    name: "GitHub 代码审查",
    description:
      "智能体审查需要处理的开放拉取请求，并将审查结果发布到 GitHub。",
  },
  "custom-automation": {
    name: "自定义自动化",
    description: "通过提示词、插件或上传的脚本压缩包创建自定义自动化。",
  },
  "github-repo-monitor": {
    name: "GitHub 仓库监控",
    description: "监控议题和拉取请求评论中的提及，并由智能体响应或执行任务。",
  },
  "github-agents-md-maintainer": {
    name: "GitHub AGENTS.md 维护",
    description: "维护仓库中的智能体说明文件。",
  },
  "github-issue-to-pr": {
    name: "GitHub 议题转拉取请求",
    description: "将符合条件的 GitHub 议题交给智能体处理并创建拉取请求。",
  },
  "slack-channel-monitor": {
    name: "Slack 频道监控",
    description: "监控 Slack 频道并响应符合条件的消息。",
  },
  "news-digest": {
    name: "新闻摘要",
    description: "定时读取 RSS 和 Atom 订阅源，由智能体整理相关资讯摘要。",
  },
  "github-stale-ci-pr-closer": {
    name: "GitHub 失败 CI 清理",
    description: "提醒并关闭长期无人处理、持续未通过 CI 的拉取请求。",
  },
  "github-comment-cleanup": {
    name: "代码注释清理",
    description: "定期清理重复或冗长的代码注释，并为每个仓库创建拉取请求。",
  },
};

export function localizeInterfaceCopy<
  T extends {
    sidebarLabel?: string;
    commandMenuTitle?: string;
    commandMenuDescription?: string;
    listTitle?: string;
    listSubtitle?: string;
    detailBackLabel?: string;
    editTitle?: string;
  },
>(copy: T, language?: string): T {
  if (!isSimplifiedChinese(language)) return copy;
  return {
    ...copy,
    sidebarLabel: "自动化",
    commandMenuTitle: "自动化",
    commandMenuDescription: "查看定时任务和事件触发的自动化。",
    listTitle: "仪表盘",
    listSubtitle: "查看自动化任务的健康状态、活动和运行表现。",
    detailBackLabel: "返回自动化",
    editTitle: "编辑自动化",
  };
}

export function localizeSubPageLabel(
  page: "list" | "events" | "templates",
  value: string,
  language?: string,
): string {
  if (!isSimplifiedChinese(language)) return value;
  return (
    {
      list: "仪表盘",
      events: "事件",
      templates: "模板",
    }[page] ?? value
  );
}

export function localizeManifestPageCopy(
  page: "events" | "templates",
  copy: { title: string; description: string },
  language?: string,
): { title: string; description: string } {
  if (!isSimplifiedChinese(language)) return copy;
  if (page === "events") {
    return {
      title: "事件来源",
      description: "管理自定义 Webhook 事件来源。",
    };
  }
  return {
    title: "模板",
    description: "浏览模板，并将模板启动到对话中以适配你的工作。",
  };
}

export function localizeMetricText(
  metric: string,
  field: string,
  value: string,
  language?: string,
): string {
  if (!isSimplifiedChinese(language)) return value;
  const translations: Record<string, string> = {
    "automations:label": "自动化任务",
    "automations:detail": "{{active}} 个运行中",
    "needs-attention:label": "需要关注",
    "needs-attention:detail": "最近一次运行失败",
    "needs-attention:zeroDetail": "最近运行没有失败",
    "total-runs:label": "运行总数",
    "total-runs:detail": "已加载自动化任务的运行次数",
    "average-duration:label": "平均耗时",
    "average-duration:detail": "最近完成的运行",
  };
  return translations[`${metric}:${field}`] ?? value;
}

export function getAutomationDisplay(
  automation: RecommendedAutomation,
  language?: string,
) {
  return (
    (isSimplifiedChinese(language) && catalog[automation.id]) || {
      name: automation.name,
      description: automation.description,
    }
  );
}
