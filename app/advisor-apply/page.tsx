"use client";

import { useState, useRef, useEffect, Suspense, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts AU mobile/landline formats (loose): digits, spaces, +, -, parens; min 8 digits
const PHONE_RE = /^[+\-()\d\s]{8,}$/;

function FieldCheck() {
  return (
    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );
}
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const TARGET_SIZE = 400;

function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = TARGET_SIZE;
      canvas.height = TARGET_SIZE;
      const ctx = canvas.getContext("2d")!;
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, TARGET_SIZE, TARGET_SIZE);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to resize image"));
        },
        "image/webp",
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

type InviteContext = {
  email: string;
  name: string | null;
  firmName: string | null;
  firmId: number;
  role: string;
};

function AdvisorApplyInner() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [inviteContext, setInviteContext] = useState<InviteContext | null>(null);
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken);

  const [accountType, setAccountType] = useState<"individual" | "firm">("individual");
  const [form, setForm] = useState({
    name: "", firm_name: "", email: "", phone: "", type: "financial_planner",
    afsl_number: "", registration_number: "", location_state: "",
    location_suburb: "", specialties: "", bio: "", website: "", fee_description: "",
    abn: "",
    termsAccepted: false,
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Photo upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inline field validation
  const [touched, setTouched] = useState<{ name: boolean; email: boolean; phone: boolean; firm_name: boolean }>({
    name: false,
    email: false,
    phone: false,
    firm_name: false,
  });
  const [fieldErrors, setFieldErrors] = useState<{ name: string; email: string; phone: string; firm_name: string }>({
    name: "",
    email: "",
    phone: "",
    firm_name: "",
  });

  const validateName = useCallback((v: string) => {
    if (!v.trim()) return "Full name is required";
    if (v.trim().length < 2) return "Name must be at least 2 characters";
    return "";
  }, []);
  const validateEmailField = useCallback((v: string) => {
    if (!v.trim()) return "Email is required";
    if (!EMAIL_RE.test(v.trim())) return "Please enter a valid email";
    return "";
  }, []);
  const validatePhone = useCallback((v: string) => {
    if (!v.trim()) return "";
    if (!PHONE_RE.test(v.trim())) return "Please enter a valid phone number";
    return "";
  }, []);
  const validateFirmName = useCallback(
    (v: string, required: boolean) => {
      if (!required) return "";
      if (!v.trim()) return "Firm name is required";
      if (v.trim().length < 2) return "Firm name must be at least 2 characters";
      return "";
    },
    []
  );

  const firmRequired = accountType === "firm" && !inviteToken;

  const isFormValid =
    !validateName(form.name) &&
    !validateEmailField(form.email) &&
    !validatePhone(form.phone) &&
    !validateFirmName(form.firm_name, firmRequired) &&
    !!form.type &&
    !!photoFile &&
    form.termsAccepted;

  // Load invite context if token present
  useEffect(() => {
    if (!inviteToken) return;
    setInviteLoading(true);
    fetch(`/api/advisor-apply/invite?token=${inviteToken}`)
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json();
          setInviteError(d.error || "Invalid invitation");
          return;
        }
        const data: InviteContext = await res.json();
        setInviteContext(data);
        // Pre-fill email and name from invitation
        setForm(f => ({
          ...f,
          email: data.email || f.email,
          name: data.name || f.name,
        }));
        setAccountType("firm");
      })
      .catch(() => setInviteError("Failed to load invitation. Please try again."))
      .finally(() => setInviteLoading(false));
  }, [inviteToken]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError("");

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPhotoError("Please upload a JPG, PNG, or WebP image.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setPhotoError("Image must be under 5MB.");
      e.target.value = "";
      return;
    }

    setPhotoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
    e.target.value = "";
  };

  const removePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoError("");
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;
    setPhotoUploading(true);
    try {
      const resizedBlob = await resizeImage(photoFile);
      const formData = new FormData();
      formData.append("file", resizedBlob, "photo.webp");

      const res = await fetch("/api/advisor-apply/photo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(data.error || "Photo upload failed");
      }

      const { publicUrl } = await res.json();
      return publicUrl;
    } finally {
      setPhotoUploading(false);
    }
  };

  const submit = async () => {
    if (!form.name || !form.email || !form.type) {
      setErrorMsg("Name, email, and advisor type are required.");
      return;
    }
    if (accountType === "firm" && !inviteToken && !form.firm_name) {
      setErrorMsg("Firm name is required for firm applications.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (inviteContext && form.email.toLowerCase() !== inviteContext.email.toLowerCase()) {
      setErrorMsg(`This invitation was sent to ${inviteContext.email}. Please use that email address.`);
      return;
    }
    if (!photoFile) {
      setErrorMsg("A profile photo is required.");
      return;
    }
    setStatus("submitting");
    setErrorMsg("");
    try {
      const photoUrl = await uploadPhoto();
      if (!photoUrl) {
        setErrorMsg("Photo upload failed. Please try again.");
        setStatus("error");
        return;
      }

      const payload: Record<string, unknown> = {
        ...form,
        account_type: accountType,
        photo_url: photoUrl,
      };
      if (inviteToken) {
        payload.invite_token = inviteToken;
      }

      const res = await fetch("/api/advisor-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Something went wrong.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  };

  // Loading state while looking up invite
  if (inviteLoading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-violet-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading invitation...</p>
      </div>
    );
  }

  // Invalid invite token
  if (inviteToken && inviteError) {
    return (
      <div className="py-12 md:py-20">
        <div className="container-custom max-w-lg text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="x" size={32} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Invitation Problem</h1>
          <p className="text-slate-500 mb-6">{inviteError}</p>
          <Link href="/advisor-apply" className="text-sm text-violet-600 hover:text-violet-700 font-semibold">Apply without an invitation →</Link>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="py-12 md:py-20">
        <div className="container-custom max-w-lg text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="check" size={32} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Application Submitted!</h1>
          <p className="text-slate-500 mb-6">
            {inviteContext
              ? `Your application to join ${inviteContext.firmName} has been submitted. We'll review your credentials and get back to you within 48 hours.`
              : "We'll review your credentials and get back to you within 48 hours. Check your email for confirmation."
            }
          </p>
          <Link href="/advisors" className="text-sm text-amber-600 hover:text-amber-700 font-semibold">&larr; Back to Advisor Directory</Link>
        </div>
      </div>
    );
  }

  const isInviteFlow = !!inviteContext;

  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-2xl">
        <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <Link href="/advisors" className="hover:text-slate-900">Advisors</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">Apply</span>
        </nav>

        {/* Invite banner */}
        {isInviteFlow && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-5 flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center shrink-0">
              <Icon name="users" size={18} className="text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-violet-900">You&apos;ve been invited to join {inviteContext.firmName}</p>
              <p className="text-xs text-violet-600 mt-0.5">Complete your profile below to accept the invitation and join the team.</p>
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-2xl p-5 md:p-8 mb-6 md:mb-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent_60%)]" />
          <div className="relative">
            <h1 className="text-xl md:text-3xl font-extrabold mb-2">
              {isInviteFlow ? `Join ${inviteContext.firmName}` : "Get Listed on Invest.com.au"}
            </h1>
            <p className="text-sm md:text-base text-violet-200 mb-4 leading-relaxed max-w-lg">
              {isInviteFlow
                ? `Complete your profile to join the ${inviteContext.firmName} team on Invest.com.au.`
                : "Join our advisor directory and connect with Australian investors looking for professional advice."
              }
            </p>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {[
                { icon: "gift", title: "Free Listing", desc: "No upfront cost" },
                { icon: "users", title: "Qualified Leads", desc: "Investors seeking help" },
                { icon: "shield", title: "Verified Badge", desc: "ASIC/TPB checked" },
              ].map((v, i) => (
                <div key={i} className="bg-white/10 backdrop-blur rounded-lg p-2.5 md:p-3 text-center">
                  <Icon name={v.icon} size={18} className="text-violet-200 mx-auto mb-1" />
                  <div className="text-[0.62rem] md:text-xs font-bold text-white">{v.title}</div>
                  <div className="text-[0.5rem] md:text-[0.62rem] text-violet-300">{v.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6">
          <div className="space-y-4">
            {/* Account Type Selector — hidden in invite flow */}
            {!isInviteFlow && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">I&apos;m applying as *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setAccountType("individual")} className={`p-3 rounded-lg border-2 text-left transition-all ${accountType === "individual" ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name="user" size={16} className={accountType === "individual" ? "text-slate-900" : "text-slate-400"} />
                      <span className="text-sm font-bold text-slate-900">Individual Advisor</span>
                    </div>
                    <p className="text-[0.62rem] text-slate-500">Solo practitioner or authorised rep</p>
                  </button>
                  <button type="button" onClick={() => setAccountType("firm")} className={`p-3 rounded-lg border-2 text-left transition-all ${accountType === "firm" ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name="building" size={16} className={accountType === "firm" ? "text-slate-900" : "text-slate-400"} />
                      <span className="text-sm font-bold text-slate-900">Firm / Brokerage</span>
                    </div>
                    <p className="text-[0.62rem] text-slate-500">Register your firm & invite team members</p>
                  </button>
                </div>
              </div>
            )}

            {/* Photo Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Profile Photo *</label>
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploading}
                  className={`
                    relative w-24 h-24 rounded-full border-2 border-dashed overflow-hidden flex-shrink-0
                    transition-all duration-200 cursor-pointer group
                    ${photoPreview ? "border-slate-300" : "border-slate-300 hover:border-slate-400"}
                    ${photoUploading ? "opacity-70 cursor-wait" : ""}
                  `}
                >
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Profile photo preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-slate-100 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  )}
                  {!photoUploading && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <div className="pt-1">
                  <p className="text-xs text-slate-500">Click to upload a headshot photo.</p>
                  <p className="text-[0.56rem] text-slate-400 mt-0.5">JPG, PNG, or WebP. Max 5MB.</p>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="text-[0.62rem] text-red-500 hover:text-red-600 font-medium mt-1.5"
                    >
                      Remove photo
                    </button>
                  )}
                  {photoError && (
                    <p className="text-xs text-red-600 font-medium mt-1">{photoError}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="aa-name" className="block text-xs font-semibold text-slate-600 mb-1">{accountType === "firm" ? "Your Full Name *" : "Full Name *"}</label>
                <div className="relative">
                  <input
                    id="aa-name"
                    value={form.name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm({ ...form, name: v });
                      if (touched.name) setFieldErrors((prev) => ({ ...prev, name: validateName(v) }));
                    }}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, name: true }));
                      setFieldErrors((prev) => ({ ...prev, name: validateName(form.name) }));
                    }}
                    aria-invalid={!!fieldErrors.name && touched.name}
                    aria-describedby={fieldErrors.name && touched.name ? "aa-name-error" : undefined}
                    className={`w-full px-3 py-2 pr-8 border rounded-lg text-sm ${
                      fieldErrors.name && touched.name ? "border-red-500" : "border-slate-200"
                    }`}
                    placeholder="Sarah Chen"
                  />
                  {touched.name && !fieldErrors.name && form.name && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2"><FieldCheck /></span>
                  )}
                </div>
                {fieldErrors.name && touched.name && (
                  <p id="aa-name-error" className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>
                )}
              </div>
              {!isInviteFlow && (
                <div>
                  <label htmlFor="aa-firm-name" className="block text-xs font-semibold text-slate-600 mb-1">{accountType === "firm" ? "Firm Name *" : "Firm Name"}</label>
                  <div className="relative">
                    <input
                      id="aa-firm-name"
                      value={form.firm_name}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm({ ...form, firm_name: v });
                        if (touched.firm_name) setFieldErrors((prev) => ({ ...prev, firm_name: validateFirmName(v, firmRequired) }));
                      }}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, firm_name: true }));
                        setFieldErrors((prev) => ({ ...prev, firm_name: validateFirmName(form.firm_name, firmRequired) }));
                      }}
                      aria-invalid={!!fieldErrors.firm_name && touched.firm_name}
                      aria-describedby={fieldErrors.firm_name && touched.firm_name ? "aa-firm-name-error" : undefined}
                      className={`w-full px-3 py-2 pr-8 border rounded-lg text-sm ${
                        fieldErrors.firm_name && touched.firm_name ? "border-red-500" : "border-slate-200"
                      }`}
                      placeholder="Chen Advisory"
                    />
                    {touched.firm_name && !fieldErrors.firm_name && form.firm_name && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2"><FieldCheck /></span>
                    )}
                  </div>
                  {fieldErrors.firm_name && touched.firm_name && (
                    <p id="aa-firm-name-error" className="text-xs text-red-500 mt-1">{fieldErrors.firm_name}</p>
                  )}
                </div>
              )}
              {isInviteFlow && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Firm</label>
                  <input value={inviteContext.firmName || ""} disabled className="w-full px-3 py-2 border border-slate-100 bg-slate-50 rounded-lg text-sm text-slate-500 cursor-not-allowed" />
                </div>
              )}
            </div>

            {/* Firm-specific fields — only for new firm applications, not invite flow */}
            {accountType === "firm" && !isInviteFlow && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ABN</label>
                  <input value={form.abn} onChange={(e) => setForm({ ...form, abn: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="XX XXX XXX XXX" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Firm Website</label>
                  <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="https://..." />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="aa-email" className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
                <div className="relative">
                  <input
                    id="aa-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm({ ...form, email: v });
                      if (touched.email) setFieldErrors((prev) => ({ ...prev, email: validateEmailField(v) }));
                    }}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, email: true }));
                      setFieldErrors((prev) => ({ ...prev, email: validateEmailField(form.email) }));
                    }}
                    disabled={isInviteFlow}
                    aria-invalid={!!fieldErrors.email && touched.email}
                    aria-describedby={fieldErrors.email && touched.email ? "aa-email-error" : undefined}
                    className={`w-full px-3 py-2 pr-8 border rounded-lg text-sm ${
                      fieldErrors.email && touched.email ? "border-red-500" : "border-slate-200"
                    } ${isInviteFlow ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""}`}
                    placeholder="sarah@example.com"
                  />
                  {!isInviteFlow && touched.email && !fieldErrors.email && form.email && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2"><FieldCheck /></span>
                  )}
                </div>
                {fieldErrors.email && touched.email && (
                  <p id="aa-email-error" className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
                )}
                {isInviteFlow && <p className="text-[0.56rem] text-slate-400 mt-0.5">Email is fixed by your invitation.</p>}
              </div>
              <div>
                <label htmlFor="aa-phone" className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                <div className="relative">
                  <input
                    id="aa-phone"
                    value={form.phone}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm({ ...form, phone: v });
                      if (touched.phone) setFieldErrors((prev) => ({ ...prev, phone: validatePhone(v) }));
                    }}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, phone: true }));
                      setFieldErrors((prev) => ({ ...prev, phone: validatePhone(form.phone) }));
                    }}
                    aria-invalid={!!fieldErrors.phone && touched.phone}
                    aria-describedby={fieldErrors.phone && touched.phone ? "aa-phone-error" : undefined}
                    className={`w-full px-3 py-2 pr-8 border rounded-lg text-sm ${
                      fieldErrors.phone && touched.phone ? "border-red-500" : "border-slate-200"
                    }`}
                    placeholder="04XX XXX XXX"
                  />
                  {touched.phone && !fieldErrors.phone && form.phone && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2"><FieldCheck /></span>
                  )}
                </div>
                {fieldErrors.phone && touched.phone && (
                  <p id="aa-phone-error" className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Advisor Type *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                {Object.entries(PROFESSIONAL_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">AFSL Number</label>
                <input value={form.afsl_number} onChange={(e) => setForm({ ...form, afsl_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. 234567" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Registration / TAN</label>
                <input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="For tax agents" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">State</label>
                <select value={form.location_state} onChange={(e) => setForm({ ...form, location_state: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option value="">Select...</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Suburb</label>
                <input value={form.location_suburb} onChange={(e) => setForm({ ...form, location_suburb: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Sydney CBD" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Specialties</label>
              <input value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="SMSF Setup, Retirement Planning, ETF Portfolios" />
              <p className="text-[0.56rem] text-slate-400 mt-0.5">Comma-separated</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Short Bio</label>
              <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Tell investors about your experience and approach..." />
            </div>

            {accountType !== "firm" || isInviteFlow ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Website</label>
                  <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Fee Range</label>
                  <input value={form.fee_description} onChange={(e) => setForm({ ...form, fee_description: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. SOA from $3,300" />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fee Range</label>
                <input value={form.fee_description} onChange={(e) => setForm({ ...form, fee_description: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. SOA from $3,300" />
              </div>
            )}

            {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

            <button
              onClick={submit}
              disabled={status === "submitting" || !isFormValid}
              className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {status === "submitting" ? (photoUploading ? "Uploading photo..." : "Submitting...") : isInviteFlow ? "Accept Invitation & Apply" : "Submit Application"}
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.termsAccepted || false}
                onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })}
                className="w-4 h-4 mt-0.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                required
              />
              <span className="text-[0.6rem] md:text-xs text-slate-600 leading-relaxed">
                I have read and agree to the{" "}
                <Link href="/advisor-terms" target="_blank" className="text-violet-600 underline hover:text-violet-800">Advisor Services Agreement</Link>,{" "}
                <Link href="/terms" target="_blank" className="text-violet-600 underline hover:text-violet-800">Terms of Use</Link>, and{" "}
                <Link href="/privacy" target="_blank" className="text-violet-600 underline hover:text-violet-800">Privacy Policy</Link>.
                I confirm my details are accurate and I hold the required professional registration.
              </span>
            </label>
          </div>
          <p className="text-[0.52rem] text-slate-400 mt-1.5 text-center">
            We&apos;ll verify your AFSL/registration before activating your listing.
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Already listed? <Link href="/advisor-portal" className="text-slate-600 hover:text-slate-900 font-medium">Log in to your portal &rarr;</Link>
        </p>
      </div>
    </div>
  );
}

export default function AdvisorApplyPage() {
  return (
    <Suspense fallback={
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-violet-600 rounded-full animate-spin mx-auto mb-3" />
      </div>
    }>
      <AdvisorApplyInner />
    </Suspense>
  );
}
