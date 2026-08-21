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

import { getDashboardPath } from "@/features/auth/auth.utils";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),

  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();

  const { login } = useAuth();

  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),

    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setServerError(null);

      const authenticatedUser = await login(data);

      /**
       * Example:
       *
       * /login?returnUrl=%2Ftourist%2Frequests%2Fnew
       */
      const params = new URLSearchParams(window.location.search);

      const returnUrl = params.get("returnUrl");

      /**
       * If the login happened because the user
       * tried to access a protected internal page,
       * return them to that page.
       *
       * We only allow a single-leading-slash
       * internal application path.
       *
       * This also rejects values such as:
       * //evil-site.com
       */
      if (
        returnUrl &&
        returnUrl.startsWith("/") &&
        !returnUrl.startsWith("//")
      ) {
        router.replace(returnUrl);

        return;
      }

      /**
       * Normal tourist login:
       *
       * Return to the public Travora website.
       *
       * The public navbar will recognize the
       * authenticated tourist and display their
       * account/navigation controls.
       */
      if (authenticatedUser.role === "TOURIST") {
        router.replace("/");

        return;
      }

      /**
       * Admin / System Admin / Tour Guide:
       *
       * Continue to the appropriate portal.
       */
      router.replace(getDashboardPath(authenticatedUser.role));
    } catch (error) {
      console.error(error);

      setServerError("Invalid email or password.");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome back</CardTitle>

          <CardDescription>Sign in to your Travora account</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>

              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...register("email")}
              />

              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>

              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                {...register("password")}
              />

              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}