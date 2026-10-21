/** Shared a11y wiring for a control rendered inside <Field>. */
export function fieldProps(id: string, error?: string) {
  return {
    id,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${id}-error` : undefined,
  }
}
