"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../stores/authStore";
import { useApi } from "@/hooks/useApi";
import api from "@/utils/api";
import { useRouter } from "next/navigation";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { validateEmail } from "@/utils/validation";

export default function AdminLogin({ setPage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, initialize } = useAuthStore();
  const { loading, error, handleRequest } = useApi();
  const router = useRouter();

  useEffect(() => {
    initialize(); // Initialize auth state on mount
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setEmailError("");

    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    try {
      console.log("Admin login request payload:", { email, password });
      const response = await handleRequest(
        api.post("/api/auth/login", { email, password })
      );
      console.log("Admin login response:", response);

      if (!response.success || !response.data?.token) {
        throw new Error(
          typeof response.error === "string"
            ? response.error
            : response.error?.map((e) => e.message).join(", ") || "Login failed"
        );
      }

      if (response.data.user.role !== "admin") {
        throw new Error("Access denied. Admin role required.");
      }

      await login(email, password);
      console.log("Auth state after login:", useAuthStore.getState());
      toast.success("Admin login successful!");
      router.push("/admin");
    } catch (err) {
      console.error("Admin login error:", {
        message: err.message,
        response: err.response?.data,
      });
      const errorMessage = err.response?.data?.error || err.message || "Failed to login.";
      const errorMap = {
        "Invalid credentials": "Incorrect email or password.",
        "User not found": "No account found with this email.",
        "Invalid email": "Please enter a valid email address.",
        "Too many login attempts": "Too many login attempts. Please try again later.",
        "Access denied. Admin role required.": "This account does not have admin privileges.",
      };
      toast.error(errorMap[errorMessage] || errorMessage);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 max-w-md mx-auto">
        <Skeleton height={40} className="mb-6" />
        <Skeleton height={40} count={2} className="mb-4" />
        <Skeleton height={40} />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 max-w-md mx-auto bg-white shadow-lg rounded-lg text-black">
      <h1 className="text-3xl font-bold mb-6 text-center text-black">Admin Login</h1>
      <div aria-live="polite">
        {(error || emailError) && (
          <p className="text-red-600 mb-4 text-center">
            {error || emailError}
          </p>
        )}
      </div>
      <form onSubmit={handleAdminLogin} className="space-y-4">
        <div>
          <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            placeholder="Enter admin email (e.g., admin@example.com)"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError("");
            }}
            className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none ${
              emailError ? "border-red-500" : "border-gray-300"
            } disabled:opacity-50`}
            disabled={loading}
            aria-label="Admin email"
            aria-invalid={!!emailError}
            aria-describedby={emailError ? "email-error" : undefined}
            autoComplete="email"
          />
          {emailError && (
            <p id="email-error" className="text-red-600 text-sm mt-1" role="alert">
              {emailError}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="relative">
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none border-gray-300 disabled:opacity-50 pr-10`}
              disabled={loading}
              aria-label="Admin password"
              aria-describedby="password-error"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-600 rounded p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
        <button
          type="submit"
          className={`w-full bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition focus:outline-none focus:ring-2 focus:ring-red-600 ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={loading}
          aria-label="Login as admin"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin h-5 w-5 mr-2 text-white"
                fill="border-none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-50"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="black"
                  strokeWidth="4"
                />
                <path
                  className="opacity-100"
                  fill="white"
                  d="m0 4 1 8 8 8 8-1 7-8z"
                />
              </svg>
              Logging in...
            </span>
          ) : (
            "Login as Admin"
          )}
        </button>
      </form>
      <p className="mt-4 text-center text-gray-500">
        Not an admin?{" "}
        <span
          onClick={() => setPage("login")}
          className="text-red-500 cursor-pointer hover:underline"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setPage("login")}
          aria-label="User login"
        >
          User Login
        </span>{" "}
        |{" "}
        <span
          onClick={() => setPage("signup")}
          className="text-red-500 cursor-pointer hover:underline"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setPage("signup")}
          aria-label="Sign up"
        >
          Sign Up
        </span>
      </p>
    </div>
  );
}