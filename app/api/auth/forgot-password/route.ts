import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const fromEmail = process.env.SMTP_FROM_EMAIL || 'IEDC CEV <iedc@cev.ac.in>'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .select('name')
      .eq('email', email)
      .single()

    if (userError || !userRecord) {
      return NextResponse.json({ error: 'No account registered with this email address.' }, { status: 404 })
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000'

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${origin}/reset-password`
      }
    })

    if (linkError) {
      return NextResponse.json({ error: `Recovery link generation failed: ${linkError.message}` }, { status: 400 })
    }

    const emailOtp = linkData.properties.email_otp
    const actionLink = `${origin}/reset-password?token=${encodeURIComponent(emailOtp)}&email=${encodeURIComponent(email)}`

    const htmlBody = `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #1a1a2e; border-radius: 16px; padding: 32px; background-color: #0a0a0f; color: #e8e8f0;">
        <h2 style="color: #00f5ff; font-size: 20px; font-weight: bold; margin-bottom: 4px; text-align: center; letter-spacing: 0.15em; text-transform: uppercase;">Game Arena</h2>
        <span style="font-size: 11px; color: #555; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; display: block; text-align: center;">Reset Your Password</span>
        <hr style="border: 0; border-top: 1px solid #1a1a2e; margin: 20px 0;" />
        
        <p style="font-size: 15px; color: #ccc; margin-top: 0;">Hi <strong style="color: #fff;">${userRecord.name || 'Player'}</strong>,</p>
        <p style="font-size: 13px; color: #888; line-height: 1.6;">We received a request to reset the password for your Game Arena account. Click the button below to choose a new password.</p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${actionLink}" style="background: linear-gradient(135deg, rgba(0,245,255,0.2), rgba(168,85,247,0.2)); color: #00f5ff; padding: 14px 28px; font-weight: bold; text-decoration: none; border-radius: 10px; font-size: 13px; display: inline-block; border: 1px solid rgba(0,245,255,0.3); letter-spacing: 0.1em; text-transform: uppercase;">Reset Password</a>
        </div>
        
        <p style="font-size: 11px; color: #555; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="font-size: 11px; color: #00f5ff; word-break: break-all; font-family: monospace; background-color: #12121a; padding: 10px; border-radius: 8px; border: 1px solid #1a1a2e;">${actionLink}</p>
        
        <hr style="border: 0; border-top: 1px solid #1a1a2e; margin: 24px 0;" />
        <p style="font-size: 10px; color: #444; text-align: center; margin-bottom: 0;">If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `

    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: 'Reset your Game Arena password',
      html: htmlBody,
    })

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
