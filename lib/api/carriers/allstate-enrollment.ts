/**
 * Función para enviar enrollment a Allstate
 * Copiada desde epicareplans-marketplace para evitar dependencias entre proyectos
 */

interface EnrollmentRequest {
  demographics: any
  applicants?: any[] // Puede estar como campo separado
  coverages: any[]
  paymentInformation: any
  partnerInformation?: any
  attestationInformation?: any
  enrollmentDate: string
  isEFulfillment?: boolean
  [key: string]: any // Permitir campos adicionales
}

export async function submitAllstateEnrollment(enrollmentData: EnrollmentRequest) {
  // URL base para enrollment (diferente de quotes)
  const ALLSTATE_ENROLLMENT_URL = process.env.ALLSTATE_ENROLLMENT_URL || 
    'https://qa1-ngahservices.ngic.com/EnrollmentAPI/api/Enrollment'
  const ALLSTATE_AUTH_TOKEN = process.env.ALLSTATE_AUTH_TOKEN!
  
  if (!ALLSTATE_AUTH_TOKEN) {
    throw new Error('ALLSTATE_AUTH_TOKEN no está configurado')
  }
  
  // Transformación específica de Allstate
  const allstatePayload = buildAllstatePayload(enrollmentData)
  
  // La URL base ya incluye el endpoint completo según app/api/enrollment/route.ts del marketplace
  // No agregar /CreateEnrollment, usar la URL base directamente
  console.log('📋 URL completa:', ALLSTATE_ENROLLMENT_URL)
  console.log('📋 FULL REQUEST BODY TO ALLSTATE:', JSON.stringify(allstatePayload, null, 2))
  
  const response = await fetch(ALLSTATE_ENROLLMENT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${ALLSTATE_AUTH_TOKEN}`,
      'Accept': 'application/json',
    },
    body: JSON.stringify(allstatePayload),
  })
  
  console.log('📡 Response status:', response.status, response.statusText)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ Allstate API error response:', errorText.substring(0, 500))
    
    let errorData
    try {
      errorData = JSON.parse(errorText)
    } catch {
      errorData = { message: errorText, rawResponse: errorText.substring(0, 200) }
    }
    
    // Extraer mensaje de error más legible
    let errorMessage = `Allstate API error (${response.status})`
    if (Array.isArray(errorData) && errorData.length > 0) {
      const firstError = errorData[0]
      if (firstError.errorDetail) {
        try {
          const detail = JSON.parse(firstError.errorDetail)
          const messages = Object.values(detail).flat()
          if (messages.length > 0) {
            errorMessage = messages[0] as string
          }
        } catch {
          errorMessage = firstError.errorDetail
        }
      } else if (firstError.errorCode) {
        errorMessage = `Error ${firstError.errorCode}: ${firstError.errorDetail || 'Unknown error'}`
      }
    } else if (errorData.message) {
      errorMessage = errorData.message
    }
    
    // Crear error con mensaje más descriptivo
    const error = new Error(errorMessage)
    ;(error as any).statusCode = response.status
    ;(error as any).allstateError = errorData
    throw error
  }
  
  return await response.json()
}

function buildAllstatePayload(data: EnrollmentRequest) {
  // Transformaciones específicas de Allstate
  // Según enrollment-structure-allstate.md, la estructura debe ser exacta
  
  // Los applicants DEBEN estar dentro de demographics según la estructura esperada
  const applicants = data.demographics?.applicants || (data as any).applicants || []
  
  // Limpiar demographics (remover campos que Allstate no usa: address2, alternatePhone, zipCodePlus4)
  const { address2, alternatePhone, zipCodePlus4, applicants: _, ...cleanDemographics } = data.demographics || {}
  
  // Limpiar address1 (remover espacios al inicio)
  const address1 = cleanDemographics.address1 ? cleanDemographics.address1.trim() : cleanDemographics.address1
  
  // Construir demographics con el orden exacto según enrollment-structure-allstate.md
  // Orden: zipCode, email, address1, city, state, phone, applicants, isEFulfillment
  const demographics = {
    zipCode: cleanDemographics.zipCode,
    email: cleanDemographics.email,
    address1: address1,
    city: cleanDemographics.city,
    state: cleanDemographics.state,
    phone: cleanDemographics.phone,
    applicants: applicants.map((applicant: any) => {
      // Normalizar el formato de fecha: convertir a ISO sin milisegundos si es necesario
      let dob = applicant.dob
      if (dob && typeof dob === 'string') {
        // Si tiene milisegundos (.000), removerlos para que sea "2000-10-01T00:00:00Z"
        dob = dob.replace(/\.\d{3}Z$/, 'Z')
      }
      
      // Mapear relationship a valores válidos de Allstate: Primary, Spouse, Dependent
      const mapRelationship = (rel: string): string => {
        if (!rel) return 'Primary'
        const relLower = rel.toLowerCase()
        if (relLower === 'primary' || relLower === 'self') return 'Primary'
        if (relLower === 'spouse' || relLower === 'wife' || relLower === 'husband') return 'Spouse'
        // Cualquier otro valor (Child, Dependent, etc.) se mapea a Dependent
        return 'Dependent'
      }
      
      return {
        applicantId: applicant.applicantId,
        firstName: applicant.firstName,
        lastName: applicant.lastName,
        gender: applicant.gender,
        relationship: mapRelationship(applicant.relationship),
        ssn: applicant.ssn,
        dob: dob, // ISO format: "2000-10-01T00:00:00Z" (sin milisegundos)
        smoker: applicant.smoker,
        weight: applicant.weight,
        heightFeet: applicant.heightFeet,
        heightInches: applicant.heightInches,
        phoneNumbers: applicant.phoneNumbers || [],
        questionResponses: applicant.questionResponses || [],
      }
    }),
    isEFulfillment: cleanDemographics.isEFulfillment !== undefined ? cleanDemographics.isEFulfillment : true,
  }
  
  // Construir coverages (solo campos necesarios según estructura)
  // Validar y ajustar effectiveDate: debe ser al menos un día después de hoy
  const coverages = data.coverages.map((c: any) => {
    let effectiveDate = c.effectiveDate // Formato YYYY-MM-DD
    
    // Validar que effectiveDate sea al menos un día después de hoy
    if (effectiveDate) {
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Resetear a medianoche
      
      const effectiveDateObj = new Date(effectiveDate)
      effectiveDateObj.setHours(0, 0, 0, 0)
      
      // Si la fecha efectiva es hoy o anterior, ajustarla a mañana
      if (effectiveDateObj <= today) {
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        effectiveDate = tomorrow.toISOString().split('T')[0] // Formato YYYY-MM-DD
        console.log(`⚠️  effectiveDate ajustada de ${c.effectiveDate} a ${effectiveDate} (debe ser al menos un día después de hoy)`)
      }
    }
    
    return {
      planKey: c.planKey,
      monthlyPremium: c.monthlyPremium,
      effectiveDate: effectiveDate, // Formato YYYY-MM-DD (ajustada si es necesario)
      paymentFrequency: c.paymentFrequency,
      applicants: c.applicants || [],
    }
  })
  
  // Asegurar que paymentInformation tenga el formato correcto
  const paymentInformation = data.paymentInformation ? {
    accountHolderFirstName: data.paymentInformation.accountHolderFirstName,
    accountHolderLastName: data.paymentInformation.accountHolderLastName,
    accountType: data.paymentInformation.accountType,
    ...(data.paymentInformation.accountType === 'CreditCard' ? {
      creditCardNumber: data.paymentInformation.creditCardNumber,
      expirationMonth: typeof data.paymentInformation.expirationMonth === 'string' 
        ? parseInt(data.paymentInformation.expirationMonth, 10)
        : data.paymentInformation.expirationMonth,
      expirationYear: typeof data.paymentInformation.expirationYear === 'string'
        ? parseInt(data.paymentInformation.expirationYear, 10)
        : data.paymentInformation.expirationYear,
      cvv: data.paymentInformation.cvv,
      cardBrand: data.paymentInformation.cardBrand,
    } : {
      accountTypeBank: data.paymentInformation.accountTypeBank,
      accountNumber: data.paymentInformation.accountNumber,
      routingNumber: data.paymentInformation.routingNumber,
      bankName: data.paymentInformation.bankName,
      desiredDraftDate: data.paymentInformation.desiredDraftDate,
    }),
  } : null
  
  return {
    demographics,
    coverages,
    paymentInformation,
    partnerInformation: data.partnerInformation || {},
    attestationInformation: data.attestationInformation || {},
    enrollmentDate: data.enrollmentDate,
    isEFulfillment: data.isEFulfillment !== undefined ? data.isEFulfillment : true,
  }
}

