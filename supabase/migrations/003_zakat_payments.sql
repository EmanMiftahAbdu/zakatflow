-- Zakat payments tracking
CREATE TABLE IF NOT EXISTS zakat_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    amount NUMERIC(12, 2) NOT NULL,
    method TEXT NOT NULL DEFAULT 'manual',
    notes TEXT DEFAULT '',
    paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zakat_payments_user ON zakat_payments(user_id);
