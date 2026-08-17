"use client";

import { useEffect, useRef } from "react";

export type ProjectDetail = {
  title: string;
  image: string;
};

type ProjectDetailViewProps = {
  index: number;
  project: ProjectDetail;
  isTransitioning: boolean;
  onBack: () => void;
};

export function ProjectDetailView({
  index,
  project,
  isTransitioning,
  onBack,
}: ProjectDetailViewProps) {
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    backRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || isTransitioning) return;
      event.preventDefault();
      onBack();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTransitioning, onBack]);

  const projectNumber = String(index + 1).padStart(2, "0");

  return (
    <section
      className="project-detail-view"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-detail-title"
    >
      <header className="project-detail-header">
        <button
          className="project-detail-back"
          ref={backRef}
          type="button"
          onClick={onBack}
          disabled={isTransitioning}
        >
          <span aria-hidden="true">←</span> Back
        </button>
        <p>{projectNumber} / 06</p>
      </header>

      <main className="project-detail-main">
        <div className="project-detail-heading">
          <p>Selected project / {projectNumber}</p>
          <h1 id="project-detail-title">{project.title}</h1>
        </div>

        <figure className="project-detail-cover">
          <img src={project.image} alt={`${project.title} project cover`} draggable={false} />
        </figure>

        <div className="project-detail-meta" aria-label="Project information">
          <div>
            <span>Category</span>
            <strong>{project.title}</strong>
          </div>
          <div>
            <span>Project</span>
            <strong>{projectNumber}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>Case study in progress</strong>
          </div>
        </div>

        <section className="project-detail-placeholder" aria-label="Case study placeholder">
          <p>Project documentation</p>
          <h2>Case study content will be added here.</h2>
        </section>
      </main>
    </section>
  );
}
