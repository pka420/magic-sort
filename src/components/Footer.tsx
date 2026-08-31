export function Footer() {
  return (
    <footer className='site-footer' role='contentinfo'>
      <nav className='site-footer__links' aria-label='Legal'>
        <a href='/privacy.html' target='_blank' rel='noopener noreferrer'>
          Privacy Policy
        </a>
        <span aria-hidden='true'> · </span>
        <a href='/terms.html' target='_blank' rel='noopener noreferrer'>
          Terms
        </a>
        <span aria-hidden='true'> · </span>
        <a
          href='https://policies.google.com/technologies/ads'
          target='_blank'
          rel='noopener noreferrer'
        >
          How Google uses data
        </a>
      </nav>
      <p className='site-footer__copy'>
        © {new Date().getFullYear()} Magic Sort —{' '}
        <a href='/'>magic-sort.from-delhi.net</a>
      </p>
    </footer>
  )
}
