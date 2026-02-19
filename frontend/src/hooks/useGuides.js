import { useEffect, useState } from "react";

export default function useGuides() {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchGuides() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/guides", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = await response.json();
        const list = Array.isArray(payload?.guides) ? payload.guides : [];
        setGuides(list);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Something went wrong while fetching guides.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchGuides();

    return () => {
      controller.abort();
    };
  }, []);

  return {
    guides,
    loading,
    error,
  };
}
