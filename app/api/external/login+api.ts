import { supabaseServer } from '../../../utils/supabaseServer';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        // 1. Validation
        if (!email) {
            return Response.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return Response.json(
                { error: 'Invalid email address' },
                { status: 400 }
            );
        }

        // 2. Login (Sign in with OTP)
        // Note: In Supabase, signInWithOtp works for both signup and login. 
        // However, for login, we might want to check if user exists if we want to give specific error messages,
        // but standard security practice is often not to reveal user existence.
        // The frontend login.tsx just calls signInWithOtp directly.

        const { error: authError } = await supabaseServer.auth.signInWithOtp({
            email,
        });

        if (authError) {
            console.error('Supabase Auth Error:', authError);
            return Response.json(
                { error: authError.message || 'Failed to send OTP' },
                { status: 500 }
            );
        }

        return Response.json({
            message: 'OTP sent successfully to email',
            email: email
        });

    } catch (error: any) {
        console.error('Login API Error:', error);
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
