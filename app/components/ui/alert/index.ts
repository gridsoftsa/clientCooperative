import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Alert } from './Alert.vue'
export { default as AlertDescription } from './AlertDescription.vue'
export { default as AlertTitle } from './AlertTitle.vue'

export const alertVariants = cva(
  [
    'relative w-full rounded-lg border px-4 py-3 text-sm grid gap-y-0.5 items-start',
    'grid-cols-[0_1fr]',
    'has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-3',
    'has-[>:first-child:not([data-slot])]:grid-cols-[auto_1fr] has-[>:first-child:not([data-slot])]:gap-x-3',
    '[&>svg]:col-start-1 [&>svg]:row-start-1 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:translate-y-0.5 [&>svg]:text-current',
    '[&>:first-child:not([data-slot])]:col-start-1 [&>:first-child:not([data-slot])]:row-start-1',
    '[&>:first-child:not([data-slot])]:size-4 [&>:first-child:not([data-slot])]:shrink-0 [&>:first-child:not([data-slot])]:translate-y-0.5',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive:
          'text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type AlertVariants = VariantProps<typeof alertVariants>
