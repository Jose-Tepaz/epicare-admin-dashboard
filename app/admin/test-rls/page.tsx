"use client"

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function TestRLS() {
  const [status, setStatus] = useState('Checking...')
  const [user, setUser] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [error, setError] = useState<any>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const check = async () => {
      try {
        // 1. Check Auth Session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          setStatus('Error getting session')
          setError(sessionError)
          return
        }

        if (!session?.user) {
          setStatus('No active session found')
          return
        }

        setUser(session.user)
        setStatus('Session found, checking DB access...')

        // 2. Check Public Users Access
        const { data, error: dbError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (dbError) {
          setStatus('Error accessing public.users (RLS?)')
          setError(dbError)
        } else {
          setUserData(data)
          setStatus('Success! Access confirmed.')
        }

      } catch (e) {
        setStatus('Unexpected error')
        setError(e)
      }
    }

    check()
  }, [])

  return (
    <div className="p-8 font-mono">
      <h1 className="text-xl font-bold mb-4">RLS Diagnostic Page</h1>
      
      <div className="mb-4">
        <strong>Status:</strong> {status}
      </div>

      {user && (
        <div className="mb-4 p-4 bg-blue-50 rounded">
          <h2 className="font-bold">Auth User</h2>
          <pre className="text-xs overflow-auto">{JSON.stringify(user, null, 2)}</pre>
        </div>
      )}

      {userData && (
        <div className="mb-4 p-4 bg-green-50 rounded">
          <h2 className="font-bold">Public User Data</h2>
          <pre className="text-xs overflow-auto">{JSON.stringify(userData, null, 2)}</pre>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 rounded">
          <h2 className="font-bold text-red-600">Error</h2>
          <pre className="text-xs overflow-auto text-red-600">{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}
      
      <div className="mt-8">
        <a href="/admin/set-password" class="text-blue-600 underline">Go to Set Password</a>
      </div>
    </div>
  )
}

