/**
 * The game's title, animated the way the blog animates its wordmark: every glyph
 * falls in from a different height, overshoots twice and settles, on a shuffled
 * stagger, so no two arrivals are quite the same. It plays on arrival and again
 * whenever the pointer comes back to it.
 */
export function Wordmark() {
  return (
    <h1 className='wordmark' aria-label='Magic Sort'>
      Magic Sort
    </h1>
  )
}
