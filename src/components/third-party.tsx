import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim();
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();

/** Google Analytics and AdSense load only when their ids are configured. */
export function ThirdPartyScripts() {
  const gaOk = GA_ID && /^G-[A-Z0-9]+$/.test(GA_ID);
  const adsOk = ADSENSE_CLIENT && /^ca-pub-\d+$/.test(ADSENSE_CLIENT);
  return (
    <>
      {gaOk ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true});`}
          </Script>
        </>
      ) : null}
      {adsOk ? (
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          strategy="lazyOnload"
          crossOrigin="anonymous"
        />
      ) : null}
    </>
  );
}
