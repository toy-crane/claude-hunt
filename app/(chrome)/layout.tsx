import { Footer } from "@widgets/footer";
import { Header } from "@widgets/header";

export default function ChromeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      {/* Header는 position: fixed라 흐름에서 빠져 공간을 차지하지 않는다(이유는
          widgets/header/ui/header.tsx). 본문을 헤더 높이만큼 내려 가림을 막는다.
          모바일은 2줄(94px), md 이상은 1줄(57px) — 헤더 구조가 바뀌면 함께 갱신. */}
      <div className="pt-[94px] md:pt-[57px]">{children}</div>
      <Footer />
    </>
  );
}
