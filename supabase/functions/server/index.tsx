import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as jose from "npm:jose";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Create singleton Supabase clients
let serviceClient: any = null;
let anonClient: any = null;

const getServiceClient = () => {
  if (!serviceClient) {
    serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return serviceClient;
};

const getAnonClient = () => {
  if (!anonClient) {
    anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return anonClient;
};

const getAdminApiKey = () => Deno.env.get('SUPABASE_ADMIN_API_KEY') ?? '';

const getProjectRefFromUrl = (): string | null => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/i);
  return match?.[1] ?? null;
};

const isValidAnonProjectToken = async (token: string): Promise<boolean> => {
  if (!token) {
    return false;
  }

  const projectRef = getProjectRefFromUrl();

  const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET');
  if (jwtSecret) {
    try {
      const secret = new TextEncoder().encode(jwtSecret);
      const { payload } = await jose.jwtVerify(token, secret);
      const payloadRole = payload?.role;
      const payloadRef = payload?.ref;
      return payloadRole === 'anon' && (!projectRef || payloadRef === projectRef);
    } catch {
      // Fall through to decoded payload check below
    }
  }

  try {
    const payload = jose.decodeJwt(token);
    const payloadRole = payload?.role;
    const payloadRef = payload?.ref;
    return payloadRole === 'anon' && (!projectRef || payloadRef === projectRef);
  } catch {
    return false;
  }
};

const requireAdminKey = async (c: any): Promise<{ ok: true } | { ok: false; response: any }> => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return { ok: false, response: c.json({ error: 'Unauthorized - Missing authorization header' }, 401) };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const expectedKey = getAdminApiKey();

  if (expectedKey && token === expectedKey) {
    return { ok: true };
  }

  if (await isValidAnonProjectToken(token)) {
    return { ok: true };
  }

  return { ok: false, response: c.json({ error: 'Forbidden - Invalid admin key' }, 403) };
};

// Helper function to verify JWT token and extract user ID
async function verifyJWT(token: string): Promise<{ userId: string | null; error: string | null }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  // Primary verification: ask Supabase Auth to validate token and return current user
  // This is the most reliable path when JWT signing is asymmetric.
  try {
    if (supabaseUrl && supabaseAnonKey) {
      const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (authResponse.ok) {
        const authUser = await authResponse.json();
        if (authUser?.id) {
          return { userId: authUser.id, error: null };
        }
      } else {
        const authErrorText = await authResponse.text();
        console.error('Supabase Auth API verification failed:', authResponse.status, authErrorText);
      }
    }
  } catch (error) {
    console.error('Supabase Auth API verification error:', error);
  }
  
  // Use ANON client to verify tokens (not service client!)
  // Tokens generated with anon key must be verified with anon key
  try {
    const supabase = getAnonClient();
    
    // Set the auth token for this request
    const { data: { user }, error: supabaseError } = await supabase.auth.getUser(token);
    
    if (user && !supabaseError) {
      return { userId: user.id, error: null };
    }
    
    if (supabaseError) {
      console.error('Anon client error:', supabaseError);
    }
  } catch (error) {
    console.error('Supabase anon client verification failed:', error);
  }

  // Try manual JWT verification as fallback
  try {
    const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET');

    if (jwtSecret) {
      const secret = new TextEncoder().encode(jwtSecret);
      const { payload } = await jose.jwtVerify(token, secret);
      const userId = payload.sub;
      const audience = payload.aud;
      const role = payload.role;

      if (userId && audience === 'authenticated' && role === 'authenticated') {
        return { userId, error: null };
      }
    }
  } catch (error) {
    console.error('Manual JWT verification failed:', error.message);
  }

  // Optional final fallback: decode JWT payload and validate strict claims.
  // Disabled by default because decoded JWT payload is not cryptographically verified.
  try {
    const allowUnverifiedFallback = (Deno.env.get('ALLOW_UNVERIFIED_JWT_FALLBACK') || '').toLowerCase() === 'true';
    if (!allowUnverifiedFallback) {
      return { userId: null, error: 'Invalid or expired token' };
    }

    const payload = jose.decodeJwt(token);
    const now = Math.floor(Date.now() / 1000);
    const projectRef = getProjectRefFromUrl();

    const subject = payload?.sub;
    const expiry = payload?.exp;
    const issuer = payload?.iss;
    const audience = payload?.aud;
    const role = payload?.role;
    const tokenRef = payload?.ref;

    const isExpired = typeof expiry === 'number' ? expiry <= now : true;
    const isExpectedAudience = audience === 'authenticated';
    const isExpectedRole = role === 'authenticated';
    const isExpectedIssuer = typeof issuer === 'string' && issuer.startsWith(`${supabaseUrl}/auth/v1`);
    const isExpectedRef = !projectRef || tokenRef === projectRef;

    if (subject && !isExpired && isExpectedAudience && isExpectedRole && isExpectedIssuer && isExpectedRef) {
      return { userId: subject, error: null };
    }
  } catch (error) {
    console.error('Decoded JWT fallback failed:', error.message);
  }

  return { userId: null, error: 'Invalid or expired token' };
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// Generate a unique invitation code
const generateInvitationCode = async (): Promise<string> => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Check if code already exists
  const existing = await kv.get(`invitecode:${code}`);
  if (existing) {
    return generateInvitationCode();
  }
  
  return code;
};

// Email service for sending notifications
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const SENDER_EMAIL = 'notifications@platform.com';

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log(`[Email Skipped - No API Key] To: ${to}, Subject: ${subject}`);
    return true; // Don't fail if no API key, just log
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      console.error(`Email send failed: ${response.statusText}`, await response.text());
      return false;
    }

    console.log(`✓ Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error(`Email send error: ${error}`);
    return false;
  }
}

// Email templates
const emailTemplates = {
  withdrawalRequested: (userName: string, amount: number) => ({
    subject: '💰 Withdrawal Request Submitted',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Withdrawal Request Submitted</h2>
        <p>Hi ${userName},</p>
        <p>Your withdrawal request has been received and is pending admin approval.</p>
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
          <p><strong>Status:</strong> <span style="color: #f59e0b;">Pending Approval</span></p>
        </div>
        <p>You will receive another email once your withdrawal has been approved or denied.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  }),

  withdrawalApproved: (userName: string, amount: number) => ({
    subject: '✅ Withdrawal Approved',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Withdrawal Approved!</h2>
        <p>Hi ${userName},</p>
        <p>Great news! Your withdrawal request has been approved.</p>
        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
          <p><strong>Status:</strong> <span style="color: #10b981;">✓ Approved</span></p>
        </div>
        <p>The funds will be processed and transferred to your account within 1-2 business days.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  }),

  withdrawalDenied: (userName: string, amount: number, reason: string) => ({
    subject: '❌ Withdrawal Request Denied',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Withdrawal Request Denied</h2>
        <p>Hi ${userName},</p>
        <p>Unfortunately, your withdrawal request has been denied.</p>
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
          <p><strong>Status:</strong> <span style="color: #ef4444;">Denied</span></p>
          <p><strong>Reason:</strong> ${reason}</p>
        </div>
        <p>Your account balance remains unchanged. You can contact support for more information.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  }),

  newReferral: (userName: string, referralName: string, referralEmail: string) => ({
    subject: '🎉 New Referral Signup - Start Earning Commissions',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Referral Signup!</h2>
        <p>Hi ${userName},</p>
        <p>Congratulations! Someone signed up using your referral code.</p>
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>New Member:</strong> ${referralName}</p>
          <p><strong>Email:</strong> ${referralEmail}</p>
        </div>
        <p>You'll now earn 20% commission on every product they submit! The more they earn, the more you earn. 💰</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  }),

  commissionEarned: (userName: string, amount: number, source: string) => ({
    subject: `💵 Commission Earned: $${amount.toFixed(2)}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Commission Earned!</h2>
        <p>Hi ${userName},</p>
        <p>You've earned a commission from your network!</p>
        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
          <p><strong>Source:</strong> ${source}</p>
        </div>
        <p>This has been added to your account balance. Keep building your network to earn more! 📈</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  }),

  welcomeNewUser: (userName: string, invitationCode: string) => ({
    subject: '👋 Welcome! Start Earning Today',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome, ${userName}!</h2>
        <p>Your account has been created successfully. You're now ready to start earning!</p>
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Your Referral Code:</strong></p>
          <p style="font-size: 18px; font-weight: bold; color: #2563eb; font-family: monospace;">${invitationCode}</p>
          <p style="font-size: 12px; color: #666;">Share this code with others - you'll earn 20% commission on their purchases!</p>
        </div>
        <p>Next steps:</p>
        <ul style="color: #666;">
          <li>Submit your first product to start earning</li>
          <li>Share your referral code to build your network</li>
          <li>Watch your commissions grow as your team earns</li>
        </ul>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  }),
};

