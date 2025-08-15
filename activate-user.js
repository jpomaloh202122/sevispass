// Quick script to manually activate a user account
// Usage: node activate-user.js email@example.com

const userEmail = process.argv[2];

if (!userEmail) {
  console.log('Usage: node activate-user.js email@example.com');
  process.exit(1);
}

const activateUser = async (email) => {
  try {
    const response = await fetch('http://localhost:3000/api/debug/manual-activate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Account activated successfully!');
      console.log('Email:', email);
      console.log('Status:', result.message);
      if (result.newStatus) {
        console.log('New Status:', result.newStatus);
      }
    } else {
      console.log('❌ Failed to activate account');
      console.log('Error:', result.message);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    console.log('\n💡 Make sure the development server is running (npm run dev)');
  }
};

console.log(`🔄 Attempting to activate account for: ${userEmail}`);
activateUser(userEmail);