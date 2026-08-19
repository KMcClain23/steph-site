"use client";

import { usePathname } from "next/navigation";
import { NavLink } from "./ui";

/**
 * Client component only so it can read the current path and mark the active
 * link — the rest of the shell stays a server component.
 */

const icon = (path: string) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="h-4 w-4"
  >
    <path d={path} />
  </svg>
);

const ITEMS = [
  { href: "/admin", label: "Overview", d: "M4 6h16M4 12h16M4 18h10" },
  { href: "/admin/inquiries", label: "Inquiries", d: "M4 5h16v14H4zM4 6l8 6 8-6" },
  { href: "/admin/books", label: "Narrated Works", d: "M5 4h11a2 2 0 012 2v14H7a2 2 0 01-2-2zM9 4v16" },
  { href: "/admin/demos", label: "Demos", d: "M4 10v4M8 6v12M12 8v8M16 5v14M20 10v4" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin">
      <ul className="flex flex-wrap gap-1 lg:flex-col">
        {ITEMS.map((item) => (
          <li key={item.href}>
            <NavLink
              href={item.href}
              label={item.label}
              icon={icon(item.d)}
              // Overview is an exact match; the others own their subtree.
              active={
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href)
              }
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}
