import { supabaseServer } from '../../../utils/supabaseServer';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, token, type, full_name } = body;

        // 1. Validation
        if (!email || !token || !type) {
            return Response.json(
                { error: 'Email, token, and type are required' },
                { status: 400 }
            );
        }

        // type should be 'email', 'signup', 'invite', 'recovery', 'magiclink' depending on context
        // The frontend code uses 'type: email' for verifyOtp call usually, but passes 'signup' as a param for logic
        // The supabase.auth.verifyOtp takes type: EmailOtpType

        // NOTE: In the frontend verify-otp.tsx:
        // supabase.auth.verifyOtp({ email, token, type: 'email' })
        // So we should strictly start with 'email' type for the supabase call itself, 
        // or let the user pass it if they know what they are doing (e.g. magiclink).
        // But for this simple flow, we default or force 'email' if generic.

        let supabaseType = 'email';
        if (['signup', 'invite', 'recovery', 'magiclink', 'email'].includes(type)) {
            supabaseType = type;
        }
        // However, the client app flow (verify-otp.tsx) hardcodes type: 'email' in the verifyOtp call:
        // const { data, error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: 'email' });

        // So let's stick to strict 'email' type for the Supabase call unless specifically requested otherwise securely.
        // Actually, usually signInWithOtp sends an 'email' type OTP.

        const { data, error: verifyError } = await supabaseServer.auth.verifyOtp({
            email,
            token,
            type: 'email', // Force email type for standard OTP flow
        });

        if (verifyError) {
            return Response.json(
                { error: verifyError.message || 'Invalid OTP' },
                { status: 400 }
            );
        }

        if (!data.session) {
            return Response.json(
                { error: 'Verification failed. No session created.' },
                { status: 400 }
            );
        }

        // 2. Handle Profile Updates (if signup flow)
        // The frontend code checks: if (type === 'signup' && fullName) { updateUser... }
        // We can rely on the 'type' param passed in the BODY (not the one for supabase) to decide this.
        // Let's assume the caller passes `context: 'signup'` or checks the body `type` as 'signup'.

        // If the logical flow type is signup and name is provided:
        if (type === 'signup' && full_name) {
            const { error: updateError } = await supabaseServer.auth.updateUser({
                data: { full_name: full_name }
            });

            if (updateError) {
                console.error('Error updating user name:', updateError);
                // We don't fail the verification but might want to warn
            }
        }

        // 3. Return Session
        // We return the relevant session data so the external app can store it.

        return Response.json({
            message: 'Verification successful',
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at,
                user: {
                    id: data.session.user.id,
                    email: data.session.user.email,
                    user_metadata: data.session.user.user_metadata,
                }
            }
        });

    } catch (error: any) {
        console.error('Verify OTP API Error:', error);
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
