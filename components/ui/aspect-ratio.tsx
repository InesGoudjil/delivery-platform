import { cn } from "cn"

function AspectRatio({
  ratio,
  className,
  style,
  ...props
}: React.ComponentProps<"div"> & { ratio: number }) {
  return (
    <div
      data-slot="aspect-ratio"
      style={
        {
          "--ratio": ratio,
          aspectRatio: `${ratio}`,
          ...style,
        } as React.CSSProperties
      }
      className={cn("relative w-full aspect-(--ratio)", className)}
      {...props}
    />
  )
}

export { AspectRatio }
