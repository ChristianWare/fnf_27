/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactNode } from "react";
import Link from "next/link";
import styles from "./Button.module.css";
import Arrow from "../icons/Arrow/Arrow";

interface Props {
  href?: string;
  text?: string;
  btnType: string;
  target?: "_blank" | "_self" | "_parent" | "_top";
  disabled?: boolean;
  arrow?: boolean;
  children?: ReactNode;
  onClick?: (
    e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>,
  ) => void;
  type?: "button" | "submit" | "reset";
}

export default function Button({
  href,
  text,
  btnType,
  target,
  disabled,
  arrow,
  children,
  onClick,
  type = "button",
}: Props) {
  const content = text || children;

  if (href) {
    const isHashLink = href.startsWith("#");

    if (isHashLink) {
      return (
        <a
          href={href}
          onClick={onClick}
          className={`${styles.btn} ${styles[btnType]}`}
        >
          {content}
          {arrow && (
            <div className={styles.arrowContainer}>
              <Arrow className={styles.arrow} />
            </div>
          )}
        </a>
      );
    }

    return (
      <Link
        href={href}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
        onClick={onClick as any}
        className={`${styles.btn} ${styles[btnType]}`}
      >
        {content}
        {arrow && (
          <div className={styles.arrowContainer}>
            <Arrow className={styles.arrow} />
          </div>
        )}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={`${styles.btn} ${styles[btnType]}`}
      disabled={disabled}
      onClick={onClick}
    >
      {content}
      {arrow && (
        <div className={styles.arrowContainer}>
          <Arrow className={styles.arrow} />
        </div>
      )}
    </button>
  );
}