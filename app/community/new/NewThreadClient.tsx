"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";

interface ForumCategory {
  id: string;
  slug: string;
  name: string;
  icon: string;
  color: string;
}

export default function NewThreadClient() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCategory = searchParams.get("category") ?? "";

  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  const [categorySlug, setCategorySlug] = useState(preselectedCategory);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [heldForReview, setHeldForReview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Friendly pre-submit nudge (non-blocking): personal-advice phrasing is the
  // top reason threads get removed — steer toward general framing before the
  // server-side gate has to.
  const adviceNudge =
    /\bshould\s+i\s+(buy|sell|invest)\b|\bwhat\s+should\s+i\s+(buy|invest)\b|\btell\s+me\s+what\s+to\s+(buy|invest)\b/i.test(
      `${title} ${body}`,
    );

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login?next=/community/new");
    }
  }, [authLoading, user, router]);

  // Fetch categories
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/community/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories ?? []);
        }
      } catch {
        // Handle silently
      } finally {
        setLoadingCats(false);
      }
    })();
  }, []);

  // Sync preselected category when categories load
  useEffect(() => {
    if (preselectedCategory && categories.length > 0) {
      const found = categories.find((c) => c.slug === preselectedCategory);
      if (found) setCategorySlug(found.slug);
    }
  }, [preselectedCategory, categories]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!categorySlug) errs.category = "Please select a category";
    if (!title.trim()) errs.title = "Title is required";
    else if (title.trim().length < 5)
      errs.title = "Title must be at least 5 characters";
    else if (title.trim().length > 200)
      errs.title = "Title must be 200 characters or less";
    if (!body.trim()) errs.body = "Body is required";
    else if (body.trim().length < 10)
      errs.body = "Body must be at least 10 characters";
    else if (body.trim().length > 10000)
      errs.body = "Body must be 10,000 characters or less";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/community/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_slug: categorySlug,
          title: title.trim(),
          body: body.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrors({ submit: data.error || "Failed to create thread" });
        return;
      }

      const data = await res.json();
      if (data.pending_review) {
        // Held by the publish gate — show the review notice instead of
        // redirecting to a thread the author can't see yet.
        setHeldForReview(
          data.message ||
            "Your thread is awaiting a quick moderator review before it goes live.",
        );
        return;
      }
      router.push(`/community/${categorySlug}/${data.thread.id}`);
    } catch {
      setErrors({ submit: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container-custom max-w-4xl py-12">
        <div className="bg-white border border-slate-200 rounded-xl p-8 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-6" />
          <div className="h-10 bg-slate-100 rounded mb-4" />
          <div className="h-10 bg-slate-100 rounded mb-4" />
          <div className="h-40 bg-slate-100 rounded mb-4" />
          <div className="h-10 bg-slate-200 rounded w-32" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (heldForReview) {
    return (
      <div className="container-custom max-w-4xl py-12">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <Icon name="check-circle" size={40} className="text-emerald-600 mx-auto mb-4" />
          <h1 className="text-xl font-extrabold text-slate-900 mb-2">
            Thread submitted for review
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">{heldForReview}</p>
          <Link
            href="/community"
            className="inline-block bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
          >
            Back to Community
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom max-w-4xl py-8">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6">
        <ol className="flex items-center gap-1">
          <li>
            <Link href="/" className="hover:text-slate-700">
              Home
            </Link>
          </li>
          <li>
            <Icon name="chevron-right" size={14} className="text-slate-400" />
          </li>
          <li>
            <Link href="/community" className="hover:text-slate-700">
              Community
            </Link>
          </li>
          <li>
            <Icon name="chevron-right" size={14} className="text-slate-400" />
          </li>
          <li className="text-slate-900 font-medium">New Thread</li>
        </ol>
      </nav>

      <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8">
        <h1 className="text-2xl text-slate-900 font-extrabold mb-6">
          Start a New Thread
        </h1>

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
            {errors.submit}
          </div>
        )}

        {/* Category Select */}
        <div className="mb-5">
          <label
            htmlFor="category"
            className="block text-sm font-semibold text-slate-900 mb-1.5"
          >
            Category
          </label>
          {loadingCats ? (
            <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <select
              id="category"
              value={categorySlug}
              onChange={(e) => {
                setCategorySlug(e.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.category;
                  return next;
                });
              }}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ${
                errors.category ? "border-red-300" : "border-slate-200"
              }`}
            >
              <option value="">Select a category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}
          {errors.category && (
            <p className="text-xs text-red-500 mt-1">{errors.category}</p>
          )}
        </div>

        {/* Title */}
        <div className="mb-5">
          <label
            htmlFor="title"
            className="block text-sm font-semibold text-slate-900 mb-1.5"
          >
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.title;
                return next;
              });
            }}
            placeholder="What's your question or topic?"
            maxLength={200}
            className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ${
              errors.title ? "border-red-300" : "border-slate-200"
            }`}
          />
          <div className="flex items-center justify-between mt-1">
            {errors.title ? (
              <p className="text-xs text-red-500">{errors.title}</p>
            ) : (
              <span />
            )}
            <span
              className={`text-xs ${
                title.length > 180 ? "text-amber-500" : "text-slate-400"
              }`}
            >
              {title.length}/200
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="body"
              className="block text-sm font-semibold text-slate-900"
            >
              Body
            </label>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
            >
              <Icon name="eye" size={14} />
              {showPreview ? "Edit" : "Preview"}
            </button>
          </div>

          {showPreview ? (
            <div className="w-full border border-slate-200 rounded-lg p-3 min-h-50 bg-slate-50">
              {body.trim() ? (
                <div className="prose prose-sm max-w-none text-slate-700">
                  {body.split("\n").map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">
                  Nothing to preview yet.
                </p>
              )}
            </div>
          ) : (
            <textarea
              id="body"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.body;
                  return next;
                });
              }}
              placeholder="Share the details of your discussion. Use line breaks to separate paragraphs."
              maxLength={10000}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none min-h-50 resize-y ${
                errors.body ? "border-red-300" : "border-slate-200"
              }`}
            />
          )}

          <div className="flex items-center justify-between mt-1">
            {errors.body ? (
              <p className="text-xs text-red-500">{errors.body}</p>
            ) : (
              <p className="text-xs text-slate-400">
                Use line breaks for paragraphs.
              </p>
            )}
            <span
              className={`text-xs ${
                body.length > 9000 ? "text-amber-500" : "text-slate-400"
              }`}
            >
              {body.length.toLocaleString()}/10,000
            </span>
          </div>
        </div>

        {/* Pre-submit compliance nudge — non-blocking */}
        {adviceNudge && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3 mb-5">
            <strong>Keep it general:</strong> asking &quot;should I buy X?&quot; reads as a
            request for personal financial advice, which no one here can give.
            Try &quot;how do people evaluate X?&quot; instead — those threads stay up and
            get better answers.
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {submitting ? "Posting..." : "Post Thread"}
          </button>
          <Link
            href="/community"
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </Link>
          <Link
            href="/community/guidelines"
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors ml-auto"
          >
            Community guidelines
          </Link>
        </div>
      </div>
    </div>
  );
}
