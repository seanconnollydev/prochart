import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const URL_REGEX = /\bhttps?:\/\/[^\s<>"]+/gi;

function stripTrailingUrlPunctuation(href: string): string {
  let s = href;
  const trailing = /[).,;:!?'"}\]]$/;
  while (s.length > 0 && trailing.test(s)) {
    s = s.slice(0, -1);
  }
  return s;
}

/**
 * Renders plain text with http(s) URLs turned into external links.
 */
export function linkifyPlainText(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  const re = new RegExp(URL_REGEX.source, URL_REGEX.flags);
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const raw = match[0];
    const href = stripTrailingUrlPunctuation(raw);
    const afterHref = raw.slice(href.length);
    parts.push(
      <a
        key={`url-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2"
      >
        {href}
      </a>,
    );
    if (afterHref) {
      parts.push(afterHref);
    }
    lastIndex = match.index + raw.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  if (parts.length === 0) {
    return text;
  }
  return <>{parts}</>;
}

export function LicenseNoticeProse({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-muted-foreground text-xs leading-relaxed whitespace-pre-line break-words",
        className,
      )}
    >
      {linkifyPlainText(text)}
    </div>
  );
}
