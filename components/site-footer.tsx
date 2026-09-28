import Link from "next/link";
import { cn } from "@/lib/utils";

const GNU_AGPL_URL = "https://www.gnu.org/licenses/agpl-3.0.html";

const linkClassName =
  "text-foreground underline underline-offset-4 hover:no-underline";

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "border-border text-muted-foreground mx-auto w-full max-w-screen-2xl border-t px-4 py-6 text-center text-sm",
        className,
      )}
    >
      <p className="mb-3">
        <Link href="/contact" className={linkClassName}>
          Contact
        </Link>
      </p>
      <p>
        This software is licensed under the terms of the{" "}
        <a
          href={GNU_AGPL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
        >
          GNU Affero General Public License
        </a>{" "}
        as published by the Free Software Foundation, version 3 of the License.
      </p>
    </footer>
  );
}
