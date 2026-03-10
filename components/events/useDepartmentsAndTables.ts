// Hook для управління залами та столами

import { useState, useEffect } from 'react';
import { Department, Table } from './EventFormModal.types';

export function useDepartmentsAndTables() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      setLoadingDepartments(true);
      try {
        const res = await fetch('/api/cash-register/departments');
        const data = await res.json();
        if (data.success) {
          setDepartments(data.data);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
      } finally {
        setLoadingDepartments(false);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch tables when department changes
  const fetchTables = async (departmentId: string) => {
    if (!departmentId) {
      setTables([]);
      return;
    }

    setLoadingTables(true);
    try {
      const res = await fetch(`/api/cash-register/tables?departmentId=${departmentId}`);
      const data = await res.json();
      if (data.success) {
        setTables(data.data);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoadingTables(false);
    }
  };

  // Create new table
  const createTable = async (tableName: string, departmentId: string): Promise<Table | null> => {
    try {
      const res = await fetch('/api/cash-register/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tableName,
          departmentId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Refresh tables list
        await fetchTables(departmentId);
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('Error creating table:', error);
      return null;
    }
  };

  return {
    departments,
    tables,
    loadingDepartments,
    loadingTables,
    fetchTables,
    createTable,
  };
}
