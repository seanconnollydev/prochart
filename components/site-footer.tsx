import { cn } from "@/lib/utils";

const GNU_AGPL_URL = "https://www.gnu.org/licenses/agpl-3.0.html";
const GNU_AGPL_FULL_TEXT_URL = "https://www.gnu.org/licenses/agpl-3.0.txt";

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "border-border text-muted-foreground mx-auto w-full max-w-6xl border-t px-4 py-6 text-sm",
        className,
      )}
    >
      <p>
        This software is licensed under the terms of the{" "}
        <a
          href={GNU_AGPL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline underline-offset-4 hover:no-underline"
        >
          GNU Affero General Public License
        </a>{" "}
        as published by the Free Software Foundation, version 3 of the License.
      </p>
    </footer>
  );
}
