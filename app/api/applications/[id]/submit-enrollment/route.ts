import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/utils/encryption'
import { getCardFromVault, getBankFromVault } from '@/lib/utils/vault'
import { submitAllstateEnrollment } from '@/lib/api/carriers/allstate-enrollment'
import { recalculatePlanPriceForEnrollment } from '@/lib/api/carriers/allstate-rate-cart'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Verificar que el usuario sea admin/agent
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!['super_admin', 'admin', 'agent'].includes(userData?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 1. Obtener application con todos los datos, incluyendo coverages para obtener productCode y monthly_premium
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        *,
        insurance_companies:company_id(slug),
        coverages(plan_key, metadata, monthly_premium)
      `)
      .eq('id', params.id)
      .single()
    
    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // 2. Obtener payment info y desencriptar
    const { data: paymentInfo, error: paymentError } = await supabase
      .from('application_payment_info')
      .select('*')
      .eq('application_id', params.id)
      .eq('is_current', true)
      .single()
    
    if (paymentError) {
      console.error('❌ Error obteniendo payment info:', paymentError)
      return NextResponse.json({ 
        error: 'Payment info not found',
        details: paymentError.message 
      }, { status: 400 })
    }
    
    if (!paymentInfo) {
      console.error('❌ Payment info es null o undefined')
      return NextResponse.json({ error: 'Payment info not found' }, { status: 400 })
    }
    
    console.log('✅ Payment info obtenida:', {
      payment_method: paymentInfo.payment_method,
      has_card_number: !!paymentInfo.card_number_encrypted,
      has_account_number: !!paymentInfo.account_number_encrypted,
      uses_saved_method: !!paymentInfo.user_payment_method_id,
      user_payment_method_id: paymentInfo.user_payment_method_id || null,
    })

    // 3. Validar effective_date antes de enviar
    const effectiveDate = application.effective_date || application.enrollment_data?.coverages?.[0]?.effectiveDate
    if (effectiveDate) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const effectiveDateObj = new Date(effectiveDate)
      effectiveDateObj.setHours(0, 0, 0, 0)
      
      if (effectiveDateObj <= today) {
        return NextResponse.json({
          success: false,
          error: 'La fecha efectiva debe ser al menos un día después de hoy',
          details: `La fecha efectiva actual es ${effectiveDate}. Por favor, actualiza la fecha efectiva en la aplicación antes de enviar el enrollment.`,
        }, { status: 400 })
      }
    }
    
    // 4. Reconstruir enrollment request con payment info desencriptado
    console.log('📦 Reconstruyendo enrollment request...')
    console.log('📦 enrollment_data keys:', Object.keys(application.enrollment_data || {}))
    
    // Construir payment info (puede ser desde Vault o desde datos encriptados)
    const paymentInformation = await buildPaymentInfo(paymentInfo, supabase)
    
    let enrollmentRequest = {
      ...application.enrollment_data,
      paymentInformation
    }

    // 4a. Recalcular precios con Rate/Cart antes de enviar (solo para Allstate)
    const carrierSlug = application.insurance_companies?.slug || 'allstate'
    if (carrierSlug === 'allstate' && enrollmentRequest.coverages && enrollmentRequest.coverages.length > 0) {
      console.log('🔄 Recalculando precios con Rate/Cart antes de enviar enrollment...')
      
      const applicants = enrollmentRequest.demographics?.applicants || []
      const demographics = enrollmentRequest.demographics || {}
      
      // Obtener coverages de la BD para obtener metadata con productCode
      const coveragesFromDB = application.coverages || []
      
      // Recalcular precio para cada coverage
      for (const coverage of enrollmentRequest.coverages) {
        if (coverage.planKey) {
          // Buscar productCode en:
          // 1. coverage.productCode (si está disponible)
          // 2. metadata del coverage en BD
          // 3. selectedPlans si está disponible
          const dbCoverage = coveragesFromDB.find((c: any) => c.plan_key === coverage.planKey)
          const productCode = coverage.productCode || 
                             dbCoverage?.metadata?.productCode ||
                             (enrollmentRequest.selectedPlans?.find((p: any) => p.planKey === coverage.planKey)?.productCode)
          
          if (productCode) {
            console.log(`🔄 Recalculando precio para plan ${coverage.planKey} (productCode: ${productCode})`)
            
            const result = await recalculatePlanPriceForEnrollment(
              coverage.planKey,
              productCode,
              applicants,
              {
                zipCode: demographics.zipCode || '',
                state: demographics.state || ''
              },
              coverage.effectiveDate || effectiveDate || '',
              coverage.paymentFrequency || 'Monthly'
            )
            
            if (result.success && result.price) {
              console.log(`✅ Precio recalculado para plan ${coverage.planKey}: $${coverage.monthlyPremium} -> $${result.price}`)
              coverage.monthlyPremium = result.price
            } else {
              console.warn(`⚠️ No se pudo recalcular precio para plan ${coverage.planKey}:`, result.error)
              // Usar el precio de la tabla coverages (precio final correcto) como fallback
              if (dbCoverage?.monthly_premium) {
                console.log(`💰 Usando precio de BD (coverages.monthly_premium) para plan ${coverage.planKey}: $${coverage.monthlyPremium} -> $${dbCoverage.monthly_premium}`)
                coverage.monthlyPremium = Number(dbCoverage.monthly_premium)
              } else {
                console.warn(`⚠️ No se encontró monthly_premium en BD para plan ${coverage.planKey}, usando precio de enrollment_data`)
              }
            }
          } else {
            console.warn(`⚠️ No se encontró productCode para plan ${coverage.planKey}`)
            // Si no hay productCode, usar el precio de la tabla coverages como fallback
            if (dbCoverage?.monthly_premium) {
              console.log(`💰 Usando precio de BD (coverages.monthly_premium) para plan ${coverage.planKey}: $${coverage.monthlyPremium} -> $${dbCoverage.monthly_premium}`)
              coverage.monthlyPremium = Number(dbCoverage.monthly_premium)
            } else {
              console.warn(`⚠️ No se encontró monthly_premium en BD para plan ${coverage.planKey}, usando precio de enrollment_data`)
            }
            console.warn(`   Intentando obtener de:`, {
              hasCoverageProductCode: !!coverage.productCode,
              hasDBCoverage: !!dbCoverage,
              hasSelectedPlans: !!enrollmentRequest.selectedPlans
            })
          }
        }
      }
    }
    
    console.log('📦 Enrollment request construido:', {
      hasDemographics: !!enrollmentRequest.demographics,
      hasApplicants: !!(enrollmentRequest.demographics?.applicants || enrollmentRequest.applicants),
      hasCoverages: !!enrollmentRequest.coverages,
      hasPaymentInfo: !!enrollmentRequest.paymentInformation,
      hasPartnerInfo: !!enrollmentRequest.partnerInformation,
      hasAttestationInfo: !!enrollmentRequest.attestationInformation,
    })

    // 5. Determinar el carrier slug (ya lo tenemos arriba)
    console.log('📦 Carrier slug:', carrierSlug)

    // 6. Enviar a la API de la aseguradora
    // Por ahora solo soportamos Allstate, se puede extender después
    try {
      console.log('📤 Enviando enrollment a Allstate...')
      let result
      if (carrierSlug === 'allstate') {
        result = await submitAllstateEnrollment(enrollmentRequest)
        console.log('✅ Enrollment enviado exitosamente')
      } else {
        throw new Error(`Carrier ${carrierSlug} no está soportado para enrollment desde admin dashboard`)
      }
      
      // 6. Actualizar estado de la application a submitted
      await supabase
        .from('applications')
        .update({
          status: 'submitted',
          api_response: result,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id)
      
      return NextResponse.json({
        success: true,
        message: 'Enrollment enviado exitosamente',
        result
      })
    } catch (enrollmentError) {
      console.error('❌ Error en submitAllstateEnrollment:', enrollmentError)
      console.error('❌ Error stack:', enrollmentError instanceof Error ? enrollmentError.stack : 'No stack')
      
      // 7. Si falla, actualizar estado a submission_failed
      const errorMessage = enrollmentError instanceof Error ? enrollmentError.message : 'Unknown error'
      const statusCode = (enrollmentError as any)?.statusCode || 500
      const allstateError = (enrollmentError as any)?.allstateError
      
      // Determinar el código de estado HTTP apropiado
      // Si es un error 400 de Allstate, devolver 400 en lugar de 500
      const httpStatus = statusCode >= 400 && statusCode < 500 ? statusCode : 500
      
      try {
        await supabase
          .from('applications')
          .update({
            status: 'submission_failed',
            api_error: {
              message: errorMessage,
              allstateError: allstateError,
              timestamp: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.id)
      } catch (updateError) {
        console.error('❌ Error actualizando estado de application:', updateError)
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to submit enrollment',
        message: errorMessage,
        details: allstateError || errorMessage
      }, { status: httpStatus })
    }

  } catch (error) {
    console.error('❌ Error general en submit-enrollment:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('Error details:', { errorMessage, errorStack })
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: errorMessage,
        details: errorStack
      },
      { status: 500 }
    )
  }
}

async function buildPaymentInfo(paymentInfoFromDB: any, supabase: any) {
  try {
    const paymentMethod = paymentInfoFromDB.payment_method
    
    // CASO 1: Método de pago guardado (usando Vault)
    if (paymentInfoFromDB.user_payment_method_id) {
      console.log('🔐 Usando método de pago guardado (Vault)...')
      console.log('🔐 user_payment_method_id:', paymentInfoFromDB.user_payment_method_id)
      
      // Obtener el user_payment_method para conseguir el vault_secret_id
      // Usar .maybeSingle() para evitar error si no hay resultados
      const { data: savedMethod, error: savedMethodError } = await supabase
        .from('user_payment_methods')
        .select('*')
        .eq('id', paymentInfoFromDB.user_payment_method_id)
        .maybeSingle()
      
      console.log('🔐 Query result:', { 
        hasSavedMethod: !!savedMethod, 
        error: savedMethodError?.message,
        errorCode: savedMethodError?.code 
      })
      
      if (savedMethodError) {
        console.error('❌ Error en query user_payment_methods:', savedMethodError)
        throw new Error(`Error obteniendo método de pago: ${savedMethodError.message}`)
      }
      
      if (!savedMethod) {
        // Si no encontramos el método guardado, puede ser por RLS
        // Intentar obtener los datos del payment_info directamente
        console.warn('⚠️ No se encontró user_payment_method - puede ser problema de RLS')
        console.warn('⚠️ Usando datos de application_payment_info como fallback...')
        
        // Si tenemos datos suficientes en payment_info, usarlos
        if (paymentInfoFromDB.card_holder_name && paymentInfoFromDB.card_last_four) {
          // Tenemos datos parciales, pero NO los datos sensibles
          // Esto es un problema - necesitamos los datos del Vault
          throw new Error(
            'No se puede acceder al método de pago guardado. ' +
            'Posible problema de permisos RLS. ' +
            'El enrollment puede necesitar ser re-creado con datos de pago nuevos.'
          )
        }
        
        throw new Error('No se encontró el método de pago guardado y no hay datos de fallback')
      }
      
      console.log('✅ Método de pago encontrado:', {
        id: savedMethod.id,
        payment_method: savedMethod.payment_method,
        has_vault_secret: !!savedMethod.vault_secret_id,
        card_last_four: savedMethod.card_last_four
      })
      
      if (!savedMethod.vault_secret_id) {
        console.error('❌ El método de pago guardado NO tiene vault_secret_id. ID:', savedMethod.id)
        
        // Intento de fallback desesperado: si es tarjeta de prueba
        if (savedMethod.card_last_four === '4242') {
           console.warn('⚠️ Detectada tarjeta de prueba 4242 sin Vault - Usando datos mock para desarrollo')
           return {
             accountType: 'CreditCard',
             accountHolderFirstName: (savedMethod.card_holder_name || '').split(' ')[0] || 'Test',
             accountHolderLastName: (savedMethod.card_holder_name || '').split(' ').slice(1).join(' ') || 'User',
             creditCardNumber: '4242424242424242', // Stripe test card
             cvv: '123',
             cardBrand: savedMethod.card_brand || 'Visa',
             expirationMonth: savedMethod.card_expiry_month || '12',
             expirationYear: savedMethod.card_expiry_year || '2025',
           }
        }

        throw new Error(
          'El método de pago guardado está corrupto (falta información segura). ' +
          'Por favor, pida al usuario que elimine este método de pago y lo agregue nuevamente.'
        )
      }
      
      // Obtener datos sensibles desde Vault
      if (savedMethod.payment_method === 'credit_card' || savedMethod.payment_method === 'debit_card') {
        const cardData = await getCardFromVault(savedMethod.vault_secret_id)
        if (!cardData) {
          throw new Error('No se pudieron obtener los datos de tarjeta desde Vault')
        }
        
        const nameParts = (savedMethod.card_holder_name || '').split(' ')
        return {
          accountType: 'CreditCard',
          accountHolderFirstName: nameParts[0] || '',
          accountHolderLastName: nameParts.slice(1).join(' ') || '',
          creditCardNumber: cardData.cardNumber,
          cvv: cardData.cvv,
          cardBrand: savedMethod.card_brand,
          expirationMonth: savedMethod.card_expiry_month,
          expirationYear: savedMethod.card_expiry_year,
        }
      } else {
        // ACH/Bank account
        const bankData = await getBankFromVault(savedMethod.vault_secret_id)
        if (!bankData) {
          throw new Error('No se pudieron obtener los datos bancarios desde Vault')
        }
        
        const nameParts = (savedMethod.account_holder_name || '').split(' ')
        return {
          accountType: 'ACH',
          accountHolderFirstName: nameParts[0] || '',
          accountHolderLastName: nameParts.slice(1).join(' ') || '',
          accountTypeBank: savedMethod.account_type,
          accountNumber: bankData.accountNumber,
          routingNumber: bankData.routingNumber,
          bankName: savedMethod.bank_name,
          desiredDraftDate: paymentInfoFromDB.desired_draft_date,
        }
      }
    }
    
    // CASO 2: Datos encriptados (método tradicional)
    console.log('🔐 Usando datos encriptados tradicionales...')
    
    if (paymentMethod === 'credit_card') {
      // Verificar que tenemos datos encriptados
      if (!paymentInfoFromDB.card_number_encrypted) {
        throw new Error('No hay número de tarjeta encriptado')
      }
      
      const nameParts = (paymentInfoFromDB.card_holder_name || '').split(' ')
      return {
        accountType: 'CreditCard',
        accountHolderFirstName: nameParts[0] || '',
        accountHolderLastName: nameParts.slice(1).join(' ') || '',
        creditCardNumber: decrypt(paymentInfoFromDB.card_number_encrypted),
        cvv: decrypt(paymentInfoFromDB.cvv_encrypted),
        cardBrand: paymentInfoFromDB.card_brand,
        expirationMonth: paymentInfoFromDB.card_expiry_month,
        expirationYear: paymentInfoFromDB.card_expiry_year,
      }
    } else {
      // ACH/Bank account
      if (!paymentInfoFromDB.account_number_encrypted) {
        throw new Error('No hay número de cuenta encriptado')
      }
      
      const nameParts = (paymentInfoFromDB.account_holder_name || '').split(' ')
      return {
        accountType: 'ACH',
        accountHolderFirstName: nameParts[0] || '',
        accountHolderLastName: nameParts.slice(1).join(' ') || '',
        accountTypeBank: paymentInfoFromDB.account_type,
        accountNumber: decrypt(paymentInfoFromDB.account_number_encrypted),
        routingNumber: decrypt(paymentInfoFromDB.routing_number_encrypted),
        bankName: paymentInfoFromDB.bank_name,
        desiredDraftDate: paymentInfoFromDB.desired_draft_date,
      }
    }
  } catch (error) {
    console.error('❌ Error construyendo payment info:', error)
    throw new Error(`Error procesando información de pago: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

