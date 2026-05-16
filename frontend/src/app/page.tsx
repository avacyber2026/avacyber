"use client";

import { useToast } from "@/hooks/useToast";
import { Box, VStack, Button, Input, Text } from "@/ui";
import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { setAppAuthCookie } from "@/lib/authCookies";
import PasswordInput from "@/Components/PasswordInput";
import styles from "@/styles/Auth.module.css";
import { useLanguage } from "@/contexts/LanguageContext";

type Mode = "login" | "register";

const inputStyles = "h-[52px] !rounded-[18px] border border-[#1F6A5C]/20 bg-white text-[15px] placeholder-[#1F6A5C]/50 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 focus:outline-none";

export default function Home() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [eError, setEError] = useState("");
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [pError, setPError] = useState("");
  const [pConfirmError, setPConfirmError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  function clearErrors() {
    setEError("");
    setFirstNameError("");
    setLastNameError("");
    setPError("");
    setPConfirmError("");
    setSuccessMsg("");
  }

  async function auth() {
    setLoading(true);
    clearErrors();
    if (email.trim() === "") {
      setEError(t("auth.emailError"));
      setLoading(false);
      return;
    }
    if (password === "") {
      setPError(t("auth.passwordError"));
      setLoading(false);
      return;
    }
    if (mode === "register") {
      if (!firstName.trim()) {
        setFirstNameError(t("auth.firstNameRequired"));
        setLoading(false);
        return;
      }
      if (!lastName.trim()) {
        setLastNameError(t("auth.lastNameRequired"));
        setLoading(false);
        return;
      }
      if (password !== passwordConfirm) {
        setPConfirmError(t("auth.passwordsDoNotMatch"));
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setPError(t("auth.passwordMinLength"));
        setLoading(false);
        return;
      }
    }
    try {
      if (mode === "login") {
        const { data } = await api.post("/auth/login", { email: email.trim(), password });
        if (typeof window !== "undefined") {
          localStorage.removeItem("adminToken");
          localStorage.removeItem("adminUser");
          localStorage.setItem("token", data.token);
          localStorage.setItem("status", data.user.role);
          localStorage.setItem("user", JSON.stringify(data.user));
          setAppAuthCookie(data.token);
        }
        router.push("/tickets");
      } else {
        await api.post("/auth/register", {
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          password,
          passwordConfirm,
        });
        setMode("login");
        setFirstName("");
        setLastName("");
        setPassword("");
        setPasswordConfirm("");
        setEError("");
        setFirstNameError("");
        setLastNameError("");
        setPError("");
        setPConfirmError("");
        setSuccessMsg("Registration successful. You can sign in.");
      }
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { error?: string; code?: string; rejection_comment?: string | null } } })?.response?.data;
      const msg = res?.error || "Request failed";
      if (res?.code === "NOT_APPROVED") {
        const description = res.rejection_comment
          ? `Your account has not been approved. Reason: ${res.rejection_comment}`
          : "Your account has not been approved yet. Please wait for an administrator to approve it.";
        toast({ title: "Account not approved", description, status: "warning", duration: 8000 });
        return;
      }
      if (msg.includes("User not found") || msg.includes("not found")) setEError("There is no such user");
      else if (msg.includes("already exists")) setEError("User with this email already exists");
      else if (msg.includes("Invalid email format")) setEError(msg);
      else if (msg.includes("First name and last name are required")) {
        setFirstNameError(t("auth.firstNameRequired"));
        setLastNameError(t("auth.lastNameRequired"));
      } else if (msg.includes("Passwords do not match")) setPConfirmError(msg);
      else if (msg.includes("password") || msg.includes("Invalid")) setPError("Incorrect password");
      else setEError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.root + " authPageRoot"}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.orb + " " + styles.orb1} aria-hidden />
      <div className={styles.orb + " " + styles.orb2} aria-hidden />
      <div className={styles.orb + " " + styles.orb3} aria-hidden />

      <Box className={styles.card}>
        <Text className={styles.title}>AVA cyber</Text>
        <Text className={styles.subtitle}>
          {mode === "login" ? t("auth.signInTitle") : t("auth.createAccountTitle")}
        </Text>

        <VStack as="div" className={styles.form} align="stretch" spacing={4}>
          {mode === "register" && (
            <>
              <div className={styles.fieldGroup}>
                <Input
                  required
                  placeholder={`${t("auth.firstName")} *`}
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setFirstNameError("");
                  }}
                  isInvalid={!!firstNameError}
                  className={inputStyles}
                />
                {firstNameError && <Text className={styles.errorText}>{firstNameError}</Text>}
              </div>
              <div className={styles.fieldGroup}>
                <Input
                  required
                  placeholder={`${t("auth.lastName")} *`}
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    setLastNameError("");
                  }}
                  isInvalid={!!lastNameError}
                  className={inputStyles}
                />
                {lastNameError && <Text className={styles.errorText}>{lastNameError}</Text>}
              </div>
            </>
          )}
          <div className={styles.fieldGroup}>
            <Input
              placeholder={t("auth.email")}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEError("");
                setSuccessMsg("");
              }}
              isInvalid={!!eError}
              className={inputStyles}
            />
            {eError && <Text className={styles.errorText}>{eError}</Text>}
            {successMsg && <Text className={styles.successText}>{successMsg}</Text>}
          </div>

          <div className={styles.fieldGroup}>
            <PasswordInput
              placeholder={t("auth.password")}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPError("");
              }}
              isInvalid={!!pError}
              className={inputStyles}
            />
            {pError && <Text className={styles.errorText}>{pError}</Text>}
          </div>

          {mode === "register" && (
            <div className={styles.fieldGroup}>
              <PasswordInput
                placeholder={t("auth.confirmPassword")}
                value={passwordConfirm}
                onChange={(e) => {
                  setPasswordConfirm(e.target.value);
                  setPConfirmError("");
                }}
                isInvalid={!!pConfirmError}
                className={inputStyles}
              />
              {pConfirmError && <Text className={styles.errorText}>{pConfirmError}</Text>}
            </div>
          )}

          <Button
            isLoading={loading}
            className="w-full h-[52px] !rounded-[18px] bg-brand-primary text-white text-[15px] font-semibold mt-2"
            onClick={() => auth()}
          >
            {mode === "login" ? t("auth.signIn") : t("auth.register")}
          </Button>

          <Text
            className={styles.toggle}
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              clearErrors();
              setFirstName("");
              setLastName("");
              setPassword("");
              setPasswordConfirm("");
            }}
          >
            {mode === "login" ? t("auth.createAccount") : t("auth.backToSignIn")}
          </Text>
        </VStack>
      </Box>
    </main>
  );
}
