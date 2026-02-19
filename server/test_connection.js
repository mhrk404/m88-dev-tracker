import { supabase } from './config/supabase.js';

async function testConnection() {
  console.log('Testing Supabase connection...');
  console.log('URL:', process.env.SUPABASE_URL);
  
  try {
    // Test 1: Basic connection
    const { data: testData, error: testError } = await supabase
      .from('roles')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error connecting to Supabase:', testError);
      return;
    }
    
    console.log('✅ Successfully connected to Supabase');
    console.log('Roles table query successful:', testData);
    
    // Test 2: Check users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, email, role_id')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Users table error:', usersError);
    } else {
      console.log('✅ Users table accessible');
      console.log(`Found ${users.length} users`);
    }
    
    // Test 3: Check sample_development table
    const { data: sampleDev, error: sampleDevError } = await supabase
      .from('sample_development')
      .select('*')
      .limit(1);
    
    if (sampleDevError) {
      console.error('❌ sample_development table error:', sampleDevError.message);
      console.error('This likely means migration 010 hasn\'t been run yet');
    } else {
      console.log('✅ sample_development table accessible');
      
      // Check if new columns exist
      if (sampleDev && sampleDev.length > 0) {
        const row = sampleDev[0];
        const newFields = ['fty_target_sample', 'sample_proceeded', 'fty_psi_btp_discrepancy'];
        const missing = newFields.filter(f => !(f in row));
        
        if (missing.length > 0) {
          console.warn('⚠️  Missing new columns:', missing);
          console.warn('Run migration 010 to add these columns');
        } else {
          console.log('✅ All new columns present');
        }
      }
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testConnection();
