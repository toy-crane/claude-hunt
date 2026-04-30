import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ImageGallery } from "./image-gallery";

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    "data-testid": dataTestId,
  }: {
    alt: string;
    src: string;
    "data-testid"?: string;
  }) => (
    <div aria-label={alt} data-src={src} data-testid={dataTestId} role="img" />
  ),
}));

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

  it("advances to the next image when the right arrow is clicked", () => {
    render(<ImageGallery imageUrls={["a.png", "b.png", "c.png"]} title="X" />);
    fireEvent.click(screen.getByTestId("project-detail-gallery-next"));
    expect(screen.getByTestId("project-detail-primary-image")).toHaveAttribute(
      "data-src",
      "b.png"
    );
  });

  it("wraps from the last image to the first when the right arrow is clicked at the end", () => {
    render(<ImageGallery imageUrls={["a.png", "b.png"]} title="X" />);
    const next = screen.getByTestId("project-detail-gallery-next");
    fireEvent.click(next); // → b
    fireEvent.click(next); // → wrap to a
    expect(screen.getByTestId("project-detail-primary-image")).toHaveAttribute(
      "data-src",
      "a.png"
    );
  });

  it("wraps from the first image to the last when the left arrow is clicked at the start", () => {
    render(<ImageGallery imageUrls={["a.png", "b.png"]} title="X" />);
    fireEvent.click(screen.getByTestId("project-detail-gallery-prev"));
    expect(screen.getByTestId("project-detail-primary-image")).toHaveAttribute(
      "data-src",
      "b.png"
    );
  });

  it("jumps to a specific image when its thumbnail is clicked", () => {
    render(<ImageGallery imageUrls={["a.png", "b.png", "c.png"]} title="X" />);
    const thumbs = screen.getAllByTestId("project-detail-gallery-thumb");
    fireEvent.click(thumbs[2] as HTMLElement);
    expect(screen.getByTestId("project-detail-primary-image")).toHaveAttribute(
      "data-src",
      "c.png"
    );
  });
});
