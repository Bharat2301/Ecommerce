"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/stores/authStore";
import { validateEmail, validatePassword, validateName } from "@/utils/validation";
import api from "@/utils/api";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuthStore();
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateName(name)) {
      setError("Name must be 2-50 characters, letters only");
      toast.error("Invalid name");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      toast.error("Invalid email address");
      return;
    }

    if (!validatePassword(password)) {
      setError("Password must be at least 8 characters, with uppercase, lowercase, number, and special character");
      toast.error("Invalid password format");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/api/auth/signup", { name, email, password });
      if (response.data.success && response.data.data.token) {
        await login(email, password);
        toast.success("Signup successful!");
        router.push("/");
      } else {
        throw new Error(response.data.error || "Signup failed");
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || "Failed to signup";
      const errorMap = {
        "Email already exists": "An account with this email already exists.",
        "Invalid email": "Please enter a valid email address.",
        "Invalid name": "Name must be 2-50 characters, letters only.",
        "Invalid password": "Password does not meet requirements.",
      };
      setError(errorMap[errorMessage] || errorMessage);
      toast.error(errorMap[errorMessage] || errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md text-black">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign Up</h1>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        <form onSubmit={handleSignup}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-gray-600 mb-2">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
              disabled={loading}
              aria-label="Name"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-600 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
              disabled={loading}
              aria-label="Email"
            />
          </div>
          <div className="mb-4 relative">
            <label htmlFor="password" className="block text-gray-600 mb-2">
              Password
            </label>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded-lg pr-10 focus:outline-none focus:ring-2 focus:ring-red-600"
              disabled={loading}
              aria-label="Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-10 text-gray-500 hover:text-red-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <button
            type="submit"
            className="w-full bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400"
            disabled={loading}
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>
        <p className="mt-4 text-center">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-red-600 hover:underline"
          >
            Login
          </button>{" "}
          or{" "}
          <button
            type="button"
            onClick={() => router.push("/admin-login")}
            className="text-red-600 hover:underline"
          >
            Admin Login
          </button>
        </p>
      </div>
    </div>
  );
}