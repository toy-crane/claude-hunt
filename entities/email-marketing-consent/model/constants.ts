export const EMAIL_MARKETING_CONSENT_VERSION = "2026-09-03";

export const EMAIL_NEWS_DESCRIPTION =
  "클로드를 더 잘 활용하는 데 도움이 되는 뉴스레터와 새로운 강의·이벤트 소식을 이메일로 보내드려요.";

export const EMAIL_NEWS_SETTINGS_DESCRIPTION =
  "클로드를 더 잘 활용하는 데 도움이 되는 뉴스레터와 새로운 강의·이벤트 소식을 보내드려요.";

export const EMAIL_MARKETING_CONSENT_DETAILS = [
  {
    label: "이용 목적",
    value: "클로드 신규 기능 및 활용 콘텐츠, 강의·이벤트 안내",
  },
  { label: "수집·이용 항목", value: "이메일 주소" },
  { label: "보유 기간", value: "동의 철회 또는 회원 탈퇴 시까지" },
  {
    label: "동의 거부",
    value: "동의하지 않아도 Claude Hunt를 이용할 수 있습니다.",
  },
  { label: "철회 방법", value: "설정 또는 이메일의 수신거부 링크" },
] as const;
