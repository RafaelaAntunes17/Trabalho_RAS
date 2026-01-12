"use client";

import { useState, useLayoutEffect, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/providers/session-provider";
import { redirect, RedirectType } from "next/navigation";
import {
  useUpdateUserProfile,
  useUpdateUserPassword,
  useLogin,
  useDeleteUser, // <--- Importação nova
} from "@/lib/mutations/session";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { OctagonAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; // <--- Importações novas

export default function Account() {
  const session = useSession();
  const isFreePlan = session.user.type === "free";
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [errorProfile, setErrorProfile] = useState<string | null>(null);
  const [errorPassword, setErrorPassword] = useState<string | null>(null);
  const [showErrorProfile, setShowErrorProfile] = useState<boolean>(false);
  const [showErrorPassword, setShowErrorPassword] = useState<boolean>(false);

  const updateUser = useUpdateUserProfile();
  const updatePassword = useUpdateUserPassword();
  const login = useLogin();
  const deleteAccount = useDeleteUser(); // <--- Hook novo
  const { toast } = useToast();

  // Set default values when the session is loaded or updated
  useEffect(() => {
    if (session) {
      setName(session.user.name || "Name");
      setEmail(session.user.email || "Email");
    }
  }, [session]);

  useEffect(() => {
    if (newPassword.length < 8 || newPassword.length > 128)
      setErrorPassword("Password must be between 8 and 128 characters");
    if (currentPassword === "")
      setErrorPassword("Current password is required");
    if (currentPassword.length < 8 || currentPassword.length > 128)
      setErrorPassword("Current password must be between 8 and 128 characters");
    if (newPassword !== confirmPassword)
      setErrorPassword("Passwords do not match");
    else setErrorPassword(null);
  }, [newPassword, confirmPassword, currentPassword]);

  useEffect(() => {
    if (name === "") setErrorProfile("Name is required");
    else if (email === "") setErrorProfile("Email is required");
    else setErrorProfile(null);
  }, [name, email]);

  function saveChangesProfile() {
    setShowErrorProfile(true);
    if (errorProfile) return;
    updateUser.mutate(
      {
        userId: session.user._id,
        token: session.token,
        name: name,
        email: email,
      },
      {
        onSuccess: () => {
          toast({
            title: "Profile updated successfully.",
          });
        },
        onError: (error) => {
          toast({
            title: "Ups! An error occurred.",
            description: error.message,
            variant: "destructive",
          });
        },
      },
    );

    setIsEditing(false);
  }

  function saveChangesPassword() {
    setShowErrorPassword(true);
    if (errorPassword) return;

    login.mutate(
      {
        email: session.user.email || "",
        password: currentPassword,
      },
      {
        onSuccess: (session) => {
          updatePassword.mutate(
            {
              userId: session.user._id,
              token: session.token,
              password: newPassword,
            },
            {
              onSuccess: () => {
                toast({
                  title: "Password updated successfully.",
                });
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              },
              onError: (error) => {
                toast({
                  title: "Ups! An error occurred.",
                  description: error.message,
                  variant: "destructive",
                });
              },
            },
          );
        },
        onError: () => {
          toast({
            title: "Incorrect password.",
            variant: "destructive",
          });
        },
      },
    );
  }

  useLayoutEffect(() => {
    if (session.user.type === "anonymous") {
      redirect("/login", RedirectType.replace);
    }
  }, [session.user.type]);

  if (session.user.type !== "anonymous")
    return (
      <div className="max-w-3xl space-y-4 sm:space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </div>
              <Badge variant={isFreePlan ? "secondary" : "default"}>
                {isFreePlan ? "Free" : "Premium"} Plan
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <Button
              variant={isEditing ? "default" : "secondary"}
              onClick={() => {
                if (isEditing) {
                  saveChangesProfile();
                }
                setIsEditing(!isEditing);
              }}
            >
              {isEditing ? "Save Changes" : "Edit Profile"}
            </Button>
            {showErrorProfile && errorProfile && (
              <Alert variant="destructive" className="text-sm">
                <OctagonAlert className="size-4" />
                <AlertTitle>Input Error</AlertTitle>
                <AlertDescription>{errorProfile}.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  required
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>

              <Separator />

              <div className="grid gap-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  required
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  required
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <Button
              onClick={() => saveChangesPassword()}
              disabled={
                !(
                  currentPassword !== "" &&
                  newPassword !== "" &&
                  confirmPassword !== ""
                )
              }
            >
              Update Password
            </Button>
            {showErrorPassword && errorPassword && (
              <Alert variant="destructive" className="text-sm">
                <OctagonAlert className="size-4" />
                <AlertTitle>Input Error</AlertTitle>
                <AlertDescription>{errorPassword}.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* --- DANGER ZONE ADICIONADA AQUI --- */}
        <Card className="border-red-500/50">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>
              Irreversibly delete your account and all associated data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    account, projects, and images from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                      onClick={(e) => {
                        // 1. Executar a mutação
                        deleteAccount.mutate(
                          {
                            userId: session.user._id,
                            token: session.token,
                          },
                          {
                            // 2. Se falhar, mostrar erro e não sair da página
                            onError: (error) => {
                              console.error("Erro ao apagar conta:", error);
                              toast({
                                title: "Erro ao apagar conta",
                                description: error.message || "Tente novamente mais tarde.",
                                variant: "destructive",
                              });
                            }
                          }
                        );
                      }}
                  >                   
                      {deleteAccount.isPending ? "Deleting..." : "Delete Account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    );
}