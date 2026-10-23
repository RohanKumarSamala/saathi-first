import { Star } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'

const ratingWords = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']

const tones = {
  dark: {
    bar: 'border-blush/15 bg-blush/[0.06]',
    muted: 'text-blush/70',
    hint: 'text-blush/60',
    empty: 'text-blush/35',
    input: 'border-blush/25 text-blush placeholder:text-blush/45',
    error: 'text-[#f7c1bc]',
  },
  light: {
    bar: 'border-gold/30 bg-white/90',
    muted: 'text-ink-muted',
    hint: 'text-ink-muted',
    empty: 'text-ink-muted/40',
    input: 'border-burgundy/20 text-ink placeholder:text-ink-muted/70',
    error: 'text-[#b3261e]',
  },
}

type Props = {
  /** The line before the stars, e.g. "Had a Saathi visit? Rate it". */
  title: string
  tone?: keyof typeof tones
  /** Saves the rating; without it, sending only thanks the visitor. */
  onSend?: (rating: number, note: string) => Promise<unknown>
  /** A rating already given, shown as thanks. Saved ratings cannot be changed. */
  given?: { rating: number; note?: string }
}

/**
 * A slim star-rating bar: one line on wide screens, wrapping on phones. The note box and Send
 * appear once a star is chosen.
 */
export function RatingBar({ title, tone = 'dark', onSend, given }: Props) {
  const id = useId()
  const colors = tones[tone]
  const [rating, setRating] = useState(given?.rating ?? 0)
  const [hover, setHover] = useState(0)
  const [note, setNote] = useState(given?.note ?? '')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')
  const shown = hover || rating
  const done = state === 'sent' || Boolean(given)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!rating) return
    setError('')
    if (onSend) {
      setState('sending')
      try {
        await onSend(rating, note.trim())
      } catch (caught) {
        setState('idle')
        setError(`Could not save your rating. Please try again. (${(caught as { code?: string })?.code ?? 'unknown'})`)
        return
      }
    }
    setState('sent')
  }

  const stars = (size: string, value: number) =>
    [1, 2, 3, 4, 5].map((star) => (
      <Star key={star} aria-hidden className={`${size} ${star <= value ? 'fill-gold text-gold' : colors.empty}`} strokeWidth={1.4} />
    ))

  return (
    <form
      noValidate
      onSubmit={submit}
      aria-labelledby={`${id}-label`}
      className={`flex min-h-14 flex-wrap items-center gap-x-5 gap-y-2 rounded-full border px-5 py-2 max-sm:rounded-3xl max-sm:py-3 ${colors.bar}`}
    >
      <span id={`${id}-label`} className="flex items-center gap-2 font-semibold">
        <Star aria-hidden className="size-5 text-gold" />
        {done ? 'Thank you!' : title}
      </span>
      {done ? (
        <p role="status" className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${colors.muted}`}>
          <span className="flex" aria-label={`${rating} out of 5 stars`}>
            {stars('size-5', rating)}
          </span>
          {onSend ? 'Your rating is saved.' : 'We’re glad you told us.'}
        </p>
      ) : (
        <>
          <fieldset>
            <legend className="sr-only">Your rating</legend>
            <div className="flex items-center" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((value) => (
                <label
                  key={value}
                  onMouseEnter={() => setHover(value)}
                  className="grid size-9 cursor-pointer place-items-center rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold"
                >
                  <input
                    type="radio"
                    name={`${id}-rating`}
                    value={value}
                    checked={rating === value}
                    onChange={() => setRating(value)}
                    className="sr-only"
                  />
                  <span className="sr-only">
                    {value} star{value === 1 ? '' : 's'}, {ratingWords[value]}
                  </span>
                  <Star
                    aria-hidden
                    className={`size-6 transition-[color,fill,scale] duration-200 ${
                      value <= shown ? 'scale-110 fill-gold text-gold' : colors.empty
                    }`}
                    strokeWidth={1.4}
                  />
                </label>
              ))}
              <span aria-hidden className={`ml-2 w-20 text-sm ${colors.muted}`}>
                {ratingWords[shown]}
              </span>
            </div>
          </fieldset>
          {rating > 0 ? (
            <div className="flex min-w-[min(100%,16rem)] grow gap-2">
              <label className="min-w-0 grow">
                <span className="sr-only">A few words (optional)</span>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={500}
                  placeholder="A few words (optional)"
                  className={`h-10 w-full border-b bg-transparent focus-visible:border-gold focus-visible:outline-none ${colors.input}`}
                />
              </label>
              <button
                type="submit"
                disabled={state === 'sending'}
                className="h-10 shrink-0 rounded-full px-5 text-sm font-semibold text-wine transition-[filter] [background-image:var(--grad-primary)] hover:brightness-105 disabled:opacity-60"
              >
                {state === 'sending' ? 'Saving…' : 'Send'}
              </button>
            </div>
          ) : (
            <span className={`text-sm max-sm:hidden ${colors.hint}`}>Tap a star to rate</span>
          )}
          {error && (
            <p role="alert" className={`basis-full text-sm ${colors.error}`}>
              {error}
            </p>
          )}
        </>
      )}
    </form>
  )
}
