'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

/** Wait for client mount, then redirect to home if no customer token. */
export function useCustomerAuthGate() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!api.getCustomerToken()) {
      router.replace('/');
      return;
    }
    setReady(true);
  }, [router]);

  return ready;
}
