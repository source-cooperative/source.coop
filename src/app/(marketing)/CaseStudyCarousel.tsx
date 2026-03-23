"use client";

import { useState } from "react";
import { Blockquote, Box, Flex, Link, Text } from "@radix-ui/themes";
import styles from "./Landing.module.css";

const CASE_STUDIES = [
  {
    content:
      "We can solve this question for ourselves, but the point of our work is to bring the world's attention to these rural communities and their needs. We want to make sure the data we develop and the insights we generate are accessible to other organizations and people. That's what brought us to Source.",
    byline:
      "— Cameron Kruse, Bridges to Prosperity Director of Digital Technology",
    url: "https://docs.source.coop/case-studies/bridges-to-prosperity",
  },
  {
    content:
      "I value Source Cooperative as a scalable, practically unlimited in size, data store for open data. I could store the data in a commercial account that I manage, but I prefer using a well-known, discoverable space for storage. I like using Source when it's for a broader public good, one which provides public usefulness.",
    byline: "— Alex Leith, Auspatious Founder",
    url: "https://docs.source.coop/case-studies/auspatious",
  },
  {
    content:
      "Source has allowed us to open up all of this data to really anybody in the world… we would have been hesitant to do this without Source. We get people from local communities, indigenous groups, and others from almost every continent, who have reached out to us about this data.",
    byline: '— Tom "Hutch" Ingold, Earth Genome, CTO',
    url: "https://docs.source.coop/case-studies/earth-genome",
  },
];

// All slides share a fixed height so the track translation math stays simple.
// Increase if the longest quote ever overflows.
const SLIDE_H = 260;
const PEEK = Math.round(SLIDE_H * 0.2); // 52px visible above and below

export function CaseStudyCarousel() {
  const [index, setIndex] = useState(0);

  const canPrev = index > 0;
  const canNext = index < CASE_STUDIES.length - 1;

  const goPrev = () => canPrev && setIndex((i) => i - 1);
  const goNext = () => canNext && setIndex((i) => i + 1);

  // Shift the track so the active slide sits below the top peek slot
  const trackY = PEEK - index * SLIDE_H;

  return (
    <Flex align="center" gap="4" flexBasis="50%" width="100%">
      {/* Clipping viewport */}
      <Box
        className={styles.carouselViewport}
        style={{ height: SLIDE_H + PEEK * 2 }}
      >
        {/* Sliding track */}
        <Box
          className={styles.carouselTrack}
          style={{ transform: `translateY(${trackY}px)` }}
        >
          {CASE_STUDIES.map((study, i) => (
            <Box
              key={i}
              className={styles.caseStudy}
              p="4"
              mb="4"
              style={{
                height: SLIDE_H,
                overflow: "hidden",
                opacity: i === index ? 1 : 0.3,
                transition: "opacity 0.4s ease",
              }}
            >
              <Blockquote size="2" mb="2">
                &quot;{study.content}&quot;
              </Blockquote>
              <Text weight="bold" size="2" as="p" mb="1">
                {study.byline}
              </Text>
              <Link
                href={study.url}
                target="_blank"
                rel="noopener noreferrer"
                size="1"
              >
                Read case study &rarr;
              </Link>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Arrows — outside the viewport, vertically centered by the parent Flex */}
      <Flex direction="column" gap="3" className={styles.carouselArrows}>
        <Text
          size="7"
          onClick={goPrev}
          aria-label="Previous quote"
          style={{ opacity: canPrev ? 1 : 0.25, cursor: canPrev ? "pointer" : "default" }}
        >
          ↑
        </Text>
        <Text
          size="7"
          onClick={goNext}
          aria-label="Next quote"
          style={{ opacity: canNext ? 1 : 0.25, cursor: canNext ? "pointer" : "default" }}
        >
          ↓
        </Text>
      </Flex>
    </Flex>
  );
}
