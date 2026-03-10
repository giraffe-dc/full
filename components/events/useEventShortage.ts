import { useState, useEffect } from 'react';

interface Shortage {
    ingId: string;
    name: string;
    unit: string;
    needed: number;
    current: number;
    deficit: number;
}

export function useEventShortage(selectedProducts: any[], packageId: string | null) {
    const [shortages, setShortages] = useState<Shortage[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const checkShortages = async () => {
            if (selectedProducts.length === 0 && !packageId) {
                setShortages([]);
                return;
            }

            setLoading(true);
            console.log('🔄 [Hook:useEventShortage] Checking shortages for:', { productsCount: selectedProducts.length, packageId });

            try {
                const res = await fetch('/api/analytics/check-shortage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        products: selectedProducts.map(p => ({
                            id: p.productId,
                            quantity: p.quantity
                        })),
                        packageId
                    })
                });

                const data = await res.json();
                console.log('✅ [Hook:useEventShortage] API Response:', data);
                if (data.success) {
                    setShortages(data.shortages);
                }
            } catch (error) {
                console.error('❌ [Hook:useEventShortage] Error:', error);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(checkShortages, 1000); // 1s debounce
        return () => clearTimeout(timeoutId);
    }, [selectedProducts, packageId]);

    return { shortages, loading };
}
