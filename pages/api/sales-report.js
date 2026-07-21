// pages/api/sales-report.js
// Reporting on completed sales — filterable by date range and item type
// (category), individually or combined. Same trust model as this app's
// other own endpoints — no server-side secret, relies on the page's PIN
// gate.

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { startDate, endDate, category } = req.query;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    let query = supabase
      .from('records')
      .select('id, sku, artist, title, category, price, cost, sold_price, sold_at, sold_tax_amount, sold_discount_amount, sold_payment_method')
      .not('sold_at', 'is', null);

    if (startDate) query = query.gte('sold_at', startDate);
    if (endDate) {
      // Inclusive of the whole end day.
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte('sold_at', endOfDay.toISOString());
    }
    if (category && category !== 'all') query = query.eq('category', category);

    const { data: rows, error } = await query.order('sold_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const items = rows || [];

    let totalRevenue = 0, totalTax = 0, totalDiscount = 0, totalCost = 0, itemsWithCost = 0;
    const byCategory = {};
    const byPaymentMethod = {};

    for (const item of items) {
      const soldPrice = parseFloat(item.sold_price) || 0;
      const tax = parseFloat(item.sold_tax_amount) || 0;
      const discount = parseFloat(item.sold_discount_amount) || 0;
      const cost = item.cost != null ? parseFloat(item.cost) : null;

      totalRevenue += soldPrice;
      totalTax += tax;
      totalDiscount += discount;
      if (cost != null) { totalCost += cost; itemsWithCost++; }

      const cat = item.category || 'Uncategorized';
      if (!byCategory[cat]) byCategory[cat] = { count: 0, revenue: 0, cost: 0, itemsWithCost: 0 };
      byCategory[cat].count++;
      byCategory[cat].revenue += soldPrice;
      if (cost != null) { byCategory[cat].cost += cost; byCategory[cat].itemsWithCost++; }

      const pm = item.sold_payment_method || 'unknown';
      if (!byPaymentMethod[pm]) byPaymentMethod[pm] = { count: 0, revenue: 0 };
      byPaymentMethod[pm].count++;
      byPaymentMethod[pm].revenue += soldPrice;
    }

    const grossProfit = itemsWithCost > 0 ? (totalRevenue - totalCost) : null;
    // Margin computed only over the subset of items that actually have a
    // cost on file — mixing in items with no cost basis would silently
    // understate the cost side and overstate margin. itemsWithCost vs
    // items.length is surfaced explicitly so this limitation is visible,
    // not hidden inside one blended number.
    const marginPercent = (itemsWithCost > 0 && totalRevenue > 0) ? (grossProfit / totalRevenue) * 100 : null;

    const categoryBreakdown = Object.entries(byCategory).map(([cat, v]) => ({
      category: cat,
      count: v.count,
      revenue: Math.round(v.revenue * 100) / 100,
      cost: v.itemsWithCost > 0 ? Math.round(v.cost * 100) / 100 : null,
      marginPercent: (v.itemsWithCost > 0 && v.revenue > 0) ? Math.round(((v.revenue - v.cost) / v.revenue) * 1000) / 10 : null,
    })).sort((a, b) => b.revenue - a.revenue);

    const paymentMethodBreakdown = Object.entries(byPaymentMethod).map(([pm, v]) => ({
      paymentMethod: pm,
      count: v.count,
      revenue: Math.round(v.revenue * 100) / 100,
    }));

    return res.status(200).json({
      filters: { startDate: startDate || null, endDate: endDate || null, category: category || 'all' },
      summary: {
        itemsSold: items.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalTaxCollected: Math.round(totalTax * 100) / 100,
        totalDiscountsGiven: Math.round(totalDiscount * 100) / 100,
        totalCost: itemsWithCost > 0 ? Math.round(totalCost * 100) / 100 : null,
        grossProfit: grossProfit != null ? Math.round(grossProfit * 100) / 100 : null,
        marginPercent: marginPercent != null ? Math.round(marginPercent * 10) / 10 : null,
        itemsWithCostOnFile: itemsWithCost,
        itemsMissingCost: items.length - itemsWithCost,
      },
      categoryBreakdown,
      paymentMethodBreakdown,
      items: items.map(item => ({
        sku: item.sku, artist: item.artist, title: item.title, category: item.category,
        soldPrice: parseFloat(item.sold_price) || 0,
        cost: item.cost != null ? parseFloat(item.cost) : null,
        tax: parseFloat(item.sold_tax_amount) || 0,
        discount: parseFloat(item.sold_discount_amount) || 0,
        paymentMethod: item.sold_payment_method,
        soldAt: item.sold_at,
      })),
    });
  } catch (err) {
    console.error('sales-report error:', err);
    return res.status(500).json({ error: err.message });
  }
}
