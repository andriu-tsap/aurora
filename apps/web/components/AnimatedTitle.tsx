"use client";
import { motion } from "framer-motion";
export default function AnimatedTitle({
  title,
  accent,
}: {
  title: string;
  accent: string;
}) {
  return (
    <>
      {title.split(" ").map((word, i) => (
        <motion.span
          key={word}
          initial={{ y: 14 }}
          animate={{ y: 0 }}
          transition={{
            duration: 0.65,
            delay: i * 0.09,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {word}
          {i < title.split(" ").length - 1 ? "\u00a0" : ""}
        </motion.span>
      ))}
      <br />
      <motion.em
        initial={{ y: 18 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      >
        {accent}
      </motion.em>
    </>
  );
}
