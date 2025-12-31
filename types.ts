export interface Profile {
    id: string;
    email: string;
    full_name: string;
    role: 'user' | 'admin' | 'super_admin';
    created_at: string;
}
