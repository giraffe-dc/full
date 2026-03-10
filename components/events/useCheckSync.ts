// Hook для синхронізації з чеком

import { useState, useCallback, useEffect, useRef } from 'react';
import { CheckData } from './EventFormModal.types';
import { mapCheckToFormData, mapCheckItemsToProducts } from './EventFormModal.utils';

export function useCheckSync(
  setFormData: React.Dispatch<React.SetStateAction<any>>,
  setSelectedProducts: React.Dispatch<React.SetStateAction<any[]>>
) {
  const [existingCheck, setExistingCheck] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const prevCheckItemsRef = useRef<string>('');

  // Fetch existing check for table
  const fetchCheck = useCallback(async (tableId: string) => {
    try {
      // Fetch ALL checks for this table (not just open) to find the linked check
      const res = await fetch(`/api/cash-register/checks?tableId=${tableId}`);
      const data = await res.json();

      if (data.success && data.data.length > 0) {
        // Find the most recent check (open or closed)
        const check = data.data.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        
        setExistingCheck(check);

        // Load check items as selected products
        if (check.items && check.items.length > 0) {
          const checkProducts = mapCheckItemsToProducts(check.items);
          setSelectedProducts(checkProducts);

          // Save items hash for change detection
          prevCheckItemsRef.current = JSON.stringify(check.items);
        }

        // Load payment information from check
        const formDataUpdates = mapCheckToFormData(check);
        setFormData((prev: any) => ({ ...prev, ...formDataUpdates }));
      }
    } catch (error) {
      console.error('Error fetching check:', error);
    }
  }, [setFormData, setSelectedProducts]);

  // Polling for check changes (every 10 seconds for real-time sync)
  useEffect(() => {
    if (!existingCheck) return;

    const pollCheck = async () => {
      try {
        const res = await fetch(`/api/cash-register/checks/${existingCheck.id}`);

        // Check if response is ok
        if (!res.ok) {
          if (res.status === 404) {
            // Check was deleted
            console.log('⚠️ Check deleted, stopping polling');
            setExistingCheck(null);
          }
          return;
        }

        const text = await res.text();

        // Check if response is empty
        if (!text) {
          return;
        }

        const data = JSON.parse(text);

        if (data.success) {
          const updatedCheck = data.data;

          // Check if items have changed
          const currentItemsHash = JSON.stringify(updatedCheck.items || []);
          if (currentItemsHash !== prevCheckItemsRef.current) {
            console.log('🔄 Check items changed, syncing...');
            console.log('📦 Old items:', JSON.parse(prevCheckItemsRef.current || '[]'));
            console.log('📦 New items:', updatedCheck.items);

            // Items changed - sync to form
            if (updatedCheck.items && updatedCheck.items.length > 0) {
              const checkProducts = mapCheckItemsToProducts(updatedCheck.items);
              console.log('📦 Mapped products:', checkProducts);
              setSelectedProducts(checkProducts);
            } else {
              console.log('📦 No items, clearing products');
              setSelectedProducts([]);
            }

            // Update payment info
            const formDataUpdates = mapCheckToFormData(updatedCheck);
            console.log('💰 Form data updates:', formDataUpdates);
            setFormData((prev: any) => {
              const updated = { ...prev, ...formDataUpdates };
              console.log('📝 Updated form data:', updated);
              return updated;
            });

            // Update hash
            prevCheckItemsRef.current = currentItemsHash;

            console.log('✅ Check synced successfully');
          }
        }
      } catch (error) {
        // Only log if it's not an abort error
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error polling check:', error);
        }
      }
    };

    // Initial sync immediately
    pollCheck();

    // Poll every 10 seconds (10000 ms) for real-time sync
    const intervalId = setInterval(pollCheck, 10 * 1000);

    return () => clearInterval(intervalId);
  }, [existingCheck, setFormData, setSelectedProducts]);

  // Create new check
  const createCheck = useCallback(async (data: CheckData): Promise<boolean> => {
    try {
      console.log('✨ Creating new check');
      console.log('📦 Check items:', data.items);
      
      const checkRes = await fetch('/api/cash-register/checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      console.log('📡 Create response status:', checkRes.status);
      
      const checkData = await checkRes.json();
      
      if (checkData.success) {
        setExistingCheck({ ...data, id: checkData.data.id });
        prevCheckItemsRef.current = JSON.stringify(data.items);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error creating check:', error);
      return false;
    }
  }, []);

  // Update existing check
  const updateCheck = useCallback(async (checkId: string, data: CheckData): Promise<boolean> => {
    try {
      console.log('📝 Updating check:', checkId);
      console.log('📦 Check items:', data.items);
      
      const updateCheckRes = await fetch(`/api/cash-register/checks/${checkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      console.log('📡 Update response status:', updateCheckRes.status);
      
      if (updateCheckRes.ok) {
        // Fetch updated check to get latest data
        const updatedCheckRes = await fetch(`/api/cash-register/checks/${checkId}`);
        const updatedCheckData = await updatedCheckRes.json();
        
        if (updatedCheckData.success) {
          const updatedCheck = updatedCheckData.data;
          const formDataUpdates = mapCheckToFormData(updatedCheck);
          setFormData((prev: any) => ({ ...prev, ...formDataUpdates }));
          
          // Update items hash
          prevCheckItemsRef.current = JSON.stringify(updatedCheck.items);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating check:', error);
      return false;
    }
  }, [setFormData]);

  // Sync form from check
  const syncFromCheck = useCallback((check: any) => {
    const formDataUpdates = mapCheckToFormData(check);
    setFormData((prev: any) => ({ ...prev, ...formDataUpdates }));
    
    if (check.items && check.items.length > 0) {
      const checkProducts = mapCheckItemsToProducts(check.items);
      setSelectedProducts(checkProducts);
      prevCheckItemsRef.current = JSON.stringify(check.items);
    }
  }, [setFormData, setSelectedProducts]);

  return {
    existingCheck,
    isSyncing,
    fetchCheck,
    createCheck,
    updateCheck,
    syncFromCheck,
  };
}
