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

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
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
  };

  return (
    <div className="header-resources" ref={rootRef}>
      {(["portfolio", "cv"] as const).map((resource) => {
        const isOpen = openMenu === resource;
        return (
          <div className={`header-resource${isOpen ? " is-open" : ""}`} key={resource}>
            <button
              type="button"
              className="header-resource-trigger"
              aria-expanded={isOpen}
              aria-haspopup="menu"
              onClick={() => setOpenMenu(isOpen ? null : resource)}
            >
              {resource}
            </button>
            <div className="header-resource-menu" role="menu" aria-label={`${resource} language`}>
              <button type="button" role="menuitem" onClick={() => openResource(resource, "zh")}>中文</button>
              <button type="button" role="menuitem" onClick={() => openResource(resource, "en")}>English</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
