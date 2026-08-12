"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAuth } from "@/providers/auth-provider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  getDashboardPath,
} from "@/features/auth/auth.utils";

const loginSchema = z.object({
  email: z
    .string()
    .email(
      "Please enter a valid email address"
    ),

  password: z
    .string()
    .min(
      1,
      "Password is required"
    ),
});

type LoginFormValues =
  z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();

  const { login } = useAuth();

  const [
    serverError,
    setServerError,
  ] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<LoginFormValues>({
    resolver:
      zodResolver(loginSchema),

    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (
    data: LoginFormValues
  ) => {
    try {
      setServerError(null);

      const authenticatedUser =
        await login(data);

      /*
       * Read returnUrl only in the browser.
       *
       * Example:
       * /login?returnUrl=%2Ftourist%2Frequests%2Fnew%3FpackageId%3D7
       */
      const params =
        new URLSearchParams(
          window.location.search
        );

      const returnUrl =
        params.get("returnUrl");

      /*
       * Only allow internal application paths.
       *
       * This prevents redirecting users
       * to arbitrary external websites.
       */
      if (
        returnUrl &&
        returnUrl.startsWith("/")
      ) {
        router.replace(returnUrl);
        return;
      }

      /*
       * Normal login with no returnUrl:
       * send user to their role dashboard.
       */
      router.replace(
        getDashboardPath(
          authenticatedUser.role
        )
      );
    } catch (error) {
      console.error(error);

      setServerError(
        "Invalid email or password."
      );
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">
            Welcome back
          </CardTitle>

          <CardDescription>
            Sign in to your Travora account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={
              handleSubmit(
                onSubmit
              )
            }
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="email">
                Email
              </Label>

              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...register(
                  "email"
                )}
              />

              {errors.email && (
                <p className="text-sm text-destructive">
                  {
                    errors.email
                      .message
                  }
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password
              </Label>

              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                {...register(
                  "password"
                )}
              />

              {errors.password && (
                <p className="text-sm text-destructive">
                  {
                    errors.password
                      .message
                  }
                </p>
              )}
            </div>

            {serverError && (
              <p className="text-sm text-destructive">
                {serverError}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={
                isSubmitting
              }
            >
              {isSubmitting
                ? "Signing in..."
                : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}