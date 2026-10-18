/** Builds a CSV document; numbers are written in full precision, Dates as ISO 8601. */
export function toCsv (columns: Record<string, Array<number | string | Date | null | undefined>>): string {
  const names = Object.keys(columns)
  const rows = Math.max(0, ...names.map((n) => columns[n].length))
  const cell = (v: number | string | Date | null | undefined) => {
    if (v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v))) return ''
    if (v instanceof Date) return v.toISOString()
    const text = String(v)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const lines = [names.join(',')]
  for (let i = 0; i < rows; i++) lines.push(names.map((n) => cell(columns[n][i])).join(','))
  return lines.join('\n') + '\n'
}

/** Offers a text file to the user as a download. */
export function downloadText (fileName: string, text: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

/** A safe file name for an exported analysis. */
export function csvFileName (name: string): string {
  const base = name.trim().replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-').slice(0, 60) || 'analysis'
  return `${base}.csv`
}
