'use client';

import { Fragment, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash, UserPlus, Shield, Pencil, Check, Ban, Upload, X } from 'lucide-react';
import { fetchUsers, createUser, deleteUser, updateUser, User } from '@/lib/services/users';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n/context';
import { ManagerPermissions } from '@/components/admin/ManagerPermissions';

export default function UsersPage() {
    const { t } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // New User State
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('MANAGER');
    const [newLogo, setNewLogo] = useState<File | null>(null);
    const [newLogoPreview, setNewLogoPreview] = useState<string>('');
    const [creating, setCreating] = useState(false);

    // Edit User State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editRole, setEditRole] = useState('MANAGER');
    const [editLogo, setEditLogo] = useState<File | null>(null);
    const [editLogoPreview, setEditLogoPreview] = useState<string>('');
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        try {
            const data = await fetchUsers();
            setUsers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setCreating(true);
        try {
            let logoUrl = '';

            // Upload logo if provided
            if (newLogo) {
                const formData = new FormData();
                formData.append('file', newLogo);
                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });
                if (uploadRes.ok) {
                    const { url } = await uploadRes.json();
                    logoUrl = url;
                }
            }

            const payload = { name: newName, email: newEmail, password: newPassword, role: newRole, logo: logoUrl || undefined };
            await createUser(payload);
            setIsCreateOpen(false);
            setNewName('');
            setNewEmail('');
            setNewPassword('');
            setNewRole('MANAGER');
            setNewLogo(null);
            setNewLogoPreview('');
            loadUsers();
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Failed to create user');
        } finally {
            setCreating(false);
        }
    }

    function openEdit(user: User) {
        setEditingUser(user);
        setEditName(user.name || '');
        setEditEmail(user.email);
        setEditPassword('');
        setEditRole(user.role);
        setEditLogo(null);
        setEditLogoPreview(user.logo || '');
        const sections = (!Array.isArray(user.allowedSections) && typeof user.allowedSections === 'object' && user.allowedSections)
            ? user.allowedSections as Record<string, unknown>
            : {};
        setIsEditOpen(true);
    }

    async function handleUpdate(e: React.FormEvent) {
        e.preventDefault();
        if (!editingUser) return;
        setUpdating(true);
        try {
            let logoUrl = editLogoPreview;

            // Upload new logo if provided
            if (editLogo) {
                const formData = new FormData();
                formData.append('file', editLogo);
                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });
                if (uploadRes.ok) {
                    const { url } = await uploadRes.json();
                    logoUrl = url;
                }
            }

            await updateUser(editingUser.id, {
                name: editName,
                email: editEmail,
                role: editRole,
                password: editPassword,
                logo: logoUrl,
            });
            setIsEditOpen(false);
            loadUsers();
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Failed to update user');
        } finally {
            setUpdating(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm(t.users.table.deleteConfirm)) return;
        try {
            await deleteUser(id);
            loadUsers();
        } catch (error) {
            console.error(error);
            alert('Failed to delete user');
        }
    }

    async function handleStatusChange(id: string, newStatus: string) {
        // Optimistic update could go here, but let's just wait for API
        try {
            // We need to fetch the current user details largely to pass them back if required by updateUser signature
            // But updateUser in services takes `data` which is Partial? No, it looks like it takes a specific object.
            // Let's check `lib/services/users.ts`. updateUser(id, data).
            // Actually I defined it as `updateUser(id, data: { name, email, role, password?, status? })`
            // But I don't want to re-send everything. 
            // My API endpoint `app/api/admin/users/[id]/route.ts` handles partial updates?
            // "const { name, email, role, password, status } = data;"
            // It selects specific fields. If they are undefined, it might set them to undefined.
            // But `prisma.user.update` with `undefined` values usually ignores them or errors if not optional.
            // Let's check the API again.
            // `const updateData: any = { name, email, role, status };`
            // If `name` is undefined in `body`, then `updateData.name` is undefined.
            // Prisma ignores undefined fields in `data`.
            // So I can just send `{ status: newStatus }` via a slightly modified service call or just fetch directly here.

            // To be safe and clean, let's just make the fetch call directly here or update the service to accept Partial.
            // For now, I will use `updateUser` but I need to pass other params?
            // Wait, I updated `updateUser` signature to: `updateUser(id, data: { name: string; email: string; role: string; password?: string; status?: string })`
            // It expects name, email, role as mandatory. That's annoying for a status toggle.
            // I should find the user in the list to get their current details.

            const user = users.find(u => u.id === id);
            if (!user) return;

            await updateUser(id, {
                name: user.name || '',
                email: user.email,
                role: user.role,
                status: newStatus
            });

            loadUsers();
            toast.success('User status updated');
        } catch (error: unknown) {
            console.error(error);
            toast.error('Failed to update status');
        }
    }

    if (loading) return (
        <div className="flex h-[50vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="text-muted-foreground animate-pulse">{t.users.loading}</p>
            </div>
        </div>
    );

    const roleOrder = ['ADMIN', 'MANAGER'];
    const groupedUsers = [
        ...roleOrder.map((role) => ({
            role,
            users: users.filter((user) => user.role === role),
        })).filter((group) => group.users.length > 0),
        ...(() => {
            const others = users.filter((user) => !roleOrder.includes(user.role));
            return others.length > 0 ? [{ role: 'OTHER', users: others }] : [];
        })(),
    ];

    const roleLabels: Record<string, string> = {
        ADMIN: 'Admins',
        MANAGER: 'Managers',
        OTHER: 'Other Roles',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t.users.title}</h1>
                    <p className="text-muted-foreground text-sm md:text-base">{t.users.subtitle}</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="shadow-lg shadow-primary/20 w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> {t.users.addManager}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{t.users.create.title}</DialogTitle>
                            <DialogDescription>
                                {t.users.create.description}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate}>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">{t.users.create.name}</Label>
                                    <Input id="name" value={newName} onChange={e => setNewName(e.target.value)} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">{t.users.create.email}</Label>
                                    <Input id="email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="password">{t.users.create.password}</Label>
                                    <Input id="password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="role">Role</Label>
                                    <select
                                        id="role"
                                        value={newRole}
                                        onChange={e => setNewRole(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="MANAGER">Manager</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="logo">Client Logo (Optional)</Label>
                                    <div className="flex flex-col gap-2">
                                        <Input
                                            id="logo"
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setNewLogo(file);
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        setNewLogoPreview(reader.result as string);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                        {newLogoPreview && (
                                            <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                                                <img src={newLogoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setNewLogo(null);
                                                        setNewLogoPreview('');
                                                    }}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={creating} className="w-full sm:w-auto">
                                    {creating ? t.users.create.submitting : t.users.create.submit}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit User Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{t.users.edit?.title || 'Edit User'}</DialogTitle>
                            <DialogDescription>
                                {t.users.edit?.description || 'Update user account details.'}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleUpdate}>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-name">{t.users.create.name}</Label>
                                    <Input id="edit-name" value={editName} onChange={e => setEditName(e.target.value)} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-email">{t.users.create.email}</Label>
                                    <Input id="edit-email" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-password">{t.users.create.password}</Label>
                                    <Input
                                        id="edit-password"
                                        type="password"
                                        value={editPassword}
                                        onChange={e => setEditPassword(e.target.value)}
                                        placeholder={t.users.edit?.passwordPlaceholder || 'Leave empty to keep current password'}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-role">Role</Label>
                                    <select
                                        id="edit-role"
                                        value={editRole}
                                        onChange={e => setEditRole(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="MANAGER">Manager</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-logo">Client Logo (Optional)</Label>
                                    <div className="flex flex-col gap-2">
                                        <Input
                                            id="edit-logo"
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setEditLogo(file);
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        setEditLogoPreview(reader.result as string);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                        {editLogoPreview && (
                                            <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                                                <img src={editLogoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditLogo(null);
                                                        setEditLogoPreview('');
                                                    }}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Manager Permissions Section */}
                            {editingUser && editRole === 'MANAGER' && (
                                <div className="border-t pt-4">
                                    <ManagerPermissions
                                        userId={editingUser.id}
                                        userRole={editRole}
                                    />
                                </div>
                            )}

                            <DialogFooter>
                                <Button type="submit" disabled={updating} className="w-full sm:w-auto">
                                    {updating ? (t.users.edit?.submitting || 'Saving...') : (t.users.edit?.submit || 'Save Changes')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-none shadow-sm bg-white/60 backdrop-blur-md">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Shield className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle>{t.users.authorizedUsers}</CardTitle>
                            <CardDescription>
                                {t.users.authorizedUsersSubtitle}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-xl border bg-white overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="w-[100px]">{t.users.table.role}</TableHead>
                                        <TableHead>{t.users.table.userDetails}</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="hidden md:table-cell">{t.users.table.createdAt}</TableHead>
                                        <TableHead className="text-right">{t.users.table.actions}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groupedUsers.map((group) => (
                                        <Fragment key={group.role}>
                                            <TableRow className="bg-slate-100/70 hover:bg-slate-100/70">
                                                <TableCell colSpan={5}>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                                                            {roleLabels[group.role] || group.role}
                                                        </span>
                                                        <span className="text-xs text-slate-500">{group.users.length}</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            {group.users.map((user) => (
                                                <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium border w-fit ${user.role === 'ADMIN'
                                                                ? 'bg-brand-50 text-ink-900 border-brand-200'
                                                                : 'bg-blue-50 text-blue-700 border-blue-200'
                                                                }`}>
                                                                {user.role}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            {user.logo ? (
                                                                <img
                                                                    src={user.logo}
                                                                    alt={`logo`}
                                                                    className="h-9 w-9 rounded-full border border-slate-200 object-cover shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-medium shrink-0">
                                                                    {(user.name || 'U').charAt(0)}
                                                                </div>
                                                            )}
                                                            <div className="min-w-0">
                                                                <div className="font-medium text-slate-900 truncate">{user.name || 'Unknown User'}</div>
                                                                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${user.status === 'ACTIVE'
                                                            ? 'bg-green-50 text-green-700 border-green-200'
                                                            : user.status === 'PENDING'
                                                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                                : 'bg-red-50 text-red-700 border-red-200'
                                                            }`}>
                                                            {user.status || 'ACTIVE'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{user.createdAt}</TableCell>
                                                    <TableCell className="text-right space-x-1 sm:space-x-2">
                                                        {user.status === 'PENDING' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="hover:bg-green-50 hover:text-green-600 text-green-600 transition-colors h-8 w-8 p-0 sm:h-9 sm:w-9"
                                                                onClick={() => handleStatusChange(user.id, 'ACTIVE')}
                                                                title="Approve User"
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {user.status === 'ACTIVE' && user.role !== 'ADMIN' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="hover:bg-amber-50 hover:text-amber-600 text-muted-foreground transition-colors h-8 w-8 p-0 sm:h-9 sm:w-9"
                                                                onClick={() => handleStatusChange(user.id, 'SUSPENDED')}
                                                                title="Suspend User"
                                                            >
                                                                <Ban className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {user.status === 'SUSPENDED' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="hover:bg-green-50 hover:text-green-600 text-muted-foreground transition-colors h-8 w-8 p-0 sm:h-9 sm:w-9"
                                                                onClick={() => handleStatusChange(user.id, 'ACTIVE')}
                                                                title="Re-activate User"
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                        )}

                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="hover:bg-blue-50 hover:text-blue-600 text-muted-foreground transition-colors h-8 w-8 p-0 sm:h-9 sm:w-9"
                                                            onClick={() => openEdit(user)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        {user.role !== 'ADMIN' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="hover:bg-red-50 hover:text-red-600 text-muted-foreground transition-colors h-8 w-8 p-0 sm:h-9 sm:w-9"
                                                                onClick={() => handleDelete(user.id)}
                                                            >
                                                                <Trash className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div >
    );
}
