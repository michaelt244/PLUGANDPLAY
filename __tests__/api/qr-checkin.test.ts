import { POST } from '@/app/api/qr-checkin/route';
import { NextRequest } from 'next/server';

const BUSINESS_ID = 'biz-uuid-123';
const CUSTOMER_ID = 'cust-uuid-456';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'businesses') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: BUSINESS_ID },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'customers') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: CUSTOMER_ID },
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {
        insert: jest.fn().mockResolvedValue({ error: null }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { total_check_ins: 0 },
              error: null,
            }),
          }),
        }),
        upsert: jest.fn().mockResolvedValue({ error: null }),
      };
    }),
  },
}));

jest.mock('@/lib/resend', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
}));

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/qr-checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/qr-checkin', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest({ slug: 'wild-barre' }));
    expect(res.status).toBe(400);
  });

  it('creates a new customer and logs check-in', async () => {
    const res = await POST(makeRequest({
      slug: 'wild-barre',
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.customer_id).toBe(CUSTOMER_ID);
    expect(body.is_new).toBe(true);
    expect(body.total_check_ins).toBe(1);
  });
});
