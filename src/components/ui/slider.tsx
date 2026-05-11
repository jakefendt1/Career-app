import * as RadixSlider from '@radix-ui/react-slider'
import { cn } from '../../lib/cn'

type SliderProps = {
  label?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  hint?: string
  className?: string
  showValue?: boolean
  formatValue?: (v: number) => string
}

export function Slider({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
  hint,
  className,
  showValue = true,
  formatValue,
}: SliderProps) {
  const displayValue = formatValue ? formatValue(value) : String(value)

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
          {showValue && <span className="text-sm font-semibold text-blue-600 tabular-nums">{displayValue}</span>}
        </div>
      )}
      <RadixSlider.Root
        className="relative flex items-center select-none touch-none h-5 w-full"
        value={[value]}
        onValueChange={([v]) => onChange(v!)}
        min={min}
        max={max}
        step={step}
      >
        <RadixSlider.Track className="relative grow rounded-full h-1.5 bg-slate-200">
          <RadixSlider.Range className="absolute rounded-full h-full bg-blue-500" />
        </RadixSlider.Track>
        <RadixSlider.Thumb
          className="block w-4 h-4 bg-white rounded-full border-2 border-blue-500 shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer"
          aria-label={label}
        />
      </RadixSlider.Root>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
