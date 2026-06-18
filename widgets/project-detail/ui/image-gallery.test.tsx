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

  it("renders only the primary image with no thumbnails when there is exactly one", () => {
    render(<ImageGallery imageUrls={["a.png"]} title="X" />);
    expect(
      screen.getByTestId("project-detail-primary-image")
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("project-detail-gallery-thumb")
    ).not.toBeInTheDocument();
  });

  it("renders one thumbnail per image when there are multiple", () => {
    render(<ImageGallery imageUrls={["a.png", "b.png", "c.png"]} title="X" />);
    expect(screen.getAllByTestId("project-detail-gallery-thumb")).toHaveLength(
      3
    );
  });

  it("jumps the primary image to a thumbnail when it is clicked", () => {
    render(<ImageGallery imageUrls={["a.png", "b.png", "c.png"]} title="X" />);
    const thumbs = screen.getAllByTestId("project-detail-gallery-thumb");
    fireEvent.click(thumbs[2] as HTMLElement);
    expect(screen.getByTestId("project-detail-primary-image")).toHaveAttribute(
      "data-src",
      "c.png"
    );
  });

  it("marks the active thumbnail with aria-current", () => {
    render(<ImageGallery imageUrls={["a.png", "b.png"]} title="X" />);
    const thumbs = screen.getAllByTestId("project-detail-gallery-thumb");
    expect(thumbs[0]).toHaveAttribute("aria-current", "true");
    expect(thumbs[1]).toHaveAttribute("aria-current", "false");

    fireEvent.click(thumbs[1] as HTMLElement);
    expect(thumbs[0]).toHaveAttribute("aria-current", "false");
    expect(thumbs[1]).toHaveAttribute("aria-current", "true");
  });

  it("forwards the className to the gallery root for grid placement", () => {
    render(
      <ImageGallery
        className="lg:col-start-1"
        imageUrls={["a.png"]}
        title="X"
      />
    );
    expect(screen.getByTestId("project-detail-gallery").className).toContain(
      "lg:col-start-1"
    );
  });
});
