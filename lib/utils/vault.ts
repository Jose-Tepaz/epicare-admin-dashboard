/**
 * Utilidades para interactuar con Supabase Vault
 * 
 * Supabase Vault proporciona encriptación transparente para datos sensibles.
 * Los datos se almacenan encriptados y solo se pueden leer mediante
 * la función RPC get_vault_secret.
 */

import { createClient } from '@/lib/supabase/server'

// ============================================
// TIPOS
// ============================================

export interface VaultCardData {
  cardNumber: string
  cvv: string
}

export interface VaultBankData {
  accountNumber: string
  routingNumber: string
}

// ============================================
// FUNCIONES PARA LEER DATOS DE VAULT
// ============================================

/**
 * Obtiene datos de tarjeta desde Vault
 * NOTA: Solo usar para procesamiento interno, nunca exponer al cliente
 * 
 * @param secretId - ID del secreto en Vault
 * @returns Datos de la tarjeta o null
 */
export async function getCardFromVault(
  secretId: string
): Promise<VaultCardData | null> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase.rpc('get_vault_secret', {
      secret_id: secretId
    })

    if (error || !data) {
      console.error('Error reading card from vault:', error)
      return null
    }

    return JSON.parse(data) as VaultCardData
  } catch (err) {
    console.error('Vault read error:', err)
    return null
  }
}

/**
 * Obtiene datos de cuenta bancaria desde Vault
 * NOTA: Solo usar para procesamiento interno, nunca exponer al cliente
 * 
 * @param secretId - ID del secreto en Vault
 * @returns Datos de la cuenta o null
 */
export async function getBankFromVault(
  secretId: string
): Promise<VaultBankData | null> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase.rpc('get_vault_secret', {
      secret_id: secretId
    })

    if (error || !data) {
      console.error('Error reading bank data from vault:', error)
      return null
    }

    return JSON.parse(data) as VaultBankData
  } catch (err) {
    console.error('Vault read error:', err)
    return null
  }
}

