import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { productId } = await request.json()
    if (!productId) return NextResponse.json({ error: 'Product ID required' }, { status: 400 })

    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = await createAdminSupabaseClient()

    // 1. Check if marketplace is open
    const { data: state } = await adminClient.from('game_state').select('marketplace_open').eq('id', 1).single()
    if (!state?.marketplace_open) {
      return NextResponse.json({ error: 'Marketplace is currently closed.' }, { status: 400 })
    }

    // 2. Check buyer profile
    const { data: profile } = await adminClient
      .from('game_profiles')
      .select('has_purchased, role, balance')
      .eq('id', session.user.id)
      .single()

    if (profile?.role === 'seller' || profile?.role === 'admin') {
      return NextResponse.json({ error: 'Only buyers can purchase items.' }, { status: 403 })
    }

    // 3. Fetch product
    const { data: product } = await adminClient
      .from('game_products')
      .select('id, sales_count, price')
      .eq('id', productId)
      .single()

    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 })
    }

    if ((profile?.balance || 0) < product.price) {
      return NextResponse.json({ error: 'Insufficient funds.' }, { status: 400 })
    }

    const newBalance = (profile?.balance || 0) - product.price

    // 4. Mark user as purchased, deduct balance, & insert purchase record
    const { error: profileError } = await adminClient
      .from('game_profiles')
      .update({ has_purchased: true, balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', session.user.id)

    if (profileError) throw profileError

    const { error: purchaseError } = await adminClient
      .from('game_purchases')
      .insert({ buyer_id: session.user.id, product_id: productId })

    if (purchaseError) throw purchaseError

    // 5. Increment product sales count
    const { error: productError } = await adminClient
      .from('game_products')
      .update({ sales_count: (product.sales_count || 0) + 1 })
      .eq('id', productId)

    if (productError) throw productError

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error: any) {
    console.error('Purchase error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
