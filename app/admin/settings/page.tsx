'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { User, Save, Loader2, KeyRound } from "lucide-react";
import { useLanguage } from '@/lib/i18n/context';
import { getUserProfile, updateUserProfile, changeOwnPassword } from "@/lib/actions";
import { toast } from "sonner";

const EMPTY_PASSWORDS = { current: '', next: '', confirm: '' };

export default function SettingsPage() {
    const { t } = useLanguage();
    const [profile, setProfile] = useState({ name: '', email: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    useEffect(() => {
        async function loadProfile() {
            try {
                const userProfile = await getUserProfile();
                if (userProfile) {
                    setProfile({
                        name: userProfile.name || '',
                        email: userProfile.email || ''
                    });
                }
            } catch (error) {
                console.error("Failed to load profile:", error);
                toast.error(t.settingsPage.toasts.saveError);
            } finally {
                setIsLoading(false);
            }
        }
        loadProfile();
    }, [t]);

    const handleSaveProfile = async () => {
        setIsSavingProfile(true);
        try {
            const result = await updateUserProfile(profile);
            if (result.success) {
                toast.success(t.settingsPage.toasts.saveSuccess);
            } else {
                toast.error(result.error || t.settingsPage.toasts.saveError);
            }
        } catch {
            toast.error(t.settingsPage.toasts.saveError);
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        // Caught here as well as on the server: a typo in the confirmation
        // should not cost a round trip to find out.
        if (passwords.next !== passwords.confirm) {
            toast.error(t.settingsPage.password.mismatch);
            return;
        }

        setIsSavingPassword(true);
        try {
            const result = await changeOwnPassword({
                currentPassword: passwords.current,
                newPassword: passwords.next,
            });
            if (result.success) {
                toast.success(t.settingsPage.password.changed);
                setPasswords(EMPTY_PASSWORDS);
            } else {
                toast.error(result.error || t.settingsPage.password.failed);
            }
        } catch {
            toast.error(t.settingsPage.password.failed);
        } finally {
            setIsSavingPassword(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6 max-w-4xl"
        >
            <div>
                <h3 className="text-2xl font-bold tracking-tight">{t.settingsPage.title}</h3>
                <p className="text-base text-muted-foreground">
                    {t.settingsPage.subtitle}
                </p>
            </div>

            <div className="grid gap-6">
                <Card className="border-none shadow-sm bg-white/60 backdrop-blur-md">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            <CardTitle>{t.settingsPage.profile.title}</CardTitle>
                        </div>
                        <CardDescription>
                            {t.settingsPage.profile.description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t.settingsPage.profile.fullName}</Label>
                                <Input
                                    id="name"
                                    value={profile.name}
                                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                    className="bg-white"
                                    disabled={isLoading || isSavingProfile}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">{t.settingsPage.profile.email}</Label>
                                <Input
                                    id="email"
                                    value={profile.email}
                                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                    className="bg-white"
                                    disabled={isLoading || isSavingProfile}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button
                                className="shadow-md"
                                onClick={handleSaveProfile}
                                disabled={isLoading || isSavingProfile}
                            >
                                {isSavingProfile ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="mr-2 h-4 w-4" />
                                )}
                                {t.settingsPage.profile.save}
                            </Button>
                        </div>
                    </CardContent>
                </Card>


                <Card className="border-none shadow-sm bg-white/60 backdrop-blur-md">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <KeyRound className="h-5 w-5 text-primary" />
                            <CardTitle>{t.settingsPage.password.title}</CardTitle>
                        </div>
                        <CardDescription>
                            {t.settingsPage.password.description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div className="space-y-2 md:max-w-sm">
                                <Label htmlFor="current-password">{t.settingsPage.password.current}</Label>
                                <Input
                                    id="current-password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={passwords.current}
                                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                    className="bg-white"
                                    required
                                    disabled={isSavingPassword}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">{t.settingsPage.password.next}</Label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        autoComplete="new-password"
                                        minLength={8}
                                        value={passwords.next}
                                        onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
                                        className="bg-white"
                                        required
                                        disabled={isSavingPassword}
                                    />
                                    <p className="text-xs text-muted-foreground">{t.settingsPage.password.hint}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password">{t.settingsPage.password.confirm}</Label>
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        autoComplete="new-password"
                                        minLength={8}
                                        value={passwords.confirm}
                                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                        className="bg-white"
                                        required
                                        disabled={isSavingPassword}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button type="submit" className="shadow-md" disabled={isSavingPassword}>
                                    {isSavingPassword ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <KeyRound className="mr-2 h-4 w-4" />
                                    )}
                                    {t.settingsPage.password.submit}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/*
                  * The notifications card that used to sit here offered two
                  * switches — "nouveaux leads" and "rapports hebdomadaires" —
                  * that were wired to nothing: no handler, no persistence, and
                  * no code anywhere that sends either. It has been removed
                  * rather than persisted, because storing a flag no sender
                  * reads would still promise mail that never arrives.
                  *
                  * Per-client transport notifications now live where the
                  * sending does: Messagerie → Configuration.
                  */}
            </div>
        </motion.div>
    );
}
