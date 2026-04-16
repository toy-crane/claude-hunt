import { RiArrowLeftLine } from "@remixicon/react";
import { Separator } from "@shared/ui/separator";
import { Footer } from "@widgets/footer";
import { Header } from "@widgets/header";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보 처리방침",
};

const SECTIONS = [
  {
    id: "p-1",
    title: "1. 개인정보의 처리 목적",
    short: "개인정보의 처리 목적",
  },
  {
    id: "p-2",
    title: "2. 처리하는 개인정보 항목",
    short: "처리하는 개인정보 항목",
  },
  {
    id: "p-3",
    title: "3. 개인정보의 처리 및 보유 기간",
    short: "개인정보의 처리 및 보유 기간",
  },
  {
    id: "p-4",
    title: "4. 개인정보의 제3자 제공",
    short: "개인정보의 제3자 제공",
  },
  {
    id: "p-5",
    title: "5. 개인정보 처리의 위탁",
    short: "개인정보 처리의 위탁",
  },
  {
    id: "p-6",
    title: "6. 정보주체의 권리와 행사 방법",
    short: "정보주체의 권리와 행사 방법",
  },
  {
    id: "p-7",
    title: "7. 개인정보의 파기 절차 및 방법",
    short: "개인정보의 파기 절차 및 방법",
  },
  {
    id: "p-8",
    title: "8. 개인정보의 안전성 확보 조치",
    short: "개인정보의 안전성 확보 조치",
  },
  {
    id: "p-9",
    title: "9. 자동으로 수집되는 개인정보 (쿠키 등)",
    short: "자동으로 수집되는 개인정보 (쿠키 등)",
  },
  {
    id: "p-10",
    title: "10. 개인정보 보호책임자",
    short: "개인정보 보호책임자",
  },
  { id: "p-11", title: "11. 권익침해 구제방법", short: "권익침해 구제방법" },
  {
    id: "p-12",
    title: "12. 개인정보 처리방침의 변경",
    short: "개인정보 처리방침의 변경",
  },
];

const PERSONAL_DATA_ITEMS = [
  { label: "이메일", detail: "회원 식별 및 로그인(매직 링크)" },
  { label: "OAuth 식별자", detail: "GitHub, Google 로그인 식별" },
  { label: "닉네임", detail: "서비스 내 표시 이름" },
  { label: "프로필 이미지", detail: "아바타 표시 (선택)" },
  { label: "소속 클래스", detail: "수강 기수 식별" },
  {
    label: "프로젝트",
    detail: "회원이 제출한 제목, URL, 태그라인, 스크린샷",
  },
  { label: "투표 기록", detail: "프로젝트 업보트 집계" },
  { label: "IP 주소", detail: "접속 로그 (서비스 운영용)" },
  { label: "User-Agent", detail: "접속 로그 (서비스 운영용)" },
];

const PROCESSORS = [
  { name: "Supabase", purpose: "인증, 데이터베이스, 스토리지" },
  { name: "Vercel", purpose: "호스팅 및 배포" },
  { name: "Google", purpose: "OAuth 인증 제공" },
  { name: "GitHub", purpose: "OAuth 인증 제공" },
];

const REMEDY_CHANNELS = [
  { name: "개인정보분쟁조정위원회", contact: "1833-6972 (www.kopico.go.kr)" },
  { name: "개인정보침해신고센터", contact: "118 (privacy.kisa.or.kr)" },
  { name: "대검찰청", contact: "1301 (www.spo.go.kr)" },
  { name: "경찰청", contact: "182 (ecrm.cyber.go.kr)" },
];

export default function PrivacyPage() {
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
          <h1 className="font-heading font-medium text-2xl">
            개인정보 처리방침
          </h1>
          <p className="text-muted-foreground text-sm">
            시행일: 2026년 4월 16일
          </p>
        </header>

        <nav aria-label="목차" className="rounded-md border p-4">
          <p className="mb-3 font-medium text-muted-foreground text-xs">목차</p>
          <ol className="grid list-decimal gap-x-6 gap-y-1 pl-5 text-sm sm:grid-cols-2">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  className="underline-offset-4 hover:underline"
                  href={`#${section.id}`}
                >
                  {section.short}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="flex flex-col gap-8 text-sm leading-relaxed">
          <section aria-labelledby="p-1" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="p-1">
              1. 개인정보의 처리 목적
            </h2>
            <p>claude-hunt는 다음의 목적을 위하여 개인정보를 처리합니다.</p>
            <ul className="list-disc pl-5">
              <li>회원 식별 및 인증</li>
              <li>프로젝트 게시 및 업보트 집계</li>
              <li>서비스 품질 개선 및 문의 응대</li>
            </ul>
          </section>

          <section aria-labelledby="p-2" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="p-2">
              2. 처리하는 개인정보 항목
            </h2>
            <p>본 서비스는 회원 가입 및 운영을 위해 다음 항목을 처리합니다.</p>
            <ul className="list-disc pl-5">
              {PERSONAL_DATA_ITEMS.map((item) => (
                <li key={item.label}>
                  <span className="font-medium">{item.label}</span> —{" "}
                  <span className="text-muted-foreground">{item.detail}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="p-3" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="p-3">
              3. 개인정보의 처리 및 보유 기간
            </h2>
            <p>
              회원 탈퇴 시 저장된 개인정보를 <strong>지체 없이</strong>{" "}
              파기합니다. 다만 관계 법령에 따른 보존 의무가 있는 경우에 한해
              해당 기간 동안 보관한 후 파기합니다.
            </p>
          </section>

          <section aria-labelledby="p-4" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="p-4">
              4. 개인정보의 제3자 제공
            </h2>
            <p>
              본 서비스는 회원의 개인정보를{" "}
              <strong>제3자에게 제공하지 않습니다.</strong>
            </p>
          </section>

          <section aria-labelledby="p-5" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="p-5">
              5. 개인정보 처리의 위탁
            </h2>
            <p>
              원활한 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁하고
              있습니다.
            </p>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left font-medium">수탁자</th>
                    <th className="p-2 text-left font-medium">위탁 업무</th>
                  </tr>
                </thead>
                <tbody>
                  {PROCESSORS.map((processor) => (
                    <tr className="border-t" key={processor.name}>
                      <td className="p-2 font-medium">{processor.name}</td>
                      <td className="p-2 text-muted-foreground">
                        {processor.purpose}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="p-6" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="p-6">
              6. 정보주체의 권리와 행사 방법
            </h2>
            <p>회원은 다음 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc pl-5">
              <li>개인정보 열람 및 정정 — 설정 페이지</li>
              <li>개인정보 삭제(회원 탈퇴) — 설정 페이지의 "계정 삭제"</li>
              <li>처리 정지 요구 — 아래 개인정보 보호책임자 이메일로 문의</li>
            </ul>
          </section>

          <section aria-labelledby="p-7" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="p-7">
              7. 개인정보의 파기 절차 및 방법
            </h2>
            <p>
              데이터베이스에 저장된 개인정보는 전자적 파일 형태로 재생 불가능한
              방법으로 삭제하며, 스토리지에 저장된 파일(프로필 이미지,
              스크린샷)은 즉시 제거합니다. 회원 탈퇴 즉시 실행됩니다.
            </p>
          </section>

          <section aria-labelledby="p-8" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="p-8">
              8. 개인정보의 안전성 확보 조치
            </h2>
            <ul className="list-disc pl-5">
              <li>전 구간 HTTPS 전송</li>
              <li>Supabase Row-Level Security(RLS)로 행 단위 접근 통제</li>
              <li>스토리지 및 데이터베이스 서버 측 암호화</li>
              <li>운영자 관리 키의 최소 권한 원칙</li>
            </ul>
          </section>

          <section aria-labelledby="p-9" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="p-9">
              9. 자동으로 수집되는 개인정보 (쿠키 등)
            </h2>
            <p>본 서비스는 다음 자동 수집 수단을 사용합니다.</p>
            <ul className="list-disc pl-5">
              <li>
                <strong>Supabase 인증 세션 쿠키</strong> — 로그인 상태 유지 목적
                (필수)
              </li>
              <li>
                <strong>Vercel Analytics</strong> — 페이지 조회수 등 익명 이용
                통계
              </li>
              <li>
                <strong>Vercel Speed Insights</strong> — Core Web Vitals 등 성능
                지표
              </li>
            </ul>
            <p className="text-muted-foreground">
              자동 수집 수단을 통해 개인 식별 정보를 수집하지 않습니다.
            </p>
          </section>

          <section aria-labelledby="p-10" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="p-10">
              10. 개인정보 보호책임자
            </h2>
            <p>
              회원의 개인정보 관련 문의는 아래 개인정보 보호책임자에게 연락해
              주시기 바랍니다.
            </p>
            <div className="rounded-md border p-3">
              <p>
                <span className="font-medium">성명 / 닉네임:</span> toycrane
              </p>
              <p>
                <span className="font-medium">직책:</span> 개인정보 보호책임자
              </p>
              <p>
                <span className="font-medium">이메일:</span>{" "}
                alwaysfun2183@gmail.com
              </p>
            </div>
          </section>

          <section aria-labelledby="p-11" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="p-11">
              11. 권익침해 구제방법
            </h2>
            <p>
              개인정보 침해로 인한 상담 및 신고는 아래 기관에 문의할 수
              있습니다.
            </p>
            <ul className="list-disc pl-5">
              {REMEDY_CHANNELS.map((channel) => (
                <li key={channel.name}>
                  <span className="font-medium">{channel.name}</span>{" "}
                  <span className="text-muted-foreground">
                    — {channel.contact}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="p-12" className="flex flex-col gap-2">
            <h2 className="font-semibold text-base" id="p-12">
              12. 개인정보 처리방침의 변경
            </h2>
            <p>
              본 처리방침이 변경되는 경우 시행 <strong>7일</strong> 전부터
              공지하며, 회원에게 불리하게 변경되는 경우에는 시행{" "}
              <strong>30일</strong> 전부터 공지합니다.
            </p>
            <p className="text-muted-foreground">
              본 개인정보 처리방침의 시행일: 2026-04-16
            </p>
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
