import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Verification } from './Verification'
import type { Auth } from '../hooks/useAuth'

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

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('Verification', () => {
  it('is silent when no email link is in the address bar', () => {
    render(<Verification auth={makeAuth()} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('confirms the address behind a verify link', async () => {
    window.history.replaceState(null, '', '/?verify=tok')
    const auth = makeAuth({ verifyEmail: vi.fn().mockResolvedValue(undefined) })

    render(<Verification auth={auth} />)

    expect(auth.verifyEmail).toHaveBeenCalledWith('tok')
    expect(await screen.findByText('Email verified')).toBeInTheDocument()
    expect(window.location.search).not.toContain('verify')
  })

  it('reports when a verify link cannot be honoured', async () => {
    window.history.replaceState(null, '', '/?verify=stale')
    const auth = makeAuth({
      verifyEmail: vi
        .fn()
        .mockRejectedValue(new Error('Invalid or expired token'))
    })

    render(<Verification auth={auth} />)

    expect(await screen.findByText('Could not verify')).toBeInTheDocument()
    expect(screen.getByText('Invalid or expired token')).toBeInTheDocument()
  })

  it('sets a new password from a reset link', async () => {
    window.history.replaceState(null, '', '/?reset=tok')
    const auth = makeAuth({
      resetPassword: vi.fn().mockResolvedValue(undefined)
    })
    const user = userEvent.setup()

    render(<Verification auth={auth} />)

    await user.type(screen.getByLabelText('New password'), 'new-password-1')
    await user.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(auth.resetPassword).toHaveBeenCalledWith('tok', 'new-password-1')
    expect(await screen.findByText('Password reset')).toBeInTheDocument()
    expect(window.location.search).not.toContain('reset')
  })
})
