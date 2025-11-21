import { describe, expect, it } from 'vitest';
import { normalizeReportingSnapshot } from '../useReportingDashboard';

describe('normalizeReportingSnapshot', () => {
  it('returns empty defaults when payload is nullish', () => {
    const result = normalizeReportingSnapshot(null);

    expect(result.totals.revenue).toBe(0);
    expect(result.salesByPeriod).toEqual([]);
    expect(result.inventory.lowStockCount).toBe(0);
  });

  it('preserves known values and ignores malformed arrays', () => {
    const payload = {
      totals: { revenue: 1000, workOrders: 2, avgTicket: 500, customers: 2 },
      salesByPeriod: 'not-an-array',
      serviceMix: [{ service_type: 'Labor', revenue: 600, line_items: 2 }],
      inventory: { stockValue: 2000, lowStockCount: 1, topUsage: [], supplierPerformance: [] },
    } as unknown;

    const result = normalizeReportingSnapshot(payload);

    expect(result.totals.revenue).toBe(1000);
    expect(result.salesByPeriod).toEqual([]);
    expect(result.serviceMix[0]?.service_type).toBe('Labor');
    expect(result.inventory.lowStockCount).toBe(1);
  });
});
