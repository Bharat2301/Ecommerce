"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { useApi } from "@/hooks/useApi";
import api from "@/utils/api";
import { validateEmail } from "@/utils/validation";

export default function VerifyEmail() {
  const [status, setStatus] = useState("verifying");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [resending, setResending] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loading, handleRequest } = useApi();

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token");
      const emailParam = searchParams.get("email");

      if (!token || !emailParam) {
        setStatus("manual");
        setEmail(emailParam || "");
        toast.error("Invalid or missing verification link.");
        return;
      }

      try {
        const response = await handleRequest(
          api.post("/api/auth/verify-email", { email: emailParam, token })
        );
        if (response.success) {
          setStatus("success");
          toast.success("Email verified successfully!");
          setTimeout(() => router.push("/"), 2000);
        }
      } catch (err) {
        setStatus("error");
        toast.error(err.response?.data?.error || "Failed to verify email");
      }
    };
    verifyEmail();
  }, [searchParams, router, handleRequest]);

  const handleResendVerification = async () => {
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      toast.error("Invalid email.");
      return;
    }

    try {
      setResending(true);
      const response = await handleRequest(
        api.post("/api/auth/resend-verification", { email })
      );
      if (response.success) {
        toast.success("Verification email resent!");
        setStatus("manual");
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Failed to resend email.";
      toast.error(errorMessage);
      setEmailError(errorMessage);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md text-center text-black">
        {status === "verifying" && (
          <>
            <h1 className="text-2xl font-bold mb-4">Verifying Your Email</h1>
            <p className="text-gray-600">Please wait...</p>
            <div className="mt-4 flex justify-center">
              <svg
                className="animate-spin h-6 w-6 text-red-600"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z"
                />
              </svg>
            </div>
          </>
        )}
        {status === "success" && (
          <>
            <h1 className="text-2xl font-bold mb-4 text-green-600">Email Verified!</h1>
            <p className="text-gray-600">Redirecting to home...</p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-2xl font-bold mb-4 text-red-600">Verification Failed</h1>
            <p className="text-gray-600 mb-4">Please try again or request a new email.</p>
            <button
              type="button"
              onClick={() => setStatus("manual")}
              className="w-full p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              disabled={loading || resending}
            >
              Request New Email
            </button>
            <p className="mt-4">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-red-600 hover:underline"
              >
                Go to Login
              </button>
            </p>
          </>
        )}
        {status === "manual" && (
          <>
            <h1 className="text-2xl font-bold mb-4">Verify Your Email</h1>
            <p className="text-gray-600 mb-4">
              Enter your email to receive a new verification link.
            </p>
            {emailError && <p className="text-red-600 mb-4">{emailError}</p>}
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError("");
              }}
              className="w-full p-2 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
              disabled={loading || resending}
              aria-label="Email"
            />
            <button
              type="button"
              onClick={handleResendVerification}
              className="w-full p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              disabled={loading || resending}
            >
              {resending ? "Resending..." : "Resend Email"}
            </button>
            <p className="mt-4">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-red-600 hover:underline"
              >
                Go to Login
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
