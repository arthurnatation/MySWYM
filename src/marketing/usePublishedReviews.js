import { useEffect, useState } from "react";
import { supabase } from "../supabase.js";

let reviewsInflight = null;
let reviewsCache = null;

function mapReviews(data) {
  return (data || []).map((row) => ({
    id: row.id,
    authorName: row.author_name,
    rating: row.rating,
    body: row.body,
  }));
}

function loadPublishedReviews() {
  if (reviewsCache) return Promise.resolve(reviewsCache);
  if (reviewsInflight) return reviewsInflight;
  reviewsInflight = supabase
    .from("landing_reviews")
    .select("id, author_name, rating, body, created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .then(({ data, error }) => {
      reviewsCache = error ? [] : mapReviews(data);
      return reviewsCache;
    })
    .catch(() => {
      reviewsCache = [];
      return reviewsCache;
    })
    .finally(() => {
      reviewsInflight = null;
    });
  return reviewsInflight;
}

/** Avis landing publiés. Un fetch par session SPA, silence si table absente. */
export function usePublishedReviews() {
  const [reviews, setReviews] = useState(() => reviewsCache || []);
  const [loading, setLoading] = useState(() => !reviewsCache);

  useEffect(() => {
    let cancelled = false;
    loadPublishedReviews().then((rows) => {
      if (!cancelled) {
        setReviews(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { reviews, loading };
}
