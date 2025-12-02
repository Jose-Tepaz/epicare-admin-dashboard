/**
 * Rate/Cart API para recalcular precios antes de enviar enrollment
 * Copiado desde epicareplans-marketplace para evitar dependencias
 */

interface RateCartApplicant {
  birthDate: string
  gender: string
  relationshipType: string
  isSmoker: boolean
  hasPriorCoverage: boolean
  rateTier: string
  memberId: string
  dateLastSmoked?: string
}

interface RateCartRequest {
  agentId: string
  effectiveDate: string
  zipCode: string
  state: string
  applicants: RateCartApplicant[]
  paymentFrequency: string
  plansToRate: {
    planKey: string
    productCode: string
    paymentFrequency: string
  }[]
}

interface RateCartResponse {
  success: boolean
  plans?: {
    planKey?: string
    productCode?: string
    totalRate?: number
    rate?: number
    insuranceRate?: number
    monthlyPremium?: number
    [key: string]: any
  }[]
  error?: string
}

/**
 * Recalcular precio de un plan usando Rate/Cart API antes de enviar enrollment
 */
export async function recalculatePlanPriceForEnrollment(
  planKey: string,
  productCode: string,
  applicants: any[], // Applicants del enrollment (formato Allstate)
  demographics: {
    zipCode: string
    state: string
  },
  effectiveDate: string,
  paymentFrequency: string
): Promise<{ success: boolean; price?: number; error?: string }> {
  try {
    const ALLSTATE_API_URL = process.env.ALLSTATE_API_URL || 'https://qa1-ngahservices.ngic.com'
    const ALLSTATE_API_KEY = process.env.ALLSTATE_API_KEY!
    const ALLSTATE_AGENT_ID = process.env.ALLSTATE_AGENT_ID || '159208'

    if (!ALLSTATE_API_KEY) {
      return { success: false, error: 'ALLSTATE_API_KEY no está configurado' }
    }

    // Convertir applicants del enrollment a formato Rate/Cart
    const rateCartApplicants: RateCartApplicant[] = applicants.map((app, index) => {
      // Parsear fecha de nacimiento (puede venir en formato ISO)
      let birthDate = app.dob
      if (birthDate && typeof birthDate === 'string') {
        // Asegurar formato ISO
        if (!birthDate.includes('T')) {
          birthDate = new Date(birthDate).toISOString()
        }
      }

      return {
        birthDate: birthDate,
        gender: app.gender,
        relationshipType: app.relationship || (index === 0 ? 'Primary' : 'Dependent'),
        isSmoker: app.smoker || false,
        hasPriorCoverage: app.hasPriorCoverage || false,
        rateTier: app.eligibleRateTier || 'Standard',
        memberId: app.applicantId || (index === 0 ? 'primary-001' : `additional-${String(index).padStart(3, '0')}`),
        ...(app.dateLastSmoked && { dateLastSmoked: app.dateLastSmoked })
      }
    })

    // Construir request de Rate/Cart
    const rateCartRequest: RateCartRequest = {
      agentId: ALLSTATE_AGENT_ID,
      effectiveDate: effectiveDate, // Formato YYYY-MM-DD
      zipCode: demographics.zipCode,
      state: demographics.state,
      applicants: rateCartApplicants,
      paymentFrequency: paymentFrequency,
      plansToRate: [{
        planKey: planKey,
        productCode: productCode,
        paymentFrequency: paymentFrequency
      }]
    }

    console.log('🔄 Recalculando precio con Rate/Cart antes de enrollment:', {
      planKey,
      productCode,
      applicantsCount: applicants.length,
      effectiveDate,
      paymentFrequency
    })

    // Llamar a Rate/Cart API
    const response = await fetch(`${ALLSTATE_API_URL}/RateCartAPI/api/RateCart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ALLSTATE_API_KEY,
      },
      body: JSON.stringify(rateCartRequest),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Error en Rate/Cart:', errorText)
      return { success: false, error: `Rate/Cart API error: ${errorText.substring(0, 200)}` }
    }

    const rateCartResponse: RateCartResponse = await response.json()

    // Buscar el plan en la respuesta
    const updatedPlan = rateCartResponse.plans?.find(p => 
      p.planKey === planKey || p.productCode === productCode
    )

    if (!updatedPlan) {
      return { success: false, error: 'Plan no encontrado en respuesta de Rate/Cart' }
    }

    // Extraer precio (priorizar insuranceRate sobre totalRate)
    const price = updatedPlan.insuranceRate || updatedPlan.monthlyPremium || updatedPlan.rate || updatedPlan.totalRate

    if (!price || price === 0) {
      return { success: false, error: 'Precio no disponible en respuesta de Rate/Cart' }
    }

    console.log(`✅ Precio recalculado: $${price.toFixed(2)} (antes: ${updatedPlan.totalRate || 'N/A'})`)

    return { success: true, price }
  } catch (error) {
    console.error('❌ Error recalculando precio:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido al recalcular precio' 
    }
  }
}

