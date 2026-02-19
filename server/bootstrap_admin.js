import { supabase } from './config/supabase.js';
import bcrypt from 'bcryptjs';

const bootstrapAdmin = async () => {
    const password = 'M@dison_88';
    const email = 'admin@madison88.com';
    const username = 'admin';

    try {
        console.log('Bootstrapping admin user directly in Supabase...');

        // 1. Get the ADMIN role ID
        const { data: role, error: roleError } = await supabase
            .from('roles')
            .select('id')
            .eq('code', 'ADMIN')
            .single();

        if (roleError || !role) {
            console.error('Error finding ADMIN role. Make sure migrations are run.', roleError);
            return;
        }

        // 2. Hash the password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // 3. Upsert the admin user
        const { data: user, error: userError } = await supabase
            .from('users')
            .upsert({
                username,
                email,
                password_hash,
                full_name: 'System Administrator',
                role_id: role.id,
                is_active: true
            }, { onConflict: 'email' })
            .select()
            .single();

        if (userError) {
            console.error('Error creating admin user:', userError);
            return;
        }

        console.log('Success! Admin user created/updated.');
        console.log('Email:', user.email);
        console.log('Username:', user.username);
        console.log('You can now login with password: M@dison_88');

    } catch (error) {
        console.error('Unexpected error:', error.message);
    } finally {
        process.exit();
    }
};

bootstrapAdmin();
