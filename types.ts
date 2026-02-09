export interface Profile {
    id: string;
    email: string;
    full_name: string;
    role: 'user' | 'admin' | 'super_admin';
    created_at: string;
    onboarding_completed?: boolean;
    onboarding_completed_at?: string;
    onboarding_code_used?: string;
    boots_count?: number;
}
