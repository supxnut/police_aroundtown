import { useEffect } from 'react';

export const useRealtimeCases = (onCaseUpdate: () => void) => {
  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/realtime/stream');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && ['CASE_CREATED', 'CASE_UPDATED', 'CASE_DELETED'].includes(data.type)) {
            onCaseUpdate();
          }
        } catch (e) {
          console.error('Error parsing SSE event in useRealtimeCases:', e);
        }
      };

      eventSource.onerror = (err) => {
        console.warn('SSE connection error, fallback polling active:', err);
      };
    } catch (err) {
      console.warn('SSE not supported or failed to initialize:', err);
    }

    // Interval polling backup every 10 seconds to guarantee real-time sync
    const pollInterval = setInterval(() => {
      onCaseUpdate();
    }, 10000);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearInterval(pollInterval);
    };
  }, [onCaseUpdate]);
};
