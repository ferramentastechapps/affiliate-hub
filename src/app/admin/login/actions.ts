'use server'

import { cookies } from 'next/headers'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Obter credenciais de ambiente (e assegurar de que existam de fato)
  const envEmail = process.env.ADMIN_EMAIL;
  const envPassword = process.env.ADMIN_PASSWORD;

  if (!envEmail || !envPassword) {
    console.error("ALERTA DE SEGURANÇA: ADMIN_EMAIL ou ADMIN_PASSWORD ausente no .env.");
    return { success: false, error: 'Credenciais de administrador não configuradas no servidor.' }
  }

  // Realizar verificação
  if (email === envEmail && password === envPassword) {
    const cookieStore = await cookies()
    cookieStore.set('admin_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 semana
      path: '/',
    })
    return { success: true }
  }

  return { success: false, error: 'Credenciais inválidas' }
}
