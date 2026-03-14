import { cn } from "@/lib/utils";

function Avatar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-cyan-200 bg-cyan-50",
        className,
      )}
      {...props}
    />
  );
}

function AvatarFallback({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("text-sm font-semibold text-cyan-700", className)} {...props} />;
}

export { Avatar, AvatarFallback };
