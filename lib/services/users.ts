export type User = {
    id: string;
    name: string | null;
    email: string;
    role: string;
    status: string;
    logo: string | null;
    createdAt: string;
    allowedSections?: Record<string, unknown> | unknown[] | null;
};

export async function fetchUsers(): Promise<User[]> {
    const res = await fetch('/api/admin/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    const data = await res.json();
    return data.users.map((u: any) => ({
        ...u,
        createdAt: new Date(u.createdAt).toLocaleDateString(),
    }));
}

export async function createUser(data: { name: string; email: string; password: string; role?: string; status?: string; logo?: string }) {
    const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create user');
    }
    return res.json();
}

/**
 * Every field is optional: the API applies only what it receives, so a
 * status toggle no longer has to echo back the name, e-mail and role it
 * isn't changing.
 */
export async function updateUser(
    id: string,
    data: {
        name?: string;
        email?: string;
        role?: string;
        password?: string;
        status?: string;
        logo?: string;
    }
) {
    const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update user');
    }
    return res.json();
}

export async function deleteUser(id: string) {
    const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) {
        // The refusals that matter here — last administrator, own account —
        // are explained in the body; a generic message would hide them.
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete user');
    }
    return res.json();
}
