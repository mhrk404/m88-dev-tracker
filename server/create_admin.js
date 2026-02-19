const registerAdmin = async () => {
    const payload = {
        username: 'admin_m88',
        email: 'admin_new@madison88.com',
        password: 'M@dison_88',
        full_name: 'Super Admin',
        department: 'ADMIN',
        role_code: 'ADMIN'
    };

    try {
        console.log('Attempting to register new admin via API...');
        const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Success! Admin created.');
            console.log('User:', data.user);
            console.log('Token:', data.token);
        } else {
            console.error('Failed to create admin:', data.error || data);
        }
    } catch (error) {
        console.error('Error connecting to API:', error.message);
        console.log('Make sure your server is running on port 5000 (npm run dev)');
    }
};

registerAdmin();
