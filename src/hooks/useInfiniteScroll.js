import { useEffect, useRef } from "react";

export function useInfiniteScroll(callback, hasMore) {
  const observerRef = useRef(null);
  const latestCallbackRef = useRef(callback);


  useEffect(() => {
    latestCallbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const observedElement = observerRef.current;
    if (!observedElement) return;

    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && hasMore) {
          latestCallbackRef.current();
        }
      },
      {
        root: null,
        threshold: 0.01,
      }
    );

    observer.observe(observedElement);

    return () => {
      observer.disconnect();
    };
  }, [hasMore]);

  return observerRef;
}

