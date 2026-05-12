import { z } from "zod";

export const DISPLAY_NAME_REQUIRED_MESSAGE = "닉네임을 입력해 주세요.";
export const DISPLAY_NAME_POLICY_MESSAGE =
  "닉네임은 2~12자의 한글, 영문, 숫자, 밑줄(_)만 사용할 수 있어요.";

const DISPLAY_NAME_PATTERN = /^[가-힣a-zA-Z0-9_]{2,12}$/;

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, DISPLAY_NAME_REQUIRED_MESSAGE)
  .regex(DISPLAY_NAME_PATTERN, DISPLAY_NAME_POLICY_MESSAGE);
