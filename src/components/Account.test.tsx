import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Account } from './Account'
import type { Auth } from '../hooks/useAuth'
import type { AuthUser } from '../api/auth'

const alice: AuthUser = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  isVerified: false,
  authProvider: 'local'
}

function makeAuth(overrides: Partial<Auth> = {}): Auth {
  return {
    user: null,
    token: null,
    resolving: false,
    login: vi.fn(),
    register: vi.fn(),
    signInWithGoogle: vi.fn(),
    chooseUsername: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    signOut: vi.fn(),
    ...overrides
  }
}

describe('Account', () => {
  it('offers email and password to a signed-out player', () => {
    render(<Account auth={makeAuth()} />)

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Sign in with Google' })
    ).toBeInTheDocument()
  })

  it('signs the player in with the address and password they gave', async () => {
    const auth = makeAuth()
    const user = userEvent.setup()
    render(<Account auth={auth} />)

    await user.type(screen.getByLabelText('Email'), 'alice@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(auth.login).toHaveBeenCalledWith('alice@example.com', 'password123')
  })

  it('gathers a username too when the player chooses to register', async () => {
    const auth = makeAuth()
    const user = userEvent.setup()
    render(<Account auth={auth} />)

    await user.click(
      screen.getByRole('button', { name: 'New here? Make an account' })
    )
    await user.type(screen.getByLabelText('Username'), 'alice')
    await user.type(screen.getByLabelText('Email'), 'alice@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByLabelText('Agree to Privacy Policy and Terms'))
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(auth.register).toHaveBeenCalledWith(
      'alice',
      'alice@example.com',
      'password123'
    )
  })

  it('requires privacy consent before creating an account', async () => {
    const auth = makeAuth()
    const user = userEvent.setup()
    render(<Account auth={auth} />)

    await user.click(
      screen.getByRole('button', { name: 'New here? Make an account' })
    )
    expect(
      screen.getByRole('button', { name: 'Create account' })
    ).toBeDisabled()
    expect(
      screen.getByLabelText('Agree to Privacy Policy and Terms')
    ).not.toBeChecked()

    // Disabled button cannot be clicked; agreeing enables it.
    await user.click(screen.getByLabelText('Agree to Privacy Policy and Terms'))
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled()
  })

  it('links to Privacy Policy and Terms when registering', async () => {
    const user = userEvent.setup()
    render(<Account auth={makeAuth()} />)

    await user.click(
      screen.getByRole('button', { name: 'New here? Make an account' })
    )

    expect(
      screen.getByRole('link', { name: 'Privacy Policy' })
    ).toHaveAttribute('href', '/privacy.html')
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute(
      'href',
      '/terms.html'
    )
  })

  it('names the player once they are signed in', () => {
    render(<Account auth={makeAuth({ user: alice })} />)

    expect(screen.getByText('Signed in as alice')).toBeInTheDocument()
  })

  it('withholds the leaderboard from a player whose email is unverified', () => {
    render(<Account auth={makeAuth({ user: alice })} />)

    expect(
      screen.getByText('Verify your email to appear on the leaderboard.')
    ).toBeInTheDocument()
  })

  it('resends the verification email from the account', async () => {
    const auth = makeAuth({ user: alice })
    const user = userEvent.setup()
    render(<Account auth={auth} />)

    await user.click(
      screen.getByRole('button', { name: 'Resend verification email' })
    )

    expect(auth.resendVerification).toHaveBeenCalledTimes(1)
  })

  it('says where the verification email went', async () => {
    const auth = makeAuth({
      user: alice,
      resendVerification: vi.fn().mockResolvedValue(undefined)
    })
    const user = userEvent.setup()
    render(<Account auth={auth} />)

    await user.click(
      screen.getByRole('button', { name: 'Resend verification email' })
    )

    expect(
      await screen.findByText('Sent to alice@example.com.')
    ).toBeInTheDocument()
  })

  it('asks for an email to reset a forgotten password', async () => {
    const auth = makeAuth()
    const user = userEvent.setup()
    render(<Account auth={auth} />)

    await user.click(
      screen.getByRole('button', { name: 'Forgot your password?' })
    )
    await user.type(screen.getByLabelText('Email'), 'alice@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(auth.forgotPassword).toHaveBeenCalledWith('alice@example.com')
  })

  it('asks a Google sign-in to choose a name', async () => {
    const auth = makeAuth({
      user: { ...alice, username: null }
    })
    const user = userEvent.setup()
    render(<Account auth={auth} />)

    await user.type(screen.getByLabelText('Username'), 'alice')
    await user.click(screen.getByRole('button', { name: 'Keep it' }))

    expect(auth.chooseUsername).toHaveBeenCalledWith('alice')
  })

  it('signs the player out', async () => {
    const auth = makeAuth({ user: alice })
    const user = userEvent.setup()
    render(<Account auth={auth} />)

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(auth.signOut).toHaveBeenCalledTimes(1)
  })

  it('shows what the server said went wrong', async () => {
    const auth = makeAuth({
      login: vi.fn().mockRejectedValue(new Error('Invalid email or password'))
    })
    const user = userEvent.setup()
    render(<Account auth={auth} />)

    await user.type(screen.getByLabelText('Email'), 'alice@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid email or password'
    )
  })

  it('says so while the session is still being checked', () => {
    render(<Account auth={makeAuth({ resolving: true })} />)

    expect(screen.getByText('Checking who you are…')).toBeInTheDocument()
  })
})
