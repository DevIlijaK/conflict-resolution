import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "~/components/ui/button";

export function PageBack({ href, label }: { href: string; label: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-foreground size-9 shrink-0"
      asChild
    >
      <Link href={href} aria-label={label}>
        <ChevronLeft className="size-5" aria-hidden />
      </Link>
    </Button>
  );
}
