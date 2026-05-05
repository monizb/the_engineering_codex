'use client';
import { useEffect, useMemo, useState } from 'react';

interface Heading { id: string; text: string; }

interface Props {
  /** Raw HTML — same string passed to dangerouslySetInnerHTML. */
  html: string;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Sticky in-chapter table of contents. Tracks the active section as the user scrolls. */
export default function TableOfContents({ html }: Props) {
  const headings = useMemo<Heading[]>(() => {
    const out: Heading[] = [];
    const re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
    let m: RegExpExecArray | null;
    const seen = new Set<string>();
    while ((m = re.exec(html))) {
      const text = m[1].replace(/<[^>]+>/g, '').trim();
      if (!text) continue;
      let id = slugify(text);
      if (!id) continue;
      let n = 1;
      while (seen.has(id)) { id = `${slugify(text)}-${++n}`; }
      seen.add(id);
      out.push({ id, text });
    }
    return out;
  }, [html]);

  const [active, setActive] = useState<string>('');

  // Inject ids onto rendered headings (the HTML doesn't have them by default)
  useEffect(() => {
    const article = document.querySelector('.chapter-content');
    if (!article) return;
    const h2s = Array.from(article.querySelectorAll('h2'));
    const seen = new Set<string>();
    h2s.forEach(h => {
      const text = (h.textContent ?? '').trim();
      let id = slugify(text);
      let n = 1;
      while (seen.has(id)) { id = `${slugify(text)}-${++n}`; }
      seen.add(id);
      h.id = id;
    });

    if (!('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-110px 0px -65% 0px', threshold: [0, 1] }
    );
    h2s.forEach(h => obs.observe(h));
    return () => obs.disconnect();
  }, [html]);

  if (headings.length < 2) return null;

  return (
    <aside
      aria-label="Table of contents"
      className="hidden xl:block fixed top-24 right-3 w-[180px] 2xl:w-[220px] 2xl:right-6 z-30"
    >
      <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)]/85 backdrop-blur-md p-3 2xl:p-4 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.12)]">
        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-2 flex items-center gap-1.5">
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>list</span>
          On this page
        </div>
        <ul className="space-y-0.5 max-h-[60vh] overflow-y-auto pr-1">
          {headings.map(h => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                onClick={e => {
                  e.preventDefault();
                  const el = document.getElementById(h.id);
                  if (el) {
                    const y = el.getBoundingClientRect().top + window.scrollY - 88;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                    setActive(h.id);
                  }
                }}
                className={`block text-[11.5px] 2xl:text-[12.5px] py-1.5 px-2 rounded-md leading-snug transition-colors border-l-2
                  ${active === h.id
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]'
                  }`}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
