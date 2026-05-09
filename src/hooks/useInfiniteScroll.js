import { useEffect, useRef } from "react";

export function useInfiniteScroll(callback, hasMore) {
  const observerRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          callback();
        }
      },
      { threshold: 1.0 },
    );

    const observedElement = observerRef.current;

    if (observedElement) {
      observer.observe(observedElement);
    }

    return () => {
      if (observedElement) {
        observer.unobserve(observedElement);
      }
    };
  }, [callback, hasMore]);

  return observerRef;
}
