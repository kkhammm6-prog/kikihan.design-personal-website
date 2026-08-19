"use client";

import { useEffect, useRef, useState } from "react";

type Resource = "portfolio" | "cv";

// Add the final online document URLs here when they are ready.
const resourceLinks: Record<Resource, { zh: string; en: string }> = {
  portfolio: {
    zh: "https://docs.qq.com/pdf/DVWhtT3NBekdkenNJ",
    en: "https://drive.google.com/file/d/1ISof1R5gep6ivoNjN-7tDjJRVAw9bEce/view?usp=drive_link",
  },
  cv: {
    zh: "https://docs.qq.com/pdf/DVXdwRExDcW12UUdo",
    en: "https://drive.google.com/file/d/1ZbTYN74atmpFSu2eLBPfahFJOxkQIqPC/view?usp=drive_link",
  },
};

export function HeaderResources() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [openMenu, setOpenMenu] = useState<Resource | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
        setIsMobileMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const openResource = (resource: Resource, language: "zh" | "en") => {
    const url = resourceLinks[resource][language];
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    setOpenMenu(null);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="header-resources" ref={rootRef}>
      <div className="header-resources-desktop">
        {(["portfolio", "cv"] as const).map((resource) => {
        const isOpen = openMenu === resource;
        return (
          <div className={`header-resource${isOpen ? " is-open" : ""}`} key={resource}>
            <button
              type="button"
              className="header-resource-trigger"
              aria-expanded={isOpen}
              aria-haspopup="menu"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setOpenMenu(isOpen ? null : resource);
              }}
            >
              {resource}
            </button>
            <div className="header-resource-menu" role="menu" aria-label={`${resource} language`}>
              <button type="button" role="menuitem" onClick={() => openResource(resource, "zh")}>CN</button>
              <button type="button" role="menuitem" onClick={() => openResource(resource, "en")}>EN</button>
            </div>
          </div>
        );
      })}
      </div>

      <div className="header-resources-mobile">
        <button
          type="button"
          className="header-mobile-menu-trigger"
          aria-label="Open portfolio and CV links"
          aria-expanded={isMobileMenuOpen}
          aria-haspopup="menu"
          onClick={() => {
            setOpenMenu(null);
            setIsMobileMenuOpen((isOpen) => !isOpen);
          }}
        >
          <img src="/icons/header/menu.svg" alt="" aria-hidden="true" />
        </button>
        <div className={`header-mobile-resource-menu${isMobileMenuOpen ? " is-open" : ""}`} role="menu" aria-label="Portfolio and CV links">
          {(["portfolio", "cv"] as const).map((resource) => {
            const isOpen = openMenu === resource;
            return (
              <div className={`header-mobile-resource${isOpen ? " is-open" : ""}`} key={resource}>
                <button
                  type="button"
                  className="header-mobile-resource-trigger"
                  aria-expanded={isOpen}
                  onClick={() => setOpenMenu(isOpen ? null : resource)}
                >
                  {resource}
                </button>
                <div className="header-mobile-language-menu" role="group" aria-label={`${resource} language`}>
                  <button type="button" onClick={() => openResource(resource, "zh")}>CN</button>
                  <button type="button" onClick={() => openResource(resource, "en")}>EN</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
