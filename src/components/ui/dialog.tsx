import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

export function Dialog({ children, ...props }: RadixDialog.DialogProps) {
  return <RadixDialog.Root {...props}>{children}</RadixDialog.Root>
}

export const DialogTrigger = RadixDialog.Trigger

type DialogContentProps = RadixDialog.DialogContentProps & {
  title?: string
  description?: string
}

export function DialogContent({ children, title, description, className, ...props }: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 bg-black/40 z-50 animate-in fade-in-0" />
      <RadixDialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
          'bg-white rounded-lg shadow-xl border border-slate-200',
          'w-full max-w-lg max-h-[90vh] overflow-y-auto',
          'p-6',
          className,
        )}
        {...props}
      >
        {title && (
          <RadixDialog.Title className="text-lg font-semibold text-slate-900 mb-1">
            {title}
          </RadixDialog.Title>
        )}
        {description && (
          <RadixDialog.Description className="text-sm text-slate-600 mb-4">
            {description}
          </RadixDialog.Description>
        )}
        {children}
        <RadixDialog.Close className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
          <X size={18} />
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  )
}

export const DialogClose = RadixDialog.Close