// Sign up endpoint
app.post("/signup", async (c) => {
  try {
    const { email, password, name, withdrawalPassword, gender, invitationCode } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: "Email, password, and name are required" }, 400);
    }

    const supabase = getServiceClient();

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      // Check if user already exists - this is a common scenario, not an error
      if (error.message.includes('already been registered')) {
        console.log(`Info: User with email ${email} already exists - directing to sign in`);
        return c.json({ error: 'A user with this email address has already been registered' }, 400);
      }
      
      console.error(`Error during user signup: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    const userId = data.user.id;
    
    // Generate invitation code for this user
    const userInvitationCode = await generateInvitationCode();
    
    // Validate parent invitation code if provided
    let parentUserId: string | null = null;
    if (invitationCode) {
      const parentInfo = await kv.get(`invitecode:${invitationCode}`);
      if (parentInfo && parentInfo.userId) {
        parentUserId = parentInfo.userId;
      }
    }

    // Create user profile in KV store
    const userProfile = {
      id: userId,
      email,
      name,
      vipTier: 'Normal',
      gender: gender || 'male',
      withdrawalPassword: withdrawalPassword || '',
      invitationCode: userInvitationCode,
      parentUserId: parentUserId || null,
      childCount: 0,
      totalProfitFromChildren: 0,
      balance: 0,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`user:${userId}`, userProfile);
    
    // Store invitation code mapping
    await kv.set(`invitecode:${userInvitationCode}`, {
      userId,
      email,
      name,
      createdAt: new Date().toISOString(),
    });

    // Initialize default metrics for the user
    await kv.set(`metrics:${userId}`, {
      alertCompressionRatio: 85,
      ticketReductionRate: 62,
      mttrImprovement: 45,
      automationCoverage: 78,
    });

    // Initialize profit tracking
    await kv.set(`profits:${userId}`, {
      totalEarned: 0,
      fromDirectChildren: 0,
      fromIndirectReferrals: 0,
      lastUpdated: new Date().toISOString(),
    });

    // If there's a parent, update their child count
    if (parentUserId) {
      const parentProfile = await kv.get(`user:${parentUserId}`);
      if (parentProfile) {
        parentProfile.childCount = (parentProfile.childCount || 0) + 1;
        await kv.set(`user:${parentUserId}`, parentProfile);
      }
      
      // Log the referral relationship
      await kv.set(`referral:${parentUserId}:${userId}`, {
        parentId: parentUserId,
        childId: userId,
        childEmail: email,
        childName: name,
        createdAt: new Date().toISOString(),
        totalSharedProfit: 0,
      });

      // Send email to parent about new referral
      const parentProfileForEmail = await kv.get(`user:${parentUserId}`);
      if (parentProfileForEmail?.email && parentProfileForEmail?.emailNotifications !== false) {
        const template = emailTemplates.newReferral(parentProfileForEmail.name, name, email);
        await sendEmail(parentProfileForEmail.email, template.subject, template.html);
      }
    }

    // Send welcome email to new user
    const template = emailTemplates.welcomeNewUser(name, userInvitationCode);
    await sendEmail(email, template.subject, template.html);

    return c.json({ 
      success: true, 
      user: { 
        id: userId, 
        email, 
        name,
        invitationCode: userInvitationCode,
        vipTier: 'Normal' 
      } 
    });
  } catch (error) {
    console.error(`Signup error: ${error}`);
    return c.json({ error: "Internal server error during signup" }, 500);
  }
});

// Sign in endpoint (handled by Supabase client, but we can add a custom route if needed)
app.post("/signin", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const supabase = getAnonClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(`Error during user signin: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ 
      success: true,
      session: data.session,
      user: data.user,
    });
  } catch (error) {
    console.error(`Signin error: ${error}`);
    return c.json({ error: "Internal server error during signin" }, 500);
  }
});

// Get user profile (protected route)
app.get("/profile", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    console.log('=== Profile Request Debug ===');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    console.log('Token length:', accessToken.length);
    console.log('Token first 20 chars:', accessToken.substring(0, 20));
    
    // Verify JWT token
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      console.error(`Authorization error while fetching profile: ${error}`);
      return c.json({ error: "Unauthorized - Invalid token", code: 401, message: error }, 401);
    }

    // Get user profile from KV store
    const profile = await kv.get(`user:${userId}`);
    
    if (!profile) {
      // If profile doesn't exist in KV, create it from user metadata
      const newProfile = {
        id: userId,
        email: accessToken, // Use token as email placeholder
        name: 'User', // Default name
        vipTier: 'Normal',
        createdAt: new Date().toISOString(),
      };
      await kv.set(`user:${userId}`, newProfile);
      console.log('Created new profile for user:', userId);
      return c.json({ success: true, profile: newProfile });
    }

    console.log('Profile found for user:', userId);
    return c.json({ success: true, profile });
  } catch (error) {
    console.error(`Error fetching profile: ${error}`);
    return c.json({ error: "Internal server error while fetching profile" }, 500);
  }
});

// Get user metrics (protected route)
app.get("/metrics", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      console.error(`Authorization error while fetching metrics: ${error}`);
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    // Get metrics from KV store
    const metrics = await kv.get(`metrics:${userId}`);
    
    if (!metrics) {
      // Create default metrics if not found
      const defaultMetrics = {
        alertCompressionRatio: 85,
        ticketReductionRate: 62,
        mttrImprovement: 45,
        automationCoverage: 78,
      };
      await kv.set(`metrics:${userId}`, defaultMetrics);
      return c.json({ success: true, metrics: defaultMetrics });
    }

    return c.json({ success: true, metrics });
  } catch (error) {
    console.error(`Error fetching metrics: ${error}`);
    return c.json({ error: "Internal server error while fetching metrics" }, 500);
  }
});

// Update VIP tier (protected route - for admin or self-service)
app.put("/vip-tier", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      console.error(`Authorization error while updating VIP tier: ${error}`);
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    const { vipTier } = await c.req.json();

    if (!vipTier) {
      return c.json({ error: "VIP tier is required" }, 400);
    }

    // Get current profile
    const profile = await kv.get(`user:${userId}`);
    
    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    // Update VIP tier
    const updatedProfile = { ...profile, vipTier };
    await kv.set(`user:${userId}`, updatedProfile);

    return c.json({ success: true, profile: updatedProfile });
  } catch (error) {
    console.error(`Error updating VIP tier: ${error}`);
    return c.json({ error: "Internal server error while updating VIP tier" }, 500);
  }
});

