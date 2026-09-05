import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

type Props = {
  value: string | null | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  eager?: boolean;
};

export function SmartImage({ value, alt, className, fallbackClassName, eager }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    setUrl(value ?? null);
  }, [value]);

  if (!value || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex items-center justify-center bg-secondary text-muted-foreground",
          className,
          fallbackClassName,
        )}
      >
        <ImageOff className="h-6 w-6 opacity-50" aria-hidden />
      </div>
    );
  }

  if (!url) {
    return <div className={cn("animate-pulse bg-secondary", className)} aria-hidden />;
  }

  return (
    <img
      src={url}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
