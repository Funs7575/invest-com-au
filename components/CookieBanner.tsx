"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if user has already accepted/declined cookies
    const cookieConsent = localStorage.getItem("cookie-consent");
    if (!cookieConsent) {
      // Show banner after a short delay for better UX
      setTimeout(() => {
        setIsVisible(true);
        setTimeout(() => setIsAnimating(true), 50);
      }, 1000);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    handleClose();
  };

  const handleDecline = () => {
    localStorage.setItem("cookie-consent", "declined");
    handleClose();
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => setIsVisible(false), 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[200] bg-slate-900 text-white transition-transform duration-300 ${
        isAnimating ? "translate-y-0" : "translate-y-full"
      }`}
      style={{
        boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
      }}
    >
      <div className="container-custom py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm leading-relaxed">
              We use cookies to enhance your experience on our site. By clicking "Accept All",
              you consent to our use of cookies for analytics and personalization.{" "}
              <Link
                href="/privacy"
                className="text-slate-700 underline hover:text-slate-900 transition-colors"
              >
                Learn more in our Privacy Policy
              </Link>
              .
            </p>
          </div>

          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={handleDecline}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Decline Non-Essential
            </button>
            <button
              onClick={handleAccept}
              className="px-6 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors text-sm"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
