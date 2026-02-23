#!/usr/bin/env node

const SUPABASE_URL = process.env.SUPABASE_URL || "https://tpxgfjevorhdtwkesvcb.supabase.co";
const FUNCTION_NAME = process.env.FUNCTION_NAME || "make-server-44a642d3";
const ROUTE_PREFIX = process.env.ROUTE_PREFIX || "";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}${ROUTE_PREFIX}`;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRweGdmamV2b3JoZHR3a2VzdmNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNDE3MjIsImV4cCI6MjA4NjgxNzcyMn0.K50o48WDbgmWvASexy3SCX2XfWiP_WQtCAkou49aFO8";
const PUBLIC_HEADERS = {
  "Content-Type": "application/json",
  "apikey": ANON_KEY,
  "Authorization": `Bearer ${ANON_KEY}`,
};

async function test() {
  console.log("🧪 Testing new backend endpoints...\n");

  try {
    // Test 1: Health check
    console.log("✅ Test 1: Health Check");
    let res = await fetch(`${FUNCTION_URL}/health`, {
      headers: {
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${ANON_KEY}`,
      },
    });
    let data = await res.json();
    console.log(`Status: ${res.status}`, data);
    console.log();

    // Test 2: Sign up with new fields
    console.log("✅ Test 2: Sign up with new fields (username, gender, invitationCode)");
    res = await fetch(`${FUNCTION_URL}/signup`, {
      method: "POST",
      headers: PUBLIC_HEADERS,
      body: JSON.stringify({
        email: `user_${Date.now()}@tank.local`,
        password: "Password123",
        name: "Test User",
        withdrawalPassword: "WithdrawPass123",
        gender: "male",
      }),
    });
    data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log("Response:", JSON.stringify(data, null, 2));
    
    if (data.user) {
      const userId = data.user.id;
      const inviteCode = data.user.invitationCode;
      const userEmail = data.user.email;
      console.log(`✓ New user created with ID: ${userId}`);
      console.log(`✓ Generated invitation code: ${inviteCode}\n`);

      // Test 3: Sign in
      console.log("✅ Test 3: Sign in");
      res = await fetch(`${FUNCTION_URL}/signin`, {
        method: "POST",
        headers: PUBLIC_HEADERS,
        body: JSON.stringify({
          email: userEmail,
          password: "Password123",
        }),
      });
      data = await res.json();
      console.log(`Status: ${res.status}`);
      
      if (data.session) {
        const accessToken = data.session.access_token;
        console.log(`✓ Sign in successful`);
        console.log(`✓ Access token: ${accessToken.substring(0, 20)}...\n`);

        // Test 4: Get profile
        console.log("✅ Test 4: Get profile (should include new fields)");
        res = await fetch(`${FUNCTION_URL}/profile`, {
          headers: { "Authorization": `Bearer ${accessToken}` },
        });
        data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log("Profile:", JSON.stringify(data.profile, null, 2));
        console.log();

        // Test 5: Get earnings
        console.log("✅ Test 5: Get earnings (new endpoint)");
        res = await fetch(`${FUNCTION_URL}/earnings`, {
          headers: { "Authorization": `Bearer ${accessToken}` },
        });
        data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log("Earnings:", JSON.stringify(data.earnings, null, 2));
        console.log();

        // Test 6: Submit product with commission
        console.log("✅ Test 6: Submit product (80% to user, 20% would go to parent)");
        res = await fetch(`${FUNCTION_URL}/submit-product`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}` 
          },
          body: JSON.stringify({
            productName: "Test Product",
            productValue: 1000,
          }),
        });
        data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log("Result:", JSON.stringify(data, null, 2));
        console.log();

        // Test 7: Check earnings again
        console.log("✅ Test 7: Get earnings after product submission");
        res = await fetch(`${FUNCTION_URL}/earnings`, {
          headers: { "Authorization": `Bearer ${accessToken}` },
        });
        data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log("Updated earnings:", JSON.stringify(data.earnings, null, 2));
        console.log();

        // Test 8: Get referrals (should be empty as no children yet)
        console.log("✅ Test 8: Get referrals");
        res = await fetch(`${FUNCTION_URL}/referrals`, {
          headers: { "Authorization": `Bearer ${accessToken}` },
        });
        data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log("Referrals:", JSON.stringify(data, null, 2));
        console.log();

        // Test 9: Sign up child with parent's invitation code
        console.log("✅ Test 9: Sign up child user using parent's invitation code");
        res = await fetch(`${FUNCTION_URL}/signup`, {
          method: "POST",
          headers: PUBLIC_HEADERS,
          body: JSON.stringify({
            email: `child_${Date.now()}@tank.local`,
            password: "ChildPass123",
            name: "Child User",
            withdrawalPassword: "ChildWithdraw123",
            gender: "female",
            invitationCode: inviteCode,
          }),
        });
        data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log("Child signup response:", JSON.stringify(data, null, 2));
        
        if (data.user) {
          const childAccessToken = data.session?.access_token;
          console.log(`✓ Child user created: ${data.user.id}`);
          console.log(`✓ Child linked to parent: ${data.user.parentUserId || "N/A"}\n`);

          // Test 10: Check referrals again (should show child)
          console.log("✅ Test 10: Get referrals (parent view - should show child)");
          res = await fetch(`${FUNCTION_URL}/referrals`, {
            headers: { "Authorization": `Bearer ${accessToken}` },
          });
          data = await res.json();
          console.log(`Status: ${res.status}`);
          console.log("Referrals with child:", JSON.stringify(data, null, 2));
          console.log();

          // Test 11: Child submits product
          if (childAccessToken) {
            console.log("✅ Test 11: Child submits product (20% commission to parent)");
            res = await fetch(`${FUNCTION_URL}/submit-product`, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${childAccessToken}` 
              },
              body: JSON.stringify({
                productName: "Child Product",
                productValue: 500,
              }),
            });
            data = await res.json();
            console.log(`Status: ${res.status}`);
            console.log("Result:", JSON.stringify(data, null, 2));
            console.log();

            // Test 12: Check parent earnings (should include commission)
            console.log("✅ Test 12: Parent check earnings (should include child commission)");
            res = await fetch(`${FUNCTION_URL}/earnings`, {
              headers: { "Authorization": `Bearer ${accessToken}` },
            });
            data = await res.json();
            console.log(`Status: ${res.status}`);
            console.log("Parent earnings with commission:", JSON.stringify(data.earnings, null, 2));
          }
        }
      }
    }

    console.log("\n✨ All tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

test();
