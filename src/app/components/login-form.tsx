"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { MessageSquare, Users, Zap } from "lucide-react";

export default function LoginForm() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Hero Section */}
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-blue-100 p-3">
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Welcome to ConflictChat
          </h1>
          <p className="text-lg text-gray-600">
            Resolve conflicts with AI-powered conversations
          </p>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
            <div className="rounded-full bg-green-100 p-2">
              <Users className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Real-time Chat
              </p>
              <p className="text-xs text-gray-600">
                Connect with others instantly
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
            <div className="rounded-full bg-purple-100 p-2">
              <Zap className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">AI Assistance</p>
              <p className="text-xs text-gray-600">
                Get help resolving conflicts
              </p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-0 bg-white shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-center text-xl">Get Started</CardTitle>
            <CardDescription className="text-center">
              Choose how you&apos;d like to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SignInButton>
              <Button className="h-11 w-full bg-blue-600 font-medium text-white hover:bg-blue-700">
                Sign In
              </Button>
            </SignInButton>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">or</span>
              </div>
            </div>

            <SignUpButton>
              <Button
                variant="outline"
                className="h-11 w-full border-gray-300 font-medium hover:bg-gray-50"
              >
                Create Account
              </Button>
            </SignUpButton>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
