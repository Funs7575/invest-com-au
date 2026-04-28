"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

function hasConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("cookie-preferences");
    if (raw) {
      const prefs = JSON.parse(raw);
      return prefs.analytics === true;
    }
    return localStorage.getItem("cookie-consent") === "accepted";
  } catch {
    return false;
  }
}

export default function TrackingPixels() {
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    // Read initial consent from localStorage on mount — must run client-side,
    // can't use lazy initial state because hasConsent() reads window/localStorage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(hasConsent());
    // Re-check consent on storage changes (fires from other tabs)
    const handler = () => setConsent(hasConsent());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  if (!consent) return null;

  return (
    <>
      {/* Facebook Pixel */}
      {FB_PIXEL_ID && (
        <Script
          id="fb-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            // eslint-disable-next-line invest/no-unsafe-inner-html -- template interpolates only server-side NEXT_PUBLIC env vars (FB_PIXEL_ID), not user input
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${FB_PIXEL_ID}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}

      {/* Google Ads Remarketing Tag */}
      {GOOGLE_ADS_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
            strategy="afterInteractive"
          />
          <Script
            id="google-ads"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              // eslint-disable-next-line invest/no-unsafe-inner-html -- template interpolates only server-side NEXT_PUBLIC env vars (GOOGLE_ADS_ID), not user input
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GOOGLE_ADS_ID}');
              `,
            }}
          />
        </>
      )}
    </>
  );
}
