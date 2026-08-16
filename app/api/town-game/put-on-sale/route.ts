import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { productId, price } = await request.json()
    if (!productId || price === undefined) return NextResponse.json({ error: 'Missing productId or price' }, { status: 400 })

    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify it's a seller
    const { data: profile } = await supabase
      .from('game_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'seller') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminClient = await createAdminSupabaseClient()

    // Ensure the product belongs to this seller
    const { data: product } = await adminClient
      .from('game_products')
      .select('seller_id')
      .eq('id', productId)
      .single()

    if (product?.seller_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden: You do not own this product' }, { status: 403 })
    }

    const { error } = await adminClient
      .from('game_products')
      .update({ price: Number(price) || 0, status: 'on_sale', updated_at: new Date().toISOString() })
      .eq('id', productId)

    if (error) throw error

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error: any) {
    console.error('Put on sale error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
