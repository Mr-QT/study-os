import Link from "next/link";

export function LocaleSwitcher({
  locale,
  label,
  switchLabel,
}: {
  locale: string;
  label: string;
  switchLabel: string;
}) {
  const target = locale === "en" ? "zh-CN" : "en";
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted">{label}</span>
      <Link
        href={`/${target}`}
        className="rounded-md border border-line px-3 py-1.5 font-medium text-ink transition-colors hover:border-accent hover:text-accent"
      >
        {switchLabel}
      </Link>
    </div>
  );
}