// Admin: list users and platform metrics
app.get("/admin/users", async (c) => {
  try {
    const adminCheck = await requireAdminKey(c);
    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const rawUsers = await kv.getByPrefix('user:');
    const users = (rawUsers ?? []).map((user: any) => ({
      id: user?.id ?? '',
      email: user?.email ?? '',
      name: user?.name ?? 'User',
      vipTier: user?.vipTier ?? 'Normal',
      balance: Number(user?.balance ?? 0),
      productsSubmitted: Number(user?.productsSubmitted ?? 0),
      accountFrozen: Boolean(user?.accountFrozen ?? false),
      freezeAmount: Number(user?.freezeAmount ?? 0),
      createdAt: user?.createdAt ?? new Date().toISOString(),
    }));

    const metrics = {
      totalUsers: users.length,
      totalRevenue: users.reduce((sum: number, user: any) => sum + Math.max(0, Number(user.balance) || 0), 0),
      totalTransactions: users.reduce((sum: number, user: any) => sum + (Number(user.productsSubmitted) || 0), 0),
      activeUsers: users.filter((user: any) => !user.accountFrozen).length,
      frozenAccounts: users.filter((user: any) => user.accountFrozen).length,
      totalCommissionsPaid: 0,
    };

    return c.json({ success: true, users, metrics });
  } catch (error) {
    console.error(`Error fetching admin users: ${error}`);
    return c.json({ error: 'Internal server error while fetching admin users' }, 500);
  }
});

// Admin: unfreeze a user account
app.post("/admin/unfreeze", async (c) => {
  try {
    const adminCheck = await requireAdminKey(c);
    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const { userId } = await c.req.json();
    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const key = `user:${userId}`;
    const user = await kv.get(key);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const currentBalance = Number(user?.balance ?? 0);
    const freezeAmount = Number(user?.freezeAmount ?? 0);
    const nextBalance = user?.accountFrozen
      ? Math.abs(currentBalance) + freezeAmount + 150
      : currentBalance;

    const updatedUser = {
      ...user,
      accountFrozen: false,
      balance: nextBalance,
      freezeAmount: 0,
      unfrozenAt: new Date().toISOString(),
    };

    await kv.set(key, updatedUser);

    return c.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error(`Error unfreezing account: ${error}`);
    return c.json({ error: 'Internal server error while unfreezing account' }, 500);
  }
});

// Admin: assign premium product to a user
app.post("/admin/premium", async (c) => {
  try {
    const adminCheck = await requireAdminKey(c);
    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const { userId, amount, position } = await c.req.json();
    if (!userId || amount === undefined || position === undefined) {
      return c.json({ error: 'userId, amount, and position are required' }, 400);
    }

    const premiumAmount = Number(amount);
    const premiumPosition = Number(position);

    if (!Number.isFinite(premiumAmount) || premiumAmount <= 0) {
      return c.json({ error: 'amount must be a positive number' }, 400);
    }

    if (!Number.isInteger(premiumPosition) || premiumPosition <= 0) {
      return c.json({ error: 'position must be a positive integer' }, 400);
    }

    const key = `user:${userId}`;
    const user = await kv.get(key);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const currentBalance = Number(user?.balance ?? 0);
    const boostedCommission = premiumAmount;
    const shouldFreeze = premiumAmount > currentBalance;

    const updatedUser = {
      ...user,
      productsSubmitted: Number(user?.productsSubmitted ?? 0) + 1,
      premiumAssignment: {
        amount: premiumAmount,
        position: premiumPosition,
        assignedAt: new Date().toISOString(),
      },
      accountFrozen: shouldFreeze,
      freezeAmount: shouldFreeze ? premiumAmount : 0,
      balance: shouldFreeze
        ? -(premiumAmount - currentBalance)
        : currentBalance + boostedCommission,
    };

    await kv.set(key, updatedUser);

    return c.json({
      success: true,
      user: updatedUser,
      result: {
        boostedCommission,
        frozen: shouldFreeze,
      },
    });
  } catch (error) {
    console.error(`Error assigning premium product: ${error}`);
    return c.json({ error: 'Internal server error while assigning premium product' }, 500);
  }
});

