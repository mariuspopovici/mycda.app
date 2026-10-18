import { useEffect, useState } from 'react'
import { NumberInput, type NumberInputProps } from '@mantine/core'

interface Props extends Omit<NumberInputProps, 'value' | 'onChange'> {
  value: number
  /** Called only with values in [min, max]. */
  onCommit: (value: number) => void
  min: number
  max: number
}

/**
 * A number input that lets the user type freely (empty, "0.", out of range) and only reports
 * valid values. Shows the external value again when it changes from outside.
 */
export function DraftNumberInput ({ value, onCommit, min, max, ...props }: Props) {
  const [draft, setDraft] = useState<number | string>(value)
  const [focused, setFocused] = useState(false)

  useEffect(() => { if (!focused) setDraft(value) }, [value, focused])

  const n = typeof draft === 'number' ? draft : parseFloat(draft)
  const invalid = draft !== '' && (!Number.isFinite(n) || n < min || n > max)

  return (
    <NumberInput
      {...props}
      value={draft}
      error={invalid ? `Enter ${min}–${max}` : props.error}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e) }}
      onBlur={(e) => { setFocused(false); setDraft(value); props.onBlur?.(e) }}
      onChange={(v) => {
        setDraft(v)
        const next = typeof v === 'number' ? v : parseFloat(v)
        if (Number.isFinite(next) && next >= min && next <= max) onCommit(next)
      }}
    />
  )
}
