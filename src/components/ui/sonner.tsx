import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success:
            "group-[.toaster]:border-success/40 group-[.toaster]:[--toast-icon-color:oklch(0.56_0.185_150)]",
          error:
            "group-[.toaster]:border-destructive/40 group-[.toaster]:[--toast-icon-color:oklch(0.50_0.235_27)]",
          warning:
            "group-[.toaster]:border-warning/40 group-[.toaster]:[--toast-icon-color:oklch(0.70_0.15_70)]",
          info:
            "group-[.toaster]:border-info/40 group-[.toaster]:[--toast-icon-color:oklch(0.55_0.18_235)]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
