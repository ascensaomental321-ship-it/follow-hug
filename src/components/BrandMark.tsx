import { useEffect, useState } from 'react';
import logoAsset from '@/assets/zenter-logo.jpg.asset.json';

export const BrandMark = () => {
  const [showLogo, setShowLogo] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      setShowLogo(true);
      timeout = setTimeout(() => setShowLogo(false), 2200);
    }, 12000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <h1 className="relative text-lg sm:text-xl font-bold tracking-tight text-foreground select-none">
      <span aria-hidden className="invisible whitespace-nowrap">CRM Pro Zenter</span>
      <span
        className={`absolute inset-0 flex items-center whitespace-nowrap transition-all duration-500 ease-out ${
          showLogo ? 'opacity-0 -translate-y-1' : 'opacity-100 translate-y-0'
        }`}
      >
        CRM Pro <span className="text-primary italic font-extrabold ml-1">Zenter</span>
      </span>
      <span
        className={`absolute inset-0 flex items-center transition-all duration-500 ease-out ${
          showLogo ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
        }`}
      >
        <img
          src={logoAsset.url}
          alt="Zenter"
          className="h-6 sm:h-7 w-auto object-contain"
          loading="lazy"
          decoding="async"
        />
      </span>
    </h1>
  );
};