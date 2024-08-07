import { OAuthAgent, AuthorizeOptions } from '@atproto/oauth-client'
import {
  BrowserOAuthClient,
  LoginContinuedInParentWindowError,
} from '@atproto/oauth-client-browser'
import { useCallback, useEffect, useRef, useState } from 'react'

export function useOAuth(client: BrowserOAuthClient) {
  const [agent, setAgent] = useState<null | OAuthAgent>(null)
  const [loading, setLoading] = useState(true)

  const clientRef = useRef<typeof client>()
  useEffect(() => {
    // In strict mode, we don't want to reinitialize the client if it's the same
    if (clientRef.current === client) return
    clientRef.current = client

    setLoading(true)
    setAgent(null)

    client
      .init()
      .then(async (r) => {
        if (clientRef.current !== client) return

        setAgent(r?.agent || null)
      })
      .catch((err) => {
        console.error('Failed to init:', err)

        if (clientRef.current !== client) return
        if (err instanceof LoginContinuedInParentWindowError) return

        setAgent(null)
      })
      .finally(() => {
        if (clientRef.current !== client) return

        setLoading(false)
      })
  }, [client])

  useEffect(() => {
    if (!agent) return

    const clear = ({ detail }: { detail: { sub: string } }) => {
      if (detail.sub === agent.sub) {
        setAgent(null)
      }
    }

    client.addEventListener('deleted', clear)

    return () => {
      client.removeEventListener('deleted', clear)
    }
  }, [client, agent])

  const signOut = useCallback(async () => {
    if (!agent) return

    setAgent(null)
    setLoading(true)

    try {
      await agent.signOut()
    } catch (err) {
      console.error('Failed to clear credentials', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [agent])

  const signIn = useCallback(
    async (input: string, options?: AuthorizeOptions) => {
      if (agent) return

      setLoading(true)

      try {
        const agent = await client.signIn(input, options)
        setAgent(agent)
      } catch (err) {
        console.error('Failed to login', err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [agent, client],
  )

  return {
    agent,
    loading,
    signedIn: agent != null,
    signIn,
    signOut,
  }
}
