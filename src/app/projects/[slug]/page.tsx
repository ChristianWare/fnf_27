import type { Metadata } from "next";
import { notFound } from "next/navigation";
import styles from "../../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import ProjectHero from "@/components/ProjectPage/ProjectHero/ProjectHero";
import ProjectPhotos from "@/components/ProjectPage/ProjectPhotos/ProjectPhotos";
import ProjectDetails from "@/components/ProjectPage/ProjectDetails/ProjectDetails";
import Footer from "@/components/shared/Footer/Footer";
import { getProject, projectHref, projects } from "@/lib/projects";

type Params = Promise<{ slug: string }>;

// Every project is built at build time.
export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return { title: { absolute: "Projects | Fonts & Footers" } };
  return {
    title: { absolute: `${project.name}: ${project.title} | Fonts & Footers` },
    description: project.summary,
    alternates: { canonical: projectHref(project) },
  };
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  return (
    <main className={styles.container}>
      <Nav />
      <ProjectHero project={project} />
      <ProjectPhotos photos={project.photos} name={project.name} />
      <ProjectDetails project={project} />
      <Footer />
    </main>
  );
}
