import Link from "next/link";
import { SITE, SOCIALS } from "@/lib/content";
import { SocialIcon } from "./SocialIcons";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-black/40 backdrop-blur-md">
      <div className="mx-auto max-w-[1500px] px-5 py-10 md:px-9">
        <div className="flex flex-col-reverse items-center gap-7 md:flex-row md:justify-between">
          <nav aria-label="Footer">
            <ul className="flex items-center gap-7">
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-white/80 transition-colors hover:text-gold"
                >
                  Contact Me
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="text-sm text-white/80 transition-colors hover:text-gold"
                >
                  Home
                </Link>
              </li>
            </ul>
          </nav>

          <ul className="flex items-center gap-6">
            {SOCIALS.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${s.label} (opens in a new tab)`}
                  className="block text-white/70 transition-colors hover:text-gold"
                >
                  <SocialIcon name={s.icon} className="h-5 w-5" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-9 text-center text-xs text-white/55">
          © {new Date().getFullYear()} {SITE.name}
        </p>
      </div>
    </footer>
  );
}