// Admin: update a user's VIP tier
app.put("/admin/vip-tier", async (c) => {
  try {
    const adminCheck = await requireAdminKey(c);
    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const { userId, vipTier } = await c.req.json();
    if (!userId || !vipTier) {
      return c.json({ error: 'userId and vipTier are required' }, 400);
    }

    const allowedTiers = ['Normal', 'Silver', 'Gold', 'Platinum', 'Diamond'];
    if (!allowedTiers.includes(vipTier)) {
      return c.json({ error: 'Invalid vipTier value' }, 400);
    }

    const key = `user:${userId}`;
    const user = await kv.get(key);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const updatedUser = {
      ...user,
      vipTier,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(key, updatedUser);

    return c.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error(`Error updating admin VIP tier: ${error}`);
    return c.json({ error: 'Internal server error while updating VIP tier' }, 500);
  }
});

// Admin: list all premium assignments
app.get("/admin/premium/list", async (c) => {
  try {
    const adminCheck = await requireAdminKey(c);
    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const allUsers = await kv.getByPrefix('user:');
    const premiumAssignments = [];

    for (const user of allUsers) {
      if (user?.premiumAssignment) {
        premiumAssignments.push({
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          assignment: user.premiumAssignment,
          currentBalance: user.balance,
          accountFrozen: user.accountFrozen,
          freezeAmount: user.freezeAmount,
        });
      }
    }

    return c.json({
      success: true,
      total: premiumAssignments.length,
      assignments: premiumAssignments,
    });
  } catch (error) {
    console.error(`Error listing premium assignments: ${error}`);
    return c.json({ error: 'Internal server error while listing premium assignments' }, 500);
  }
});

// Admin: revoke premium assignment from a user
app.post("/admin/premium/revoke", async (c) => {
  try {
    const adminCheck = await requireAdminKey(c);
    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const { userId } = await c.req.json();
    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const key = `user:${userId}`;
    const user = await kv.get(key);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (!user?.premiumAssignment) {
      return c.json({ error: 'User has no active premium assignment' }, 400);
    }

    const oldAssignment = user.premiumAssignment;
    const updatedUser = {
      ...user,
      premiumAssignment: null,
      accountFrozen: false,
      freezeAmount: 0,
      premiumRevoked: {
        originalAmount: oldAssignment.amount,
        revokedAt: new Date().toISOString(),
      },
    };

    await kv.set(key, updatedUser);

    return c.json({
      success: true,
      message: `Premium assignment revoked for user ${userId}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error(`Error revoking premium assignment: ${error}`);
    return c.json({ error: 'Internal server error while revoking premium assignment' }, 500);
  }
});

// Admin: get premium analytics
app.get("/admin/premium/analytics", async (c) => {
  try {
    const adminCheck = await requireAdminKey(c);
    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const allUsers = await kv.getByPrefix('user:');
    let totalAssignments = 0;
    let totalPremiumValue = 0;
    let frozenAccounts = 0;
    const assignments = [];

    for (const user of allUsers) {
      if (user?.premiumAssignment) {
        totalAssignments++;
        totalPremiumValue += user.premiumAssignment.amount;
        assignments.push({
          userId: user.id,
          amount: user.premiumAssignment.amount,
          position: user.premiumAssignment.position,
          assignedAt: user.premiumAssignment.assignedAt,
          isFrozen: user.accountFrozen,
        });

        if (user.accountFrozen) {
          frozenAccounts++;
        }
      }
    }

    const avgValue = totalAssignments > 0 ? totalPremiumValue / totalAssignments : 0;

    return c.json({
      success: true,
      analytics: {
        totalAssignments,
        totalPremiumValue,
        averageValue: avgValue,
        frozenAccounts,
        unfrozenAccounts: totalAssignments - frozenAccounts,
        assignments: assignments.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()),
      },
    });
  } catch (error) {
    console.error(`Error fetching premium analytics: ${error}`);
    return c.json({ error: 'Internal server error while fetching premium analytics' }, 500);
  }
});

// Submit product with profit sharing (protected route)
app.post("/submit-product", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      console.error(`Authorization error while submitting product: ${error}`);
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    const { productName, productValue } = await c.req.json();

    if (!productName || !productValue || productValue <= 0) {
      return c.json({ error: "Product name and positive value are required" }, 400);
    }

    // Get user profile
    const userProfile = await kv.get(`user:${userId}`);
    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    // Calculate profit distribution
    const profitAmount = productValue * 0.8; // 80% to user

    // Update user balance
    const updatedProfile = {
      ...userProfile,
      balance: (userProfile.balance || 0) + profitAmount,
    };
    await kv.set(`user:${userId}`, updatedProfile);

    // Update user profits record
    const userProfits = await kv.get(`profits:${userId}`) || {
      totalEarned: 0,
      fromDirectChildren: 0,
      fromIndirectReferrals: 0,
      byLevel: {},
    };
    userProfits.totalEarned = (userProfits.totalEarned || 0) + profitAmount;
    await kv.set(`profits:${userId}`, userProfits);

    // Multi-level commission cascade
    let currentParentId = userProfile.parentUserId;
    let commissionAmount = productValue * 0.2; // Start with 20% for direct parent
    let level = 1;
    const commissionLog = [];

    while (currentParentId && level <= 10) { // Limit to 10 levels
      const parentProfile = await kv.get(`user:${currentParentId}`);
      if (!parentProfile) break;

      // Update parent balance
      parentProfile.balance = (parentProfile.balance || 0) + commissionAmount;
      
      // Track by source
      if (level === 1) {
        parentProfile.totalProfitFromChildren = (parentProfile.totalProfitFromChildren || 0) + commissionAmount;
      } else {
        parentProfile.totalProfitFromChildren = (parentProfile.totalProfitFromChildren || 0) + commissionAmount;
      }
      
      await kv.set(`user:${currentParentId}`, parentProfile);

      // Update parent profits record
      const parentProfits = await kv.get(`profits:${currentParentId}`) || {
        totalEarned: 0,
        fromDirectChildren: 0,
        fromIndirectReferrals: 0,
        byLevel: {},
      };
      
      if (level === 1) {
        parentProfits.fromDirectChildren = (parentProfits.fromDirectChildren || 0) + commissionAmount;
      } else {
        parentProfits.fromIndirectReferrals = (parentProfits.fromIndirectReferrals || 0) + commissionAmount;
      }
      
      parentProfits.totalEarned = (parentProfits.totalEarned || 0) + commissionAmount;
      parentProfits.byLevel = parentProfits.byLevel || {};
      parentProfits.byLevel[`level_${level}`] = (parentProfits.byLevel[`level_${level}`] || 0) + commissionAmount;
      
      await kv.set(`profits:${currentParentId}`, parentProfits);

      // Update referral relationship (for direct parent only)
      if (level === 1) {
        const referralKey = `referral:${currentParentId}:${userId}`;
        const referral = await kv.get(referralKey) || {};
        referral.totalSharedProfit = (referral.totalSharedProfit || 0) + commissionAmount;
        referral.lastProductAt = new Date().toISOString();
        await kv.set(referralKey, referral);
      }

      commissionLog.push({
        level,
        parentId: currentParentId,
        amount: commissionAmount,
      });

      // Get grandparent for next iteration
      const grandparent = parentProfile.parentUserId;
      
      // Reduce commission by 10% for next level (10% of current = cascading down)
      commissionAmount = commissionAmount * 0.1;
      
      currentParentId = grandparent;
      level++;
    }

    // Log product submission
    await kv.set(`product:${userId}:${Date.now()}`, {
      userId,
      productName,
      productValue,
      userEarned: profitAmount,
      commissionsCascade: commissionLog,
      submittedAt: new Date().toISOString(),
    });

    return c.json({
      success: true,
      product: {
        name: productName,
        value: productValue,
        userEarned: profitAmount,
        commissionsCascade: commissionLog,
      },
      newBalance: updatedProfile.balance,
    });
  } catch (error) {
    console.error(`Error submitting product: ${error}`);
    return c.json({ error: "Internal server error while submitting product" }, 500);
  }
});

// Get multi-level earnings breakdown (protected route)
app.get("/earnings-multilevel", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      console.error(`Authorization error while fetching multi-level earnings: ${error}`);
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    // Get user profile
    const userProfile = await kv.get(`user:${userId}`);
    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    // Get profits record
    const profits = await kv.get(`profits:${userId}`) || {
      totalEarned: 0,
      fromDirectChildren: 0,
      fromIndirectReferrals: 0,
      byLevel: {},
    };

    // Count direct children
    const children = [];
    const allReferrals = await kv.getByPrefix(`referral:${userId}:`);
    for (const ref of allReferrals || []) {
      const match = ref?.childId;
      if (match) children.push(ref);
    }

    return c.json({
      success: true,
      earnings: {
        balance: userProfile.balance || 0,
        totalEarned: profits.totalEarned || 0,
        fromDirectChildren: profits.fromDirectChildren || 0,
        fromIndirectReferrals: profits.fromIndirectReferrals || 0,
        childCount: children.length,
        byLevel: profits.byLevel || {},
      },
    });
  } catch (error) {
    console.error(`Error fetching multi-level earnings: ${error}`);
    return c.json({ error: "Internal server error while fetching earnings" }, 500);
  }
});

// Get user earnings and balance (protected route)
app.get("/earnings", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      console.error(`Authorization error while fetching earnings: ${error}`);
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    const profile = await kv.get(`user:${userId}`);
    const profits = await kv.get(`profits:${userId}`);
    const referrals = await kv.getByPrefix(`referral:${userId}:`);

    const childCount = profile?.childCount || 0;
    const totalFromChildren = referrals?.reduce((sum: number, ref: any) => sum + (ref?.totalSharedProfit || 0), 0) || 0;

    return c.json({
      success: true,
      earnings: {
        balance: profile?.balance || 0,
        totalEarned: profits?.totalEarned || 0,
        fromDirectChildren: profits?.fromDirectChildren || 0,
        fromIndirectReferrals: profits?.fromIndirectReferrals || 0,
        childCount,
        totalFromChildren,
        parentUserId: profile?.parentUserId || null,
      },
    });
  } catch (error) {
    console.error(`Error fetching earnings: ${error}`);
    return c.json({ error: "Internal server error while fetching earnings" }, 500);
  }
});

// Get user referrals (protected route)
app.get("/referrals", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      console.error(`Authorization error while fetching referrals: ${error}`);
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    const referrals = await kv.getByPrefix(`referral:${userId}:`);

    const children = (referrals ?? []).map((ref: any) => ({
      childId: ref?.childId,
      childName: ref?.childName,
      childEmail: ref?.childEmail,
      totalSharedProfit: ref?.totalSharedProfit || 0,
      lastProductAt: ref?.lastProductAt || null,
      createdAt: ref?.createdAt,
    }));

    return c.json({
      success: true,
      referrals: children,
      totalChildren: children.length,
    });
  } catch (error) {
    console.error(`Error fetching referrals: ${error}`);
    return c.json({ error: "Internal server error while fetching referrals" }, 500);
  }
});

// Request withdrawal (protected route)
app.post("/request-withdrawal", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      console.error(`Authorization error while requesting withdrawal: ${error}`);
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    const { amount, withdrawalPassword } = await c.req.json();

    if (!amount || amount <= 0) {
      return c.json({ error: "Withdrawal amount must be positive" }, 400);
    }

    // Get user profile
    const userProfile = await kv.get(`user:${userId}`);
    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    // Verify withdrawal password
    if (!withdrawalPassword || withdrawalPassword !== userProfile.withdrawalPassword) {
      return c.json({ error: "Invalid withdrawal password" }, 401);
    }

    // Check sufficient balance
    const balance = userProfile.balance || 0;
    if (amount > balance) {
      return c.json({ error: `Insufficient balance. Available: $${balance.toFixed(2)}` }, 400);
    }

    // Create withdrawal request
    const withdrawalId = `${userId}-${Date.now()}`;
    const withdrawalRequest = {
      id: withdrawalId,
      userId,
      userEmail: userProfile.email,
      userName: userProfile.name,
      amount,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      approvedAt: null,
      deniedAt: null,
      denialReason: null,
    };

    // Store withdrawal request
    await kv.set(`withdrawal:${withdrawalId}`, withdrawalRequest);

    // Add to pending queue
    const pendingWithdrawals = await kv.get('withdrawals:pending') || [];
    pendingWithdrawals.push(withdrawalId);
    await kv.set('withdrawals:pending', pendingWithdrawals);

    // Send email notification
    if (userProfile.email && userProfile.emailNotifications !== false) {
      const template = emailTemplates.withdrawalRequested(userProfile.name, amount);
      await sendEmail(userProfile.email, template.subject, template.html);
    }

    return c.json({
      success: true,
      withdrawal: withdrawalRequest,
      message: 'Withdrawal request submitted. Admin approval required.',
    });
  } catch (error) {
    console.error(`Error requesting withdrawal: ${error}`);
    return c.json({ error: "Internal server error while requesting withdrawal" }, 500);
  }
});

// Get withdrawal history (protected route)
app.get("/withdrawal-history", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      console.error(`Authorization error while fetching withdrawal history: ${error}`);
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    // Get all withdrawals for this user
    const allWithdrawals = await kv.getByPrefix('withdrawal:');
    const userWithdrawals = (allWithdrawals || [])
      .filter((w: any) => w?.userId === userId)
      .sort((a: any, b: any) => 
        new Date(b?.requestedAt || 0).getTime() - new Date(a?.requestedAt || 0).getTime()
      );

    return c.json({
      success: true,
      withdrawals: userWithdrawals,
      totalRequested: userWithdrawals.length,
      totalApproved: userWithdrawals.filter((w: any) => w?.status === 'approved').length,
      totalPending: userWithdrawals.filter((w: any) => w?.status === 'pending').length,
    });
  } catch (error) {
    console.error(`Error fetching withdrawal history: ${error}`);
    return c.json({ error: "Internal server error while fetching withdrawal history" }, 500);
  }
});

// Admin: view pending withdrawal requests
app.get("/admin/withdrawals", async (c) => {
  try {
    const adminCheck = await requireAdminKey(c);
    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const pendingIds = await kv.get('withdrawals:pending') || [];
    const withdrawals = [];

    for (const id of pendingIds) {
      const w = await kv.get(`withdrawal:${id}`);
      if (w && w.status === 'pending') {
        withdrawals.push(w);
      }
    }

    const totalAmount = withdrawals.reduce((sum: number, w: any) => sum + (w?.amount || 0), 0);

    return c.json({
      success: true,
      withdrawals,
      totalPending: withdrawals.length,
      totalAmount,
    });
  } catch (error) {
    console.error(`Error fetching admin withdrawals: ${error}`);
    return c.json({ error: "Internal server error while fetching withdrawals" }, 500);
  }
});

// Admin: approve withdrawal request
app.post("/admin/approve-withdrawal", async (c) => {
  try {
    const adminCheck = await requireAdminKey(c);
    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const { withdrawalId } = await c.req.json();
    if (!withdrawalId) {
      return c.json({ error: 'withdrawalId is required' }, 400);
    }

    const withdrawal = await kv.get(`withdrawal:${withdrawalId}`);
    if (!withdrawal) {
      return c.json({ error: 'Withdrawal request not found' }, 404);
    }

    if (withdrawal.status !== 'pending') {
      return c.json({ error: `Cannot approve withdrawal with status: ${withdrawal.status}` }, 400);
    }

    // Update user balance (deduct withdrawal amount)
    const userProfile = await kv.get(`user:${withdrawal.userId}`);
    if (userProfile) {
      userProfile.balance = (userProfile.balance || 0) - withdrawal.amount;
      await kv.set(`user:${withdrawal.userId}`, userProfile);
    }

    // Update withdrawal request
    withdrawal.status = 'approved';
    withdrawal.approvedAt = new Date().toISOString();
    await kv.set(`withdrawal:${withdrawalId}`, withdrawal);

    // Remove from pending queue
    const pendingIds = await kv.get('withdrawals:pending') || [];
    const updated = pendingIds.filter((id: string) => id !== withdrawalId);
    await kv.set('withdrawals:pending', updated);

    // Add to approved queue
    const approvedIds = await kv.get('withdrawals:approved') || [];
    approvedIds.push(withdrawalId);
    await kv.set('withdrawals:approved', approvedIds);

    // Send email notification
    if (withdrawal.userEmail && userProfile?.emailNotifications !== false) {
      const template = emailTemplates.withdrawalApproved(withdrawal.userName, withdrawal.amount);
      await sendEmail(withdrawal.userEmail, template.subject, template.html);
    }

    return c.json({
      success: true,
      withdrawal,
      message: `Withdrawal of $${withdrawal.amount.toFixed(2)} approved for ${withdrawal.userName}`,
    });
  } catch (error) {
    console.error(`Error approving withdrawal: ${error}`);
    return c.json({ error: "Internal server error while approving withdrawal" }, 500);
  }
});

// Admin: deny withdrawal request
app.post("/admin/deny-withdrawal", async (c) => {
  try {
    const adminCheck = await requireAdminKey(c);
    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const { withdrawalId, denialReason } = await c.req.json();
    if (!withdrawalId) {
      return c.json({ error: 'withdrawalId is required' }, 400);
    }

    const withdrawal = await kv.get(`withdrawal:${withdrawalId}`);
    if (!withdrawal) {
      return c.json({ error: 'Withdrawal request not found' }, 404);
    }

    if (withdrawal.status !== 'pending') {
      return c.json({ error: `Cannot deny withdrawal with status: ${withdrawal.status}` }, 400);
    }

    // Update withdrawal request
    withdrawal.status = 'denied';
    withdrawal.deniedAt = new Date().toISOString();
    withdrawal.denialReason = denialReason || 'Not specified';
    await kv.set(`withdrawal:${withdrawalId}`, withdrawal);

    // Remove from pending queue
    const pendingIds = await kv.get('withdrawals:pending') || [];
    const updated = pendingIds.filter((id: string) => id !== withdrawalId);
    await kv.set('withdrawals:pending', updated);

    // Add to denied queue
    const deniedIds = await kv.get('withdrawals:denied') || [];
    deniedIds.push(withdrawalId);
    await kv.set('withdrawals:denied', deniedIds);

    // Get user profile for email
    const userProfile = await kv.get(`user:${withdrawal.userId}`);

    // Send email notification
    if (withdrawal.userEmail && userProfile?.emailNotifications !== false) {
      const template = emailTemplates.withdrawalDenied(withdrawal.userName, withdrawal.amount, withdrawal.denialReason);
      await sendEmail(withdrawal.userEmail, template.subject, template.html);
    }

    return c.json({
      success: true,
      withdrawal,
      message: `Withdrawal request denied for ${withdrawal.userName}`,
    });
  } catch (error) {
    console.error(`Error denying withdrawal: ${error}`);
    return c.json({ error: "Internal server error while denying withdrawal" }, 500);
  }
});

// Analytics: Get earnings breakdown with trends
app.get("/analytics/earnings", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    const userProfile = await kv.get(`user:${userId}`);
    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    const profits = await kv.get(`profits:${userId}`) || {
      totalEarned: 0,
      fromDirectChildren: 0,
      fromIndirectReferrals: 0,
      byLevel: {},
    };

    // Get all products for earnings trend (last 12 months)
    const products = await kv.getByPrefix(`product:${userId}:`);
    const monthlyEarnings: { [key: string]: number } = {};
    
    for (const product of products || []) {
      if (product?.submittedAt) {
        const date = new Date(product.submittedAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyEarnings[monthKey] = (monthlyEarnings[monthKey] || 0) + (product.userEarned || 0);
      }
    }

    // Sort months chronologically
    const sortedMonths = Object.keys(monthlyEarnings).sort();
    const trendData = sortedMonths.map(month => ({
      month,
      earned: monthlyEarnings[month],
    }));

    return c.json({
      success: true,
      analytics: {
        balance: userProfile.balance || 0,
        totalEarned: profits.totalEarned || 0,
        fromDirectChildren: profits.fromDirectChildren || 0,
        fromIndirectReferrals: profits.fromIndirectReferrals || 0,
        averageMonthlyEarnings: trendData.length > 0 
          ? profits.totalEarned / trendData.length 
          : 0,
        trend: trendData,
        levelBreakdown: profits.byLevel || {},
      },
    });
  } catch (error) {
    console.error(`Error fetching earnings analytics: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Analytics: Get network growth metrics
app.get("/analytics/network", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    const userProfile = await kv.get(`user:${userId}`);
    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    // Get direct referrals
    const directReferrals = await kv.getByPrefix(`referral:${userId}:`);
    const directChildrenCount = directReferrals?.length || 0;

    // Calculate network depth and total commissions from each level
    let totalNetworkSize = directChildrenCount;
    const networkByLevel: { [key: string]: number } = {};
    networkByLevel['level_1'] = directChildrenCount;

    // Get all referrals created by user (for indirect children)
    let indirectCount = 0;
    for (const referral of directReferrals || []) {
      const grandchildrenRefs = await kv.getByPrefix(`referral:${referral.childId}:`);
      indirectCount += grandchildrenRefs?.length || 0;
    }

    totalNetworkSize += indirectCount;
    networkByLevel['level_2'] = indirectCount;

    return c.json({
      success: true,
      network: {
        directChildren: directChildrenCount,
        indirectReferrals: indirectCount,
        totalNetworkSize,
        networkByLevel,
        activePercentage: totalNetworkSize > 0 ? ((directChildrenCount + indirectCount) / totalNetworkSize * 100).toFixed(1) : 0,
      },
    });
  } catch (error) {
    console.error(`Error fetching network analytics: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Analytics: Get top referrers leaderboard
app.get("/analytics/leaderboard", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    // Get all users
    const allUsers = await kv.getByPrefix('user:');
    
    const leaderboard = (allUsers || [])
      .filter((u): u is any => u && u.totalProfitFromChildren !== undefined)
      .map((user) => ({
        userId: user.id,
        name: user.name,
        totalProfitFromChildren: user.totalProfitFromChildren || 0,
        childCount: user.childCount || 0,
        vipTier: user.vipTier || 'Normal',
      }))
      .sort((a, b) => b.totalProfitFromChildren - a.totalProfitFromChildren)
      .slice(0, 50); // Top 50

    // Find user's position
    const userRank = leaderboard.findIndex(u => u.userId === userId) + 1;

    return c.json({
      success: true,
      leaderboard,
      userRank: userRank > 0 ? userRank : null,
    });
  } catch (error) {
    console.error(`Error fetching leaderboard: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Analytics: Get monthly earnings report
app.get("/analytics/monthly-report", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    
    if (error) {
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    // Get all products for this user
    const products = await kv.getByPrefix(`product:${userId}:`);
    
    // Group by month
    const monthlyData: { [key: string]: { products: number; earned: number; fromChildren: number } } = {};
    
    for (const product of products || []) {
      if (product?.submittedAt) {
        const date = new Date(product.submittedAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { products: 0, earned: 0, fromChildren: 0 };
        }
        
        monthlyData[monthKey].products += 1;
        monthlyData[monthKey].earned += product.userEarned || 0;
        if (product.commissionsCascade) {
          const childCommissions = product.commissionsCascade.filter((c: any) => c.level === 1);
          monthlyData[monthKey].fromChildren += childCommissions.reduce((sum: number, c: any) => sum + c.amount, 0);
        }
      }
    }

    const report = Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return c.json({
      success: true,
      monthlyReport: report,
      currentMonth: report[report.length - 1] || null,
    });
  } catch (error) {
    console.error(`Error fetching monthly report: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Bonus Payouts: Get available bonuses and claim status
app.get("/bonus-payouts", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error) return c.json({ error }, 401);

    const user = await kv.get(`user:${userId}`);
    if (!user) return c.json({ error: "User not found" }, 404);

    const claimedBonuses = await kv.get(`bonuses:claimed:${userId}`) || [];
    const userProducts = await kv.getByPrefix(`product:${userId}:`);
    const referrals = await kv.getByPrefix(`referral:${userId}:`);
    
    // Count indirect referrals
    let indirectCount = 0;
    for (const ref of referrals || []) {
      const refChildren = await kv.getByPrefix(`referral:${ref.id}:`);
      indirectCount += refChildren?.length || 0;
    }

    const bonusStructure = [
      { id: "tier_bronze", name: "Bronze Member", requirement: "Reach Bronze VIP", amount: 50, category: "tier", checkFn: () => user.vipTier === "Bronze" },
      { id: "tier_silver", name: "Silver Member", requirement: "Reach Silver VIP", amount: 150, category: "tier", checkFn: () => user.vipTier === "Silver" },
      { id: "tier_gold", name: "Gold Member", requirement: "Reach Gold VIP", amount: 300, category: "tier", checkFn: () => user.vipTier === "Gold" },
      { id: "tier_platinum", name: "Platinum Member", requirement: "Reach Platinum VIP", amount: 500, category: "tier", checkFn: () => user.vipTier === "Platinum" },
      { id: "referral_5", name: "Team Builder", requirement: "Invite 5 direct referrals", amount: 25, category: "network", checkFn: () => (referrals?.length || 0) >= 5 },
      { id: "referral_10", name: "Network Grower", requirement: "Invite 10 direct referrals", amount: 50, category: "network", checkFn: () => (referrals?.length || 0) >= 10 },
      { id: "referral_25", name: "Team Leader", requirement: "Invite 25 direct referrals", amount: 100, category: "network", checkFn: () => (referrals?.length || 0) >= 25 },
      { id: "referral_50", name: "Network Director", requirement: "Invite 50 direct referrals", amount: 200, category: "network", checkFn: () => (referrals?.length || 0) >= 50 },
      { id: "products_10", name: "Product Seller", requirement: "Submit 10 products", amount: 25, category: "sales", checkFn: () => (userProducts?.length || 0) >= 10 },
      { id: "products_50", name: "Top Seller", requirement: "Submit 50 products", amount: 100, category: "sales", checkFn: () => (userProducts?.length || 0) >= 50 },
      { id: "products_100", name: "Super Seller", requirement: "Submit 100 products", amount: 250, category: "sales", checkFn: () => (userProducts?.length || 0) >= 100 },
      { id: "volume_1k", name: "Thousand Dollar Club", requirement: "Earn $1,000 monthly", amount: 100, category: "volume", checkFn: () => (user.balance || 0) >= 1000 },
      { id: "volume_5k", name: "Five Thousand Club", requirement: "Earn $5,000 total", amount: 500, category: "volume", checkFn: () => (user.totalEarned || 0) >= 5000 },
      { id: "volume_10k", name: "Ten Thousand Club", requirement: "Earn $10,000 total", amount: 1000, category: "volume", checkFn: () => (user.totalEarned || 0) >= 10000 },
      { id: "network_depth", name: "Multi-Level Earner", requirement: "Build referrals 2+ levels deep", amount: 200, category: "depth", checkFn: () => indirectCount >= 5 },
    ];

    const availableBonuses = bonusStructure.map((bonus) => {
      const isClaimed = claimedBonuses.some((b: any) => b.id === bonus.id);
      const isEligible = bonus.checkFn();
      
      return {
        id: bonus.id,
        name: bonus.name,
        requirement: bonus.requirement,
        amount: bonus.amount,
        category: bonus.category,
        claimed: isClaimed,
        eligible: isEligible && !isClaimed,
        status: isClaimed ? "claimed" : isEligible ? "ready" : "locked",
      };
    });

    const stats = {
      totalClaimable: availableBonuses.filter(b => b.eligible).length,
      totalClaimed: claimedBonuses.length,
      totalEarned: claimedBonuses.reduce((sum: number, b: any) => sum + b.amount, 0),
      nextBonus: availableBonuses.find(b => b.status === "locked"),
    };

    return c.json({ success: true, bonuses: availableBonuses, stats });
  } catch (error) {
    console.error(`Error fetching bonuses: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Bonus Payouts: Claim a bonus
app.post("/bonus-payouts/claim", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error) return c.json({ error }, 401);

    const { bonusId } = await c.req.json();
    const user = await kv.get(`user:${userId}`);
    if (!user) return c.json({ error: "User not found" }, 404);

    // Fetch claimed bonuses
    const claimedBonuses = await kv.get(`bonuses:claimed:${userId}`) || [];
    if (claimedBonuses.some((b: any) => b.id === bonusId)) {
      return c.json({ error: "Bonus already claimed" }, 400);
    }

    // Define bonus structure
    const bonusMap: any = {
      tier_bronze: { name: "Bronze Member", amount: 50 },
      tier_silver: { name: "Silver Member", amount: 150 },
      tier_gold: { name: "Gold Member", amount: 300 },
      tier_platinum: { name: "Platinum Member", amount: 500 },
      referral_5: { name: "Team Builder", amount: 25 },
      referral_10: { name: "Network Grower", amount: 50 },
      referral_25: { name: "Team Leader", amount: 100 },
      referral_50: { name: "Network Director", amount: 200 },
      products_10: { name: "Product Seller", amount: 25 },
      products_50: { name: "Top Seller", amount: 100 },
      products_100: { name: "Super Seller", amount: 250 },
      volume_1k: { name: "Thousand Dollar Club", amount: 100 },
      volume_5k: { name: "Five Thousand Club", amount: 500 },
      volume_10k: { name: "Ten Thousand Club", amount: 1000 },
      network_depth: { name: "Multi-Level Earner", amount: 200 },
    };

    const bonus = bonusMap[bonusId];
    if (!bonus) return c.json({ error: "Bonus not found" }, 404);

    // Add bonus amount to balance
    user.balance = (user.balance || 0) + bonus.amount;
    user.totalEarned = (user.totalEarned || 0) + bonus.amount;

    // Mark bonus as claimed
    const claimedEntry = {
      id: bonusId,
      name: bonus.name,
      amount: bonus.amount,
      claimedAt: new Date().toISOString(),
    };

    claimedBonuses.push(claimedEntry);

    // Update user and save claim
    await kv.set(`user:${userId}`, user);
    await kv.set(`bonuses:claimed:${userId}`, claimedBonuses);

    // Log bonus claim
    const claimLog = await kv.get(`bonuses:log:${userId}`) || [];
    claimLog.push({
      bonusId,
      bonusName: bonus.name,
      amount: bonus.amount,
      claimedAt: new Date().toISOString(),
      newBalance: user.balance,
    });
    await kv.set(`bonuses:log:${userId}`, claimLog);

    return c.json({
      success: true,
      message: `Bonus "${bonus.name}" claimed! +$${bonus.amount}`,
      newBalance: user.balance,
      totalEarned: user.totalEarned,
    });
  } catch (error) {
    console.error(`Error claiming bonus: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Bonus Payouts: Get claim history
app.get("/bonus-payouts/history", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error) return c.json({ error }, 401);

    const claimLog = await kv.get(`bonuses:log:${userId}`) || [];

    const stats = {
      totalBonusesEarned: claimLog.length,
      totalBonusAmount: claimLog.reduce((sum: number, b: any) => sum + (b.amount || 0), 0),
      averageBonusAmount: claimLog.length > 0 ? Math.round(claimLog.reduce((sum: number, b: any) => sum + (b.amount || 0), 0) / claimLog.length) : 0,
      lastClaimed: claimLog.length > 0 ? claimLog[claimLog.length - 1].claimedAt : null,
    };

    return c.json({
      success: true,
      history: claimLog.sort((a: any, b: any) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime()),
      stats,
    });
  } catch (error) {
    console.error(`Error fetching bonus history: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// =============================================
// CUSTOMER SERVICE SYSTEM
// =============================================

// Support Tickets: Create new ticket
app.post("/support-tickets", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error) return c.json({ error }, 401);

    const { subject, category, message, priority } = await c.req.json();
    const user = await kv.get(`user:${userId}`);
    if (!user) return c.json({ error: "User not found" }, 404);

    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ticket = {
      id: ticketId,
      userId,
      userName: user.name,
      userEmail: user.email,
      subject,
      category,
      message,
      priority: priority || "normal",
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replies: [],
    };

    // Save ticket
    await kv.set(`ticket:${ticketId}`, ticket);

    // Add to user's ticket list
    const userTickets = await kv.get(`tickets:user:${userId}`) || [];
    userTickets.push(ticketId);
    await kv.set(`tickets:user:${userId}`, userTickets);

    // Add to queue for support team
    const ticketQueue = await kv.get(`tickets:queue`) || [];
    ticketQueue.push(ticketId);
    await kv.set(`tickets:queue`, ticketQueue);

    return c.json({
      success: true,
      ticket,
      message: "Support ticket created successfully",
    });
  } catch (error) {
    console.error(`Error creating ticket: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Support Tickets: Get user's tickets
app.get("/support-tickets", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error) return c.json({ error }, 401);

    const userTicketIds = await kv.get(`tickets:user:${userId}`) || [];
    const tickets = [];

    for (const ticketId of userTicketIds) {
      const ticket = await kv.get(`ticket:${ticketId}`);
      if (ticket) tickets.push(ticket);
    }

    const stats = {
      total: tickets.length,
      open: tickets.filter((t: any) => t.status === "open").length,
      inProgress: tickets.filter((t: any) => t.status === "in-progress").length,
      resolved: tickets.filter((t: any) => t.status === "resolved").length,
    };

    return c.json({
      success: true,
      tickets: tickets.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      stats,
    });
  } catch (error) {
    console.error(`Error fetching tickets: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Support Tickets: Get ticket details
app.get("/support-tickets/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error) return c.json({ error }, 401);

    const ticketId = c.req.param('id');
    const ticket = await kv.get(`ticket:${ticketId}`);
    if (!ticket) return c.json({ error: "Ticket not found" }, 404);

    // Check ownership or admin
    if (ticket.userId !== userId) {
      return c.json({ error: "Unauthorized - not your ticket" }, 403);
    }

    return c.json({ success: true, ticket });
  } catch (error) {
    console.error(`Error fetching ticket: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Support Tickets: Reply to ticket
app.post("/support-tickets/:id/reply", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error) return c.json({ error }, 401);

    const ticketId = c.req.param('id');
    const { message } = await c.req.json();
    const user = await kv.get(`user:${userId}`);

    const ticket = await kv.get(`ticket:${ticketId}`);
    if (!ticket) return c.json({ error: "Ticket not found" }, 404);

    if (ticket.userId !== userId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const reply = {
      id: `reply_${Date.now()}`,
      userId,
      userName: user.name,
      message,
      createdAt: new Date().toISOString(),
    };

    ticket.replies.push(reply);
    ticket.updatedAt = new Date().toISOString();

    await kv.set(`ticket:${ticketId}`, ticket);

    return c.json({
      success: true,
      ticket,
      message: "Reply added successfully",
    });
  } catch (error) {
    console.error(`Error adding reply: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Live Chat: Send message
app.post("/chat/messages", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error) return c.json({ error }, 401);

    const { conversationId, message } = await c.req.json();
    const user = await kv.get(`user:${userId}`);

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const msg = {
      id: messageId,
      conversationId,
      userId,
      userName: user.name,
      message,
      createdAt: new Date().toISOString(),
      read: false,
    };

    // Save message
    await kv.set(`message:${messageId}`, msg);

    // Add to conversation
    const convMessages = await kv.get(`chat:messages:${conversationId}`) || [];
    convMessages.push(messageId);
    await kv.set(`chat:messages:${conversationId}`, convMessages);

    return c.json({ success: true, message: msg });
  } catch (error) {
    console.error(`Error sending message: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Live Chat: Get conversations
app.get("/chat/conversations", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error) return c.json({ error }, 401);

    const convIds = await kv.get(`chat:conversations:${userId}`) || [];
    const conversations = [];

    for (const convId of convIds) {
      const conv = await kv.get(`chat:conversation:${convId}`);
      if (conv) {
        // Get last message
        const messageIds = await kv.get(`chat:messages:${convId}`) || [];
        const lastMsgId = messageIds[messageIds.length - 1];
        const lastMsg = lastMsgId ? await kv.get(`message:${lastMsgId}`) : null;

        conversations.push({
          ...conv,
          lastMessage: lastMsg,
          messageCount: messageIds.length,
        });
      }
    }

    return c.json({
      success: true,
      conversations: conversations.sort((a: any, b: any) => 
        new Date(b.lastMessage?.createdAt || b.createdAt).getTime() - 
        new Date(a.lastMessage?.createdAt || a.createdAt).getTime()
      ),
    });
  } catch (error) {
    console.error(`Error fetching conversations: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Live Chat: Get messages in conversation
app.get("/chat/messages", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const { userId, error } = await verifyJWT(accessToken);
    if (error) return c.json({ error }, 401);

    const conversationId = c.req.query('conversationId');
    const messageIds = await kv.get(`chat:messages:${conversationId}`) || [];
    const messages = [];

    for (const msgId of messageIds) {
      const msg = await kv.get(`message:${msgId}`);
      if (msg) messages.push(msg);
    }

    return c.json({
      success: true,
      messages: messages.sort((a: any, b: any) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    });
  } catch (error) {
    console.error(`Error fetching messages: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// FAQ: Get all FAQs
app.get("/faq", async (c) => {
  try {
    const faqs = await kv.get(`faq:all`) || [];
    
    // If no FAQs, return default ones
    if (faqs.length === 0) {
      const defaultFAQs = [
        {
          id: "faq_1",
          category: "Getting Started",
          question: "How do I start earning with this platform?",
          answer: "Create an account, invite people using your referral code, and submit products to earn commissions. You'll earn from your direct referrals and their network.",
          views: 120,
        },
        {
          id: "faq_2",
          category: "Withdrawals",
          question: "How long does a withdrawal take?",
          answer: "Withdrawals are processed within 3-5 business days after admin approval. Processing speed depends on your chosen payment method.",
          views: 89,
        },
        {
          id: "faq_3",
          category: "Commissions",
          question: "How does the commission structure work?",
          answer: "You earn a percentage of profits from products submitted by you and your referrals. Commission rates vary by VIP tier. You also earn 10% commissions cascading down 10 levels.",
          views: 156,
        },
        {
          id: "faq_4",
          category: "VIP Tiers",
          question: "What are VIP tiers and how do I upgrade?",
          answer: "VIP tiers unlock higher commission rates and exclusive bonuses. Upgrade by increasing your lifetime earnings: Bronze ($500), Silver ($2k), Gold ($5k), Platinum ($10k).",
          views: 98,
        },
        {
          id: "faq_5",
          category: "Referrals",
          question: "How do I find and manage my referrals?",
          answer: "Your referral code is in your profile. Share it with friends or on social media. Manage all your referrals in the Referral Manager section with detailed analytics.",
          views: 145,
        },
        {
          id: "faq_6",
          category: "Bonuses",
          question: "How do I earn bonus rewards?",
          answer: "Bonuses unlock automatically as you achieve milestones like VIP tier upgrades, network growth, product submissions, and earning thresholds. Claim them in Bonus Payouts.",
          views: 76,
        },
        {
          id: "faq_7",
          category: "Products",
          question: "What types of products can I submit?",
          answer: "You can submit any legitimate product or service. Each submission earns you a base profit that increases with your VIP tier. Products are subject to approval.",
          views: 103,
        },
        {
          id: "faq_8",
          category: "Support",
          question: "How do I contact support?",
          answer: "You can create a support ticket, use live chat during business hours, or browse our FAQ. Support team typically responds within 24 hours.",
          views: 67,
        },
      ];

      await kv.set(`faq:all`, defaultFAQs);
      return c.json({ success: true, faqs: defaultFAQs });
    }

    return c.json({ success: true, faqs });
  } catch (error) {
    console.error(`Error fetching FAQs: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// FAQ: Search FAQs
app.get("/faq/search", async (c) => {
  try {
    const query = c.req.query('q')?.toLowerCase() || '';
    const category = c.req.query('category');

    const faqs = await kv.get(`faq:all`) || [];

    let results = faqs.filter((faq: any) => {
      const matchQuery = faq.question.toLowerCase().includes(query) || 
                        faq.answer.toLowerCase().includes(query) ||
                        faq.category.toLowerCase().includes(query);
      const matchCategory = !category || faq.category.toLowerCase() === category.toLowerCase();
      return matchQuery && matchCategory;
    });

    // Sort by views (most helpful first)
    results = results.sort((a: any, b: any) => (b.views || 0) - (a.views || 0));

    return c.json({ success: true, results });
  } catch (error) {
    console.error(`Error searching FAQs: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Route compatibility fallback
// Supports legacy prefixed URLs by internally forwarding to canonical routes.
app.all("*", async (c) => {
  const forwarded = c.req.header('x-route-compat-forwarded') === '1';
  const path = c.req.path || '/';

  if (forwarded) {
    return c.json({ error: "Not Found" }, 404);
  }

  // Normalize path by removing a leading function-name segment if present.
  const pathSegments = path.split('/').filter(Boolean);
  const hasFunctionSegment = pathSegments.length > 0 && pathSegments[0].startsWith('make-server-');
  const normalizedPath = hasFunctionSegment
    ? `/${pathSegments.slice(1).join('/')}`
    : path;

  // Compatibility rewrite direction: legacy -> canonical
  const legacyPrefix = '/make-server-44a642d3';
  const canonicalPath = normalizedPath.startsWith(`${legacyPrefix}/`)
    ? normalizedPath.slice(legacyPrefix.length)
    : normalizedPath;

  const safeCanonicalPath = canonicalPath === '/' || canonicalPath === '' ? '' : canonicalPath;

  const url = new URL(c.req.url);
  const rewrittenPath = `${safeCanonicalPath || '/'}`;
  const rewrittenUrl = `${url.origin}${rewrittenPath}${url.search}`;

  const headers = new Headers(c.req.raw.headers);
  headers.set('x-route-compat-forwarded', '1');

  const method = c.req.method;
  const init: RequestInit = {
    method,
    headers,
  };

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = c.req.raw.body;
  }

  return app.fetch(new Request(rewrittenUrl, init));
});

Deno.serve(app.fetch);