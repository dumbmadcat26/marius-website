"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import styles from "./ImageGallery.module.css";

export type GalleryImage = {
  src: string;
  alt: string;
};

type Props = {
  images: GalleryImage[];
};

export function ImageGallery({ images }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: images.length > 1 });
  const [index, setIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className={styles.wrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.slideImage} src={images[0].src} alt={images[0].alt} />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.viewport} ref={emblaRef}>
        <div className={styles.container}>
          {images.map((image) => (
            <div className={styles.slide} key={image.src}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.slideImage} src={image.src} alt={image.alt} />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => emblaApi?.scrollPrev()}
          aria-label="Previous image"
        >
          ←
        </button>
        <p className={styles.counter}>
          {index + 1} / {images.length}
        </p>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => emblaApi?.scrollNext()}
          aria-label="Next image"
        >
          →
        </button>
      </div>

      <ul className={styles.thumbs} aria-label="Gallery previews">
        {images.map((image, i) => (
          <li key={image.src}>
            <button
              type="button"
              className={i === index ? styles.thumbActive : styles.thumb}
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.src} alt="" loading="lazy" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
