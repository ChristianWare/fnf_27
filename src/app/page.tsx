import Nav from "@/components/shared/Nav/Nav";
import styles from "./page.module.css";
import Hero from "@/components/HomePage/Hero/Hero";
import ProofStrip from "@/components/HomePage/ProofStrip/ProofStrip";
import AboutUsIntro from "@/components/HomePage/AboutUsIntro/AboutUsIntro";
import Problems from "@/components/HomePage/Problems/Problems";

export default function Home() {
  return (
    <main className={styles.container}>
      <Nav />
      <Hero />
      <ProofStrip />
      <AboutUsIntro />
      <Problems />
     
    </main>
  );
}
