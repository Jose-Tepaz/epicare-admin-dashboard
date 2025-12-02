import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  SupportTicket,
  SupportTicketWithRelations,
  TicketMessage,
  TicketFilters,
  TicketStats,
  TicketStatus,
  TicketPriority,
} from '@/lib/types/admin'

export function useTickets(filters?: TicketFilters) {
  const [tickets, setTickets] = useState<SupportTicketWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchTickets = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          client:users!support_tickets_client_id_fkey(
            id,
            email,
            first_name,
            last_name,
            phone
          ),
          creator:users!support_tickets_created_by_fkey(
            id,
            email,
            first_name,
            last_name
          ),
          assigned:users!support_tickets_assigned_to_fkey(
            id,
            email,
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }

      if (filters?.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority)
      }

      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to)
      }

      if (filters?.client_id) {
        query = query.eq('client_id', filters.client_id)
      }

      if (filters?.search) {
        query = query.or(`subject.ilike.%${filters.search}%,description.ilike.%${filters.search}%,ticket_number.ilike.%${filters.search}%`)
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate)
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        console.error('Error fetching tickets:', fetchError)
        setError(fetchError.message)
        return
      }

      // Fetch message count for each ticket
      const ticketsWithCounts = await Promise.all(
        (data || []).map(async (ticket) => {
          const { count } = await supabase
            .from('ticket_messages')
            .select('*', { count: 'exact', head: true })
            .eq('ticket_id', ticket.id)

          return {
            ...ticket,
            message_count: count || 0,
          }
        })
      )

      setTickets(ticketsWithCounts)
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Error inesperado al cargar tickets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [JSON.stringify(filters)])

  return {
    tickets,
    loading,
    error,
    refetch: fetchTickets,
  }
}

export function useTicketDetails(ticketId: string) {
  const [ticket, setTicket] = useState<SupportTicketWithRelations | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchTicketDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch ticket details
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .select(`
          *,
          client:users!support_tickets_client_id_fkey(
            id,
            email,
            first_name,
            last_name,
            phone
          ),
          creator:users!support_tickets_created_by_fkey(
            id,
            email,
            first_name,
            last_name
          ),
          assigned:users!support_tickets_assigned_to_fkey(
            id,
            email,
            first_name,
            last_name
          ),
          closer:users!support_tickets_closed_by_fkey(
            id,
            email,
            first_name,
            last_name
          )
        `)
        .eq('id', ticketId)
        .single()

      if (ticketError) {
        console.error('Error fetching ticket:', ticketError)
        setError(ticketError.message)
        return
      }

      // Fetch ticket messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('ticket_messages')
        .select(`
          *,
          sender:users!ticket_messages_sender_id_fkey(
            id,
            email,
            first_name,
            last_name,
            role
          )
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      if (messagesError) {
        console.error('Error fetching messages:', messagesError)
        setError(messagesError.message)
        return
      }

      setTicket(ticketData)
      setMessages(messagesData || [])
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Error inesperado al cargar detalles del ticket')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (ticketId) {
      fetchTicketDetails()
    }
  }, [ticketId])

  return {
    ticket,
    messages,
    loading,
    error,
    refetch: fetchTicketDetails,
  }
}

export function useTicketStats() {
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    open: 0,
    in_progress: 0,
    waiting_on_customer: 0,
    resolved: 0,
    closed: 0,
    high_priority: 0,
    urgent: 0,
    assigned_to_me: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Usuario no autenticado')
        return
      }

      // Fetch all tickets (respecting RLS)
      const { data: tickets, error: fetchError } = await supabase
        .from('support_tickets')
        .select('id, status, priority, assigned_to')

      if (fetchError) {
        console.error('Error fetching ticket stats:', fetchError)
        setError(fetchError.message)
        return
      }

      const ticketsArray = tickets || []

      setStats({
        total: ticketsArray.length,
        open: ticketsArray.filter((t) => t.status === 'open').length,
        in_progress: ticketsArray.filter((t) => t.status === 'in_progress').length,
        waiting_on_customer: ticketsArray.filter((t) => t.status === 'waiting_on_customer').length,
        resolved: ticketsArray.filter((t) => t.status === 'resolved').length,
        closed: ticketsArray.filter((t) => t.status === 'closed').length,
        high_priority: ticketsArray.filter((t) => t.priority === 'high').length,
        urgent: ticketsArray.filter((t) => t.priority === 'urgent').length,
        assigned_to_me: ticketsArray.filter((t) => t.assigned_to === user.id).length,
      })
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Error inesperado al cargar estadísticas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  }
}

export function useCreateTicketMessage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const createMessage = async (
    ticketId: string,
    message: string,
    isInternal: boolean = false
  ): Promise<TicketMessage | null> => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Usuario no autenticado')
        return null
      }

      const { data, error: insertError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          message,
          is_internal: isInternal,
        })
        .select(`
          *,
          sender:users!ticket_messages_sender_id_fkey(
            id,
            email,
            first_name,
            last_name,
            role
          )
        `)
        .single()

      if (insertError) {
        console.error('Error creating message:', insertError)
        setError(insertError.message)
        return null
      }

      // Update ticket updated_at
      await supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId)

      return data
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Error inesperado al crear mensaje')
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    createMessage,
    loading,
    error,
  }
}

export function useUpdateTicket() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const updateTicket = async (
    ticketId: string,
    updates: Partial<SupportTicket>
  ): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const { error: updateError } = await supabase
        .from('support_tickets')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId)

      if (updateError) {
        console.error('Error updating ticket:', updateError)
        setError(updateError.message)
        return false
      }

      return true
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Error inesperado al actualizar ticket')
      return false
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (
    ticketId: string,
    status: TicketStatus
  ): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Usuario no autenticado')
        return false
      }

      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
      }

      // If closing the ticket, set closed_by and closed_at
      if (status === 'closed') {
        updates.closed_by = user.id
        updates.closed_at = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId)

      if (updateError) {
        console.error('Error updating ticket status:', updateError)
        setError(updateError.message)
        return false
      }

      return true
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Error inesperado al actualizar estado')
      return false
    } finally {
      setLoading(false)
    }
  }

  const updatePriority = async (
    ticketId: string,
    priority: TicketPriority
  ): Promise<boolean> => {
    return updateTicket(ticketId, { priority })
  }

  const assignTicket = async (
    ticketId: string,
    userId: string | null
  ): Promise<boolean> => {
    return updateTicket(ticketId, { assigned_to: userId })
  }

  return {
    updateTicket,
    updateStatus,
    updatePriority,
    assignTicket,
    loading,
    error,
  }
}

