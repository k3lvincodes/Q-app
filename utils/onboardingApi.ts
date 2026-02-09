import { supabase } from './supabase';

export interface OnboardingStatus {
    completed: boolean;
    completedAt: string | null;
    codeUsed: string | null;
}

export interface CodeValidation {
    valid: boolean;
    error?: string;
}

export interface OnboardingResult {
    success: boolean;
    error?: string;
    bootsAwarded?: number;
    totalBoots?: number;
}

/**
 * Check if a user has completed onboarding
 */
export const checkOnboardingStatus = async (userId: string): Promise<OnboardingStatus> => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('onboarding_completed, onboarding_completed_at, onboarding_code_used')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error checking onboarding status:', error);
            return { completed: false, completedAt: null, codeUsed: null };
        }

        return {
            completed: data?.onboarding_completed || false,
            completedAt: data?.onboarding_completed_at || null,
            codeUsed: data?.onboarding_code_used || null,
        };
    } catch (error) {
        console.error('Error checking onboarding status:', error);
        return { completed: false, completedAt: null, codeUsed: null };
    }
};

/**
 * Validate if a unique code exists and is available
 */
export const validateUniqueCode = async (code: string): Promise<CodeValidation> => {
    try {
        const { data, error } = await supabase
            .from('unique_codes')
            .select('id, used_by, is_active')
            .eq('code', code.toUpperCase().trim())
            .single();

        if (error || !data) {
            return { valid: false, error: 'Invalid code' };
        }

        if (!data.is_active) {
            return { valid: false, error: 'This code is no longer active' };
        }

        if (data.used_by) {
            return { valid: false, error: 'This code has already been used' };
        }

        return { valid: true };
    } catch (error) {
        console.error('Error validating code:', error);
        return { valid: false, error: 'Error validating code' };
    }
};

/**
 * Complete the onboarding process
 * Uses a database function to ensure atomicity
 */
export const completeOnboarding = async (
    userId: string,
    code: string,
    subscriptionService: string,
    amount: string,
    joinDate: string,
    matchEmail: string
): Promise<OnboardingResult> => {
    try {
        const { data, error } = await supabase.rpc('complete_onboarding', {
            p_user_id: userId,
            p_code: code.toUpperCase().trim(),
            p_subscription_service: subscriptionService,
            p_amount: amount,
            p_join_date: joinDate,
            p_match_email: matchEmail,
        });

        if (error) {
            console.error('Error completing onboarding:', error);
            return { success: false, error: error.message };
        }

        // The RPC returns a JSON object
        const result = data as { success: boolean; error?: string; boots_awarded?: number; total_boots?: number };

        return {
            success: result.success,
            error: result.error,
            bootsAwarded: result.boots_awarded,
            totalBoots: result.total_boots,
        };
    } catch (error: any) {
        console.error('Error completing onboarding:', error);
        return { success: false, error: error.message || 'An error occurred' };
    }
};
