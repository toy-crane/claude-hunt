import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ImageGallery } from "./image-gallery";

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    className,
    "data-testid": dataTestId,
    "data-active": dataActive,
    "aria-hidden": ariaHidden,
  }: {
    alt: string;
    src: string;
    className?: string;
    "data-testid"?: string;
    "data-active"?: string;
    "aria-hidden"?: boolean;
  }) => (
    <div
      aria-hidden={ariaHidden}
      aria-label={alt}
      className={className}
      data-active={dataActive}
      data-src={src}
      data-testid={dataTestId}
      role="img"
    />
  ),
}));

function allSlides() {
  return screen.getAllByTestId("project-detail-primary-image");
}

function activeSlide() {
  const slide = allSlides().find(
    (el) => el.getAttribute("data-active") === "true"
  );
  if (!slide) {
    throw new Error("no active slide found");
  }
  return slide;
}

describe("<ImageGallery />", () => {
  it("renders nothing when there are no images", () => {
    const { container } = render(<ImageGallery imageUrls={[]} title="X" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders only the primary image when there is exactly one", () => {
    render(<ImageGallery imageUrls={["a.png"]} title="X" />);
    expect(
      screen.getByTestId("project-detail-primary-image")
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("project-detail-gallery-strip")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("project-detail-gallery-prev")
    ).not.toBeInTheDocument();
  });

  it("renders the thumb strip and arrows when there are multiple images", () => {
    render(<ImageGallery imageUrls={["a.png", "b.png", "c.png"]} title="X" />);
    expect(
      screen.getByTestId("project-detail-gallery-strip")
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("project-detail-gallery-thumb")).toHaveLength(
      3
    );
    expect(
      screen.getByTestId("project-detail-gallery-prev")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("project-detail-gallery-next")
    ).toBeInTheDocument();
  });

  it("keeps every slide mounted, marking one active and hiding the rest from assistive tech", () => {
    render(<ImageGallery imageUrls={["a.png", "b.png", "c.png"]} title="X" />);
    const slides = allSlides();
    expect(slides).toHaveLength(3);
    const active = slides.filter(
      (el) => el.getAttribute("data-active") === "true"
    );
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveAttribute("data-src", "a.png");
    for (const slide of slides) {
      if (slide === active[0]) {
        expect(slide).not.toHaveAttribute("aria-hidden");
      } else {
        expect(slide).toHaveAttribute("aria-hidden", "true");
        expect(slide.className).toContain("opacity-0");
      }
    }
  });

  it("cross-fades slides via opacity classes instead of swapping the image source", () => {
    render(<ImageGallery imageUrls={["a.png", "b.png"]} title="X" />);
    expect(activeSlide().className).toContain("opacity-100");
    expect(activeSlide().className).toContain("transition-opacity");
    fireEvent.click(screen.getByTestId("project-detail-gallery-next"));
    const first = allSlides().find(
      (el) => el.getAttribute("data-src") === "a.png"
    );
    expect(first?.className).toContain("opacity-0");
    expect(activeSlide()).toHaveAttribute("data-src", "b.png");
  });

  it("gives the arrows press feedback via the shared scale vocabulary", () => {
    render(<ImageGallery imageUrls={["a.png", "b.png"]} title="X" />);
    expect(
      screen.getByTestId("project-detail-gallery-prev").className
    ).toContain("active:scale-[0.97]");
    expect(
      screen.getByTestId("project-detail-gallery-next").className
    ).toContain("active:scale-[0.97]");
  });

  it("advances to the next image when the right arrow is clicked", () => {
    render(<ImageGallery imageUrls={["a.png", "b.png", "c.png"]} title="X" />);
    fireEvent.click(screen.getByTestId("project-detail-gallery-next"));
    expect(activeSlide()).toHaveAttribute("data-src", "b.png");
  });

  it("wraps from the last image to the first when the right arrow is clicked at the end", () => {
    render(<ImageGallery imageUrls={["a.png", "b.png"]} title="X" />);
    const next = screen.getByTestId("project-detail-gallery-next");
    fireEvent.click(next); // → b
    fireEvent.click(next); // → wrap to a
    expect(activeSlide()).toHaveAttribute("data-src", "a.png");
  });

  it("wraps from the first image to the last when the left arrow is clicked at the start", () => {
    render(<ImageGallery imageUrls={["a.png", "b.png"]} title="X" />);
    fireEvent.click(screen.getByTestId("project-detail-gallery-prev"));
    expect(activeSlide()).toHaveAttribute("data-src", "b.png");
  });

  it("jumps to a specific image when its thumbnail is clicked", () => {
    render(<ImageGallery imageUrls={["a.png", "b.png", "c.png"]} title="X" />);
    const thumbs = screen.getAllByTestId("project-detail-gallery-thumb");
    fireEvent.click(thumbs[2] as HTMLElement);
    expect(activeSlide()).toHaveAttribute("data-src", "c.png");
  });
});
