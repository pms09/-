"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "홈 / 입력" },
  { href: "/result", label: "AI 추천 결과" },
  { href: "/record", label: "현황 기록" },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-3xl gap-1 px-4 py-3 text-sm">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              "rounded-md px-3 py-1.5 transition-colors " +
              (active
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800")
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
