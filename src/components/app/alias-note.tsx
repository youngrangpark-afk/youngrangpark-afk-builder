import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// "입력하신 ○○ 외에 △△ 표기까지 포함해 진단했어요" (D-26). onRemove 가 있으면 표기 옆 ✕ 로 뺄 수 있다(선택).
export function AliasNote({
  name,
  aliases,
  onRemove,
  className = "",
}: {
  name: string;
  aliases: string[];
  onRemove?: (alias: string) => void;
  className?: string;
}) {
  return (
    <p className={`flex flex-wrap items-center gap-1.5 text-xs leading-relaxed text-muted-foreground ${className}`}>
      {aliases.length ? (
        <>
          입력하신 <strong className="text-foreground">{name}</strong> 외에
          {aliases.map((a) => (
            <Badge key={a} variant="secondary" className="gap-1 rounded-full font-semibold">
              {a}
              {onRemove && (
                <button
                  type="button"
                  aria-label={`${a} 표기 빼기`}
                  className="-mr-1 rounded-full p-0.5 hover:bg-foreground/10"
                  onClick={() => onRemove(a)}
                >
                  <X className="size-3" />
                </button>
              )}
            </Badge>
          ))}
          표기까지 포함해 진단했어요. (띄어쓰기 · 대소문자가 다른 표기도 포함)
        </>
      ) : (
        <>
          <strong className="text-foreground">{name}</strong> 의 띄어쓰기 · 대소문자가 다른 표기도 함께 셌어요.
        </>
      )}
    </p>
  );
}
