'use client';

import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { Bell, User, Save, Loader2, MessageCircle } from "lucide-react";
import { useLanguage } from '@/lib/i18n/context';
import { getAdminSetting, updateAdminSetting, getUserProfile, updateUserProfile } from "@/lib/actions";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useAdminRole } from "@/components/admin/AdminLayoutClient";

export default function SettingsPage() {
    const { t } = useLanguage();
    const [profile, setProfile] = useState({ name: '', email: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingProfile, setIsSavingProfile] = useState(false);

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
        } catch (error) {
            toast.error(t.settingsPage.toasts.saveError);
        } finally {
            setIsSavingProfile(false);
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


                {/*
                  * The notifications card that used to sit here offered two
                  * switches — "nouveaux leads" and "rapports hebdomadaires" —
                  * that were wired to nothing: no handler, no persistence, and
                  * no code anywhere that sends either. It has been removed
                  * rather than persisted, because storing a flag no sender
                  * reads would still promise mail that never arrives.
                  *
                  * Bring it back with the notification triggers themselves.
                  */}
            </div>
        </motion.div>
    );
}
