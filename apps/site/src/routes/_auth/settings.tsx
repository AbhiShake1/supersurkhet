import { Header } from "@/components/hero5-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import {
  Bell,
  CheckCircle2,
  Languages,
  Loader2,
  LogOut,
  Smartphone,
  Moon,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ThemePresetSelector } from "@/components/theme-preset-selector";
import { ThemeEditor } from "@/components/theme-editor";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/contexts/theme-context";

export const Route = createFileRoute("/_auth/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  const { auth } = useRouteContext({ from: "/_auth" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      emailNotifications: true,
      smsNotifications: false,
      language: "en",
    },
  });
  const { isDarkMode } = useTheme();
  const onSubmit = (data: any) => {
    setSaving(true);
    setSaved(false);
    // In a real app, you would save the notification settings and language
    // For now, just show the success message
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }, 1200);
  };
  return (
    <>
      <Header />
      <div className="max-w-6xl mx-auto py-12 px-4 animate-in fade-in duration-500">
        <h1 className="text-4xl font-extrabold mb-8 tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Settings
        </h1>
        <div className="grid grid-cols-1 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
              <Card className="p-6 shadow-xl border-2 border-muted/40">
                <div className="flex items-center gap-4 mb-6">
                  <Bell className="text-primary" />
                  <h2 className="text-xl font-semibold">Notifications</h2>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <Bell size={18} />
                    <span>Email Notifications</span>
                  </div>
                  <Switch
                    {...register("emailNotifications")}
                  />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <Smartphone size={18} />
                    <span>SMS Notifications</span>
                  </div>
                  <Switch
                    {...register("smsNotifications")}
                  />
                </div>
              </Card>
              <Card className="p-6 shadow-xl border-2 border-muted/40">
                <div className="flex items-center gap-4 mb-6">
                  <Moon className="text-primary" />
                  <h2 className="text-xl font-semibold">Appearance</h2>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <span>Dark Mode</span>
                  </div>
                  <ThemeToggle />
                </div>
              </Card>
              <Card className="p-6 shadow-xl border-2 border-muted/40">
                <div className="flex items-center gap-4 mb-6">
                  <Languages className="text-primary" />
                  <h2 className="text-xl font-semibold">Language</h2>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span>Preferred Language</span>
                  <select
                    {...register("language")}
                    className="w-40 rounded-lg border px-3 py-2 bg-background text-foreground"
                  >
                    <option value="en">English</option>
                    <option value="ne">Nepali</option>
                  </select>
                </div>
              </Card>
              <div className="flex gap-3 mt-8 items-center">
                <Button type="submit" disabled={saving} className="relative">
                  {saving ? (
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  ) : saved ? (
                    <CheckCircle2 className="text-green-500 mr-2 h-4 w-4" />
                  ) : null}
                  {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" onClick={() => reset()}>
                  Reset
                </Button>
              </div>
            </form>
            <Card className="mt-12 p-6 border-2 border-destructive/30 shadow-lg bg-destructive/5">
              <div className="flex items-center gap-4 mb-4">
                <LogOut className="text-destructive" />
                <h2 className="text-xl font-semibold text-destructive">
                  Account Actions
                </h2>
              </div>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => auth.logout()}
              >
                Log out
              </Button>
            </Card>
          </div>
          <div className="lg:col-span-1 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Theme Customization</CardTitle>
                <CardDescription>Choose a preset or customize your theme</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <ThemePresetSelector />
                  <div className="pt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Customize Theme</CardTitle>
                        <CardDescription>Adjust colors and styles to your preference</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ThemeEditor compact={true} />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
