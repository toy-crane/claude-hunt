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
          높이의 단일 진실 공급원은 globals.css의 --header-height(반응형 94/57px). */}
      <div className="pt-[var(--header-height)]">{children}</div>
      <Footer />
    </>
  );
}
