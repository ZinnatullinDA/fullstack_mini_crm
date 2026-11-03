import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { Button } from '@/shared/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ConfirmDialog({ description, onConfirm, onOpenChange, open, title }: ConfirmDialogProps) {
  return (
    <AlertDialog.Root onOpenChange={onOpenChange} open={open}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/40" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 w-[min(90vw,28rem)] -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-xl bg-white p-6 shadow-xl">
          <AlertDialog.Title className="text-lg font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-slate-600">{description}</AlertDialog.Description>
          <div className="flex justify-end gap-2">
            <AlertDialog.Cancel asChild><Button variant="outline">Отмена</Button></AlertDialog.Cancel>
            <AlertDialog.Action asChild><Button onClick={onConfirm} variant="destructive">Удалить</Button></AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
