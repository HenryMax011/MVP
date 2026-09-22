export const SIGNUP_EMAIL_COOKIE = "financias_signup_email";
export const RESET_EMAIL_COOKIE = "financias_reset_email";
export const RESET_TICKET_COOKIE = "financias_reset_ticket";
export const NEXT_PATH_COOKIE = "financias_next";
export const FLASH_COOKIE = "financias_flash";

export function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const visible = user.slice(0, 1);
  return `${visible}***@${domain}`;
}
