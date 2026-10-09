"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import type { RegisterRequest } from "@/types/auth/RegisterRequest";
import { Eye, EyeOff, Mail, User } from "lucide-react";
import useIntl from "@/hooks/useIntl";
import Link from "next/link";

// Google Icon Component
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
      <path
        fill="#4285F4"
        d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
      />
      <path
        fill="#34A853"
        d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"
      />
      <path
        fill="#FBBC05"
        d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"
      />
      <path
        fill="#EA4335"
        d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
      />
    </g>
  </svg>
);

export const RegisterForm = () => {
  const { register: registerUser, loginWithGoogle, error: authError, clearError } = useAuth();
  const { t } = useIntl();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearError();
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: "",
      });
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = t("auth.register.validation.name", { default: "Name is required" });
    } else if (formData.name.length < 2) {
      newErrors.name = t("auth.register.validation.name.minLength", { default: "Name must be at least 2 characters" });
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = t("auth.register.validation.email.required", { default: "Email is required" });
    } else if (
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)
    ) {
      newErrors.email = t("auth.register.validation.email.invalid", { default: "Invalid email format" });
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = t("auth.register.validation.password.required", { default: "Password is required" });
    } else if (formData.password.length < 8) {
      newErrors.password = t("auth.register.validation.password.minLength", { default: "Password must be at least 8 characters" });
    }

    // Validate confirmPassword
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t("auth.register.validation.confirmPassword.required", { default: "Please confirm your password" });
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t("auth.register.validation.confirmPassword.mismatch", { default: "Passwords do not match" });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { confirmPassword: _, ...registerData } = formData;
      await registerUser(registerData as RegisterRequest);
    } catch (error) {
      console.error("Registration failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    loginWithGoogle();
  };

  return (
    <div className="relative">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}>
        <div className="mb-8">
          <h1 className="text-4xl font-light text-black mb-4">
            {t("auth.register.title", { default: "Create Account" })}
          </h1>
          <p className="text-gray-600">
            {t("auth.register.subtitle", { default: "Start your creative journey today." })}
          </p>
        </div>

        {/* Google Register Button */}
        <motion.button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 mb-6 cursor-pointer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}>
          <GoogleIcon />
          <span className="text-gray-700 font-medium">
            {t("auth.register.google", { default: "Continue with Google" })}
          </span>
        </motion.button>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">
              {t("auth.register.divider", { default: "or register with email" })}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {authError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {authError}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1">
              {t("auth.register.fields.name.label", { default: "Full Name:" })}
            </label>
            <div className="relative">
              <motion.input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white"
                placeholder={t("auth.register.fields.name.placeholder", { default: "Enter your name" })}
                whileFocus={{ scale: 1.02 }}
                required
              />
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            {errors.name && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 text-xs text-red-600">
                {errors.name}
              </motion.p>
            )}
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1">
              {t("auth.register.fields.email.label", { default: "Email:" })}
            </label>
            <div className="relative">
              <motion.input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white"
                placeholder={t("auth.register.fields.email.placeholder", { default: "Enter your email" })}
                whileFocus={{ scale: 1.02 }}
                required
              />
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            {errors.email && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 text-xs text-red-600">
                {errors.email}
              </motion.p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1">
              {t("auth.register.fields.password.label", { default: "Password:" })}
            </label>
            <div className="relative">
              <motion.input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white"
                placeholder={t("auth.register.fields.password.placeholder", { default: "Create a password" })}
                whileFocus={{ scale: 1.02 }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {showPassword ? (
                  <Eye className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.password && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 text-xs text-red-600">
                {errors.password}
              </motion.p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1">
              {t("auth.register.fields.confirmPassword.label", { default: "Confirm Password:" })}
            </label>
            <motion.input
              type={showPassword ? "text" : "password"}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white"
              placeholder={t("auth.register.fields.confirmPassword.placeholder", { default: "Confirm your password" })}
              whileFocus={{ scale: 1.02 }}
              required
            />
            {errors.confirmPassword && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 text-xs text-red-600">
                {errors.confirmPassword}
              </motion.p>
            )}
          </div>

          <motion.button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium mt-6 cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}>
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
                <span>{t("auth.register.loading", { default: "Creating account..." })}</span>
              </div>
            ) : (
              t("auth.register.submit", { default: "Create Account" })
            )}
          </motion.button>
        </form>

        {/* Login Link */}
        <p className="mt-6 text-center text-gray-600">
          {t("auth.register.hasAccount", { default: "Already have an account?" })}{" "}
          <Link
            href="/auth/login"
            className="text-black font-medium hover:underline">
            {t("auth.register.login", { default: "Sign in" })}
          </Link>
        </p>
      </motion.div>
    </div>
  );
};
