"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/",             label: "Overview",        icon: "\u25A3" },
  { href: "/word-search",  label: "Word Search",     icon: "\u25A6" },
  { href: "/maze",         label: "Maze Lab",        icon: "\u2317" },
  { href: "/dot-marker",   label: "Dot Marker",      icon: "\u25CF" },
  { href: "/dot-to-dot",   label: "Dot-to-Dot",      icon: "\u2022\u2500" },
  { href: "/style",        label: "Style Forge",     icon: "\u2726" },
  { href: "/qc",           label: "QC + Export",     icon: "\u2714" }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-btn ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}
