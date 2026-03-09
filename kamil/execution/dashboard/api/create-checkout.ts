import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { invoiceId, amount, clientName, plan, period } = req.body;

  if (!invoiceId || !amount) {
    return res.status(400).json({ error: 'Missing invoiceId or amount' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `FitCore ${plan || 'Coaching'} — ${period || 'Monthly'}`,
              description: `Coaching invoice for ${clientName || 'client'}`,
            },
            unit_amount: Math.round(amount * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      metadata: { invoiceId },
      success_url: `${req.headers.origin || 'https://app.fitcore.tech'}/payment-success?invoice=${invoiceId}`,
      cancel_url: `${req.headers.origin || 'https://app.fitcore.tech'}/payment-cancel`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe Checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}
