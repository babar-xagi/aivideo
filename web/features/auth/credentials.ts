export function readCredentials(
  formData: FormData,
  minimumPasswordLength: number,
) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.includes("@") ||
    email.length > 254 ||
    password.length < minimumPasswordLength
  ) {
    return null;
  }

  return { email: email.trim(), password };
}
