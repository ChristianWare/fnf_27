// The white card under a project's hero: the numbers, then the story.

import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./ProjectDetails.module.css";
import Reveal from "@/components/shared/Reveal/Reveal";
import ProjectStats from "./ProjectStats";
import ProjectStory from "./ProjectStory";
import type { Project } from "@/lib/projects";

export default function ProjectDetails({ project }: { project: Project }) {
  return (
    <section className={styles.container} aria-label='Case study'>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <ProjectStats stats={project.stats} />
          <ProjectStory story={project.story} />
        </div>
      </LayoutWrapper>
    </section>
  );
}
