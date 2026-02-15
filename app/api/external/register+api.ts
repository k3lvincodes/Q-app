import { supabaseServer } from '../../../utils/supabaseServer';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, full_name } = body;

        // 1. Validation
        if (!email || !full_name) {
            return Response.json(
                { error: 'Email and full_name are required' },
                { status: 400 }
            );
        }

        if (full_name.trim().split(' ').length < 2) {
            return Response.json(
                { error: 'Please enter your full name (at least two names).' },
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

        // 2. Check if user already exists in profiles
        const { data: existingUser, error: queryError } = await supabaseServer
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

        if (queryError && queryError.code !== 'PGRST116') { // PGRST116 is "The result contains 0 rows"
            console.error('Error checking user existence:', queryError);
            return Response.json(
                { error: 'Internal server error checking user existence' },
                { status: 500 }
            );
        }

        if (existingUser) {
            return Response.json(
                { error: 'User already exists. Please login.' },
                { status: 409 } // Conflict
            );
        }

        // 3. Register (Sign in with OTP + Metadata)
        const { error: authError } = await supabaseServer.auth.signInWithOtp({
            email,
            options: {
                data: {
                    full_name: full_name,
                },
            },
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
        console.error('Register API Error:', error);
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
