import { RiArrowLeftLine } from "@remixicon/react";
import { Separator } from "@shared/ui/separator";
import { Footer } from "@widgets/footer";
import { Header } from "@widgets/header";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "서비스 이용약관",
};

const CLAUSES = [
  { id: "t-1", title: "제1조 (목적)", short: "목적" },
  { id: "t-2", title: "제2조 (용어의 정의)", short: "용어의 정의" },
  {
    id: "t-3",
    title: "제3조 (약관의 게시와 개정)",
    short: "약관의 게시와 개정",
  },
  { id: "t-4", title: "제4조 (이용계약의 체결)", short: "이용계약의 체결" },
  { id: "t-5", title: "제5조 (회원 정보의 관리)", short: "회원 정보의 관리" },
  { id: "t-6", title: "제6조 (운영자의 의무)", short: "운영자의 의무" },
  { id: "t-7", title: "제7조 (회원의 의무)", short: "회원의 의무" },
  {
    id: "t-8",
    title: "제8조 (서비스의 제공 및 변경)",
    short: "서비스의 제공 및 변경",
  },
  {
    id: "t-9",
    title: "제9조 (서비스 이용의 제한)",
    short: "서비스 이용의 제한",
  },
  {
    id: "t-10",
    title: "제10조 (게시물의 관리 및 권리)",
    short: "게시물의 관리 및 권리",
  },
  { id: "t-11", title: "제11조 (면책조항)", short: "면책조항" },
  { id: "t-12", title: "제12조 (계약 해지)", short: "계약 해지" },
  { id: "t-13", title: "제13조 (준거법 및 관할)", short: "준거법 및 관할" },
  { id: "t-14", title: "제14조 (시행일)", short: "시행일" },
];

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-8 p-6">
        <Link
          className="inline-flex w-fit items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
          href="/"
        >
          <RiArrowLeftLine />
          <span>홈으로</span>
        </Link>

        <header className="flex flex-col gap-2">
          <h1 className="font-heading font-medium text-2xl">서비스 이용약관</h1>
          <p className="text-muted-foreground text-sm">
            시행일: 2026년 4월 16일
          </p>
        </header>

        <nav aria-label="목차" className="rounded-md border p-4">
          <h2 className="mb-3 font-medium text-muted-foreground text-xs">
            목차
          </h2>
          <ol className="grid list-decimal gap-x-6 gap-y-1 pl-5 text-sm sm:grid-cols-2">
            {CLAUSES.map((clause) => (
              <li key={clause.id}>
                <a
                  className="underline-offset-4 hover:underline"
                  href={`#${clause.id}`}
                >
                  {clause.short}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="flex flex-col gap-8 text-sm leading-relaxed">
          <section aria-labelledby="t-1" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="t-1">
              제1조 (목적)
            </h2>
            <p>
              본 약관은 claude-hunt(이하 "서비스")가 제공하는 Claude Code
              클래스(수강 기수) 프로젝트 쇼케이스 서비스의 이용과 관련하여,
              운영자와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을
              규정하는 것을 목적으로 합니다.
            </p>
          </section>

          <section aria-labelledby="t-2" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="t-2">
              제2조 (용어의 정의)
            </h2>
            <p>본 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
            <ul className="list-disc pl-5">
              <li>
                <strong>회원</strong>: 본 서비스에 로그인(OAuth 또는 이메일 매직
                링크)하고 온보딩을 완료한 이용자
              </li>
              <li>
                <strong>게시물</strong>: 회원이 서비스에 제출한 프로젝트 정보,
                태그라인, 스크린샷 등 일체의 콘텐츠
              </li>
              <li>
                <strong>클래스</strong>: 운영자가 운영하는 강의 그룹(수강 기수)
              </li>
            </ul>
          </section>

          <section aria-labelledby="t-3" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="t-3">
              제3조 (약관의 게시와 개정)
            </h2>
            <p>
              운영자는 본 약관을 서비스 내 페이지(/terms)에 게시합니다. 운영자는
              관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있으며,
              약관이 개정되는 경우 적용일자 및 개정 사유를 명시하여{" "}
              <strong>시행 7일 전</strong>부터 공지합니다. 다만 회원에게
              불리하게 개정되는 경우에는 <strong>시행 30일 전</strong>부터
              공지합니다.
            </p>
          </section>

          <section aria-labelledby="t-4" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="t-4">
              제4조 (이용계약의 체결)
            </h2>
            <p>
              이용계약은 이용자가 OAuth(GitHub, Google) 또는 이메일 매직 링크로
              로그인하고, 온보딩 단계에서 닉네임과 클래스를 설정한 시점에
              성립합니다.
            </p>
          </section>

          <section aria-labelledby="t-5" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="t-5">
              제5조 (회원 정보의 관리)
            </h2>
            <p>
              회원의 닉네임은 서비스 전체에서 고유해야 합니다. 회원은 설정
              페이지에서 언제든 닉네임을 수정할 수 있으며, 타인에게 오인을 주는
              닉네임의 사용이 확인될 경우 운영자는 수정을 요청하거나 해당
              닉네임의 사용을 제한할 수 있습니다.
            </p>
          </section>

          <section aria-labelledby="t-6" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="t-6">
              제6조 (운영자의 의무)
            </h2>
            <p>
              운영자는 서비스를 안정적이고 지속적으로 제공하기 위해 노력하며,
              회원의 개인정보를 본 서비스의 개인정보 처리방침에 따라 보호합니다.
            </p>
          </section>

          <section aria-labelledby="t-7" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="t-7">
              제7조 (회원의 의무)
            </h2>
            <p>회원은 다음 행위를 하여서는 안 됩니다.</p>
            <ul className="list-disc pl-5">
              <li>
                허위 정보 또는 타인의 정보를 도용하여 회원으로 가입하는 행위
              </li>
              <li>
                타인의 저작권, 상표권 등 지적재산권 및 그 밖의 권리를 침해하는
                게시물을 제출하는 행위
              </li>
              <li>
                자동화된 수단 또는 다수 계정을 동원해 추천(업보트)을 조작하는
                어뷰징 행위
              </li>
              <li>
                서비스의 정상적인 운영을 방해하거나 서비스 인프라에 부하를
                유발하는 행위
              </li>
            </ul>
          </section>

          <section aria-labelledby="t-8" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="t-8">
              제8조 (서비스의 제공 및 변경)
            </h2>
            <p>
              본 서비스는 무료로 제공됩니다. 운영자는 서비스의 품질 개선, 기술적
              필요성, 정기 점검 등의 사유로 서비스의 일부 또는 전부를 변경하거나
              일시 중단할 수 있습니다.
            </p>
          </section>

          <section aria-labelledby="t-9" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="t-9">
              제9조 (서비스 이용의 제한)
            </h2>
            <p>
              운영자는 회원이 본 약관의 의무를 위반하거나 서비스의 정상적 운영을
              방해한 경우, 게시물을 삭제하거나 해당 회원의 이용을 일시 정지 또는
              영구 탈퇴 처리할 수 있습니다.
            </p>
          </section>

          <section aria-labelledby="t-10" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="t-10">
              제10조 (게시물의 관리 및 권리)
            </h2>
            <p>
              회원이 제출한 게시물의 저작권은 해당 회원에게 귀속됩니다. 다만
              회원은 서비스 내에서 게시물이 정상적으로 노출되고 공유될 수 있도록
              운영자에게 서비스 운영 목적 범위 내의 비독점적, 무상 이용
              허락(디스플레이, 미리보기, 섬네일 생성 등)을 부여합니다.
            </p>
          </section>

          <section aria-labelledby="t-11" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="t-11">
              제11조 (면책조항)
            </h2>
            <p>
              본 서비스는 무상으로 제공되는 개인 운영 서비스이며, 운영자는
              천재지변, 불가항력, 제3자가 제공하는 인프라(호스팅·인증 등)의
              장애로 인한 손해에 대하여 책임을 지지 않습니다. 회원이 서비스에
              제출한 게시물의 내용 및 타 회원의 게시물로 인해 발생한 분쟁에
              대해서도 운영자는 책임을 지지 않습니다.
            </p>
          </section>

          <section aria-labelledby="t-12" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="t-12">
              제12조 (계약 해지)
            </h2>
            <p>
              회원은 설정 페이지의 "계정 삭제" 기능을 통해 언제든 이용계약을
              해지(회원 탈퇴)할 수 있습니다. 탈퇴 즉시 회원의 개인정보와
              게시물은 개인정보 처리방침에 따라 파기됩니다.
            </p>
          </section>

          <section aria-labelledby="t-13" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="t-13">
              제13조 (준거법 및 관할)
            </h2>
            <p>
              본 약관은 <strong>대한민국</strong> 법률을 준거법으로 하며, 본
              서비스의 이용과 관련하여 운영자와 회원 사이에 발생한 분쟁에
              대해서는 <strong>서울중앙지방법원</strong>을 전속 관할 법원으로
              합니다.
            </p>
          </section>

          <section aria-labelledby="t-14" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="t-14">
              제14조 (시행일)
            </h2>
            <p>본 약관은 2026년 4월 16일부터 시행됩니다.</p>
          </section>
        </article>

        <Separator />

        <aside
          aria-label="문의"
          className="flex flex-col gap-1 rounded-md border p-4 text-sm"
        >
          <span className="font-medium">문의</span>
          <span className="text-muted-foreground">
            운영자: toycrane (개인 운영)
          </span>
          <span className="text-muted-foreground">
            이메일: alwaysfun2183@gmail.com
          </span>
          <span className="mt-1 text-muted-foreground text-xs">
            시행일: 2026-04-16
          </span>
        </aside>
      </main>
      <Footer />
    </>
  );
}
