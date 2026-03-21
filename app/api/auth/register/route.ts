import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateUID, createSession } from '@/lib/auth';

/**
 * User Registration API
 * Originium Kernel - First user becomes sudo, others get 'user' role
 */

export async function POST(req: NextRequest) {
  const requestId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();
  
  console.log('='.repeat(60));
  console.log(`[${requestId}] ${timestamp} - REGISTRATION REQUEST STARTED`);
  console.log('='.repeat(60));

  try {
    // Parse request body
    let requestBody: { email?: string; password?: string; name?: string };
    try {
      requestBody = await req.json();
    } catch (parseError: any) {
      console.error(`[${requestId}] Failed to parse request body: ${parseError.message}`);
      return NextResponse.json({ 
        error: 'Invalid request body', 
        message: 'Request body must be valid JSON' 
      }, { status: 400 });
    }

    const { email, password, name } = requestBody;
    
    console.log(`[${requestId}] Request body parsed:`);
    console.log(`  - email: ${email ? '***' + email.split('@')[1] : 'MISSING'}`);
    console.log(`  - name: ${name || 'MISSING'}`);
    console.log(`  - password: ${password ? '***REDACTED***' : 'MISSING'}`);
    console.log(`  - ip: ${req.headers.get('x-forwarded-for') || '127.0.0.1'}`);
    console.log(`  - user-agent: ${req.headers.get('user-agent') || 'unknown'}`);

    // Validate required fields
    if (!email || !password || !name) {
      const missingFields = [];
      if (!email) missingFields.push('email');
      if (!password) missingFields.push('password');
      if (!name) missingFields.push('name');
      
      console.error(`[${requestId}] ❌ VALIDATION FAILED - Missing fields: ${missingFields.join(', ')}`);
      console.log('='.repeat(60));
      return NextResponse.json({ 
        error: 'Missing required fields',
        missingFields 
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error(`[${requestId}] ❌ VALIDATION FAILED - Invalid email format: ${email}`);
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 });
    }

    // Validate password length
    if (password.length < 6) {
      console.error(`[${requestId}] ❌ VALIDATION FAILED - Password too short (min 6 characters)`);
      return NextResponse.json({ 
        error: 'Password must be at least 6 characters long' 
      }, { status: 400 });
    }

    // Validate environment
    const databaseUrl = process.env.DATABASE_URL;
    const authSecret = process.env.AUTH_SECRET;

    console.log(`[${requestId}] Environment variables check:`);
    console.log(`  - DATABASE_URL: ${databaseUrl ? '✓ configured' : '✗ MISSING'}`);
    console.log(`  - AUTH_SECRET: ${authSecret ? '✓ configured' : '✗ MISSING'}`);

    if (!databaseUrl) {
      console.error(`[${requestId}] ❌ DATABASE_URL is not configured`);
      console.log('='.repeat(60));
      return NextResponse.json({
        error: 'Database not configured',
        message: 'Please set DATABASE_URL environment variable'
      }, { status: 500 });
    }

    // Get database connection
    console.log(`[${requestId}] Initializing database connection...`);
    const db = getDb();
    console.log(`[${requestId}] ✓ Database connection established`);

    // Check if this is the first user (sudo candidate)
    console.log(`[${requestId}] Checking for existing users...`);
    const userListStr = await db.get('users:all:list');
    const isFirstUser = !userListStr || JSON.parse(userListStr).length === 0;
    console.log(`[${requestId}] ${isFirstUser ? '✓ This is the FIRST user' : '✗ Existing users found'}`);

    // Check if user already exists
    console.log(`[${requestId}] Checking if email already registered: ${email}`);
    const existing = await db.get(`user:email:${email}`);
    if (existing) {
      console.error(`[${requestId}] ❌ User already exists: ${email}`);
      console.log('='.repeat(60));
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }
    console.log(`[${requestId}] ✓ Email is available`);

    // Determine user role
    let userRole: 'user' | 'admin' | 'sudo';
    if (isFirstUser) {
      userRole = 'sudo';
      console.log(`[${requestId}] 🎯 Assigning SUDO role to first user`);
    } else {
      userRole = 'user';
      console.log(`[${requestId}] 📋 Assigning USER role`);
    }

    // Generate UID
    const uid = generateUID();
    console.log(`[${requestId}] Generated UID: ${uid}`);

    // Create user payload
    const userPayload = {
      uid,
      email,
      name,
      role: userRole,
      password, // Note: In production, this should be hashed
      createdAt: new Date().toISOString(),
      ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: req.headers.get('user-agent') || 'unknown',
      status: 'active',
      isFirstUser,
    };

    console.log(`[${requestId}] User payload created:`);
    console.log(`  - uid: ${uid}`);
    console.log(`  - email: ${email}`);
    console.log(`  - name: ${name}`);
    console.log(`  - role: ${userRole}`);
    console.log(`  - createdAt: ${userPayload.createdAt}`);

    // Store user data
    console.log(`[${requestId}] Storing user data in database...`);
    await db.set(`user:uid:${uid}`, JSON.stringify(userPayload));
    console.log(`[${requestId}] ✓ Stored user by UID`);
    
    await db.set(`user:email:${email}`, uid);
    console.log(`[${requestId}] ✓ Stored email -> UID mapping`);

    // Update global user list
    const userList = userListStr ? JSON.parse(userListStr) : [];
    if (!userList.includes(uid)) {
      userList.push(uid);
      await db.set('users:all:list', JSON.stringify(userList));
      console.log(`[${requestId}] ✓ Updated user list (total users: ${userList.length})`);
    }

    // Create session
    console.log(`[${requestId}] Creating authentication session...`);
    await createSession({
      uid,
      email,
      role: userRole,
    });
    console.log(`[${requestId}] ✓ Session created successfully`);

    // Success response
    console.log(`[${requestId}] ✅ REGISTRATION SUCCESSFUL`);
    console.log(`  - uid: ${uid}`);
    console.log(`  - email: ${email}`);
    console.log(`  - role: ${userRole}`);
    console.log('='.repeat(60));
    
    return NextResponse.json({
      success: true,
      user: { uid, email, name, role: userRole },
      message: isFirstUser 
        ? 'Registration successful! You are the first user with SUDO privileges.'
        : 'Registration successful!'
    });
  } catch (error: any) {
    console.error('='.repeat(60));
    console.error(`[${requestId}] ❌ REGISTRATION FAILED - EXCEPTION CAUGHT`);
    console.error(`[${requestId}] Error type: ${error?.constructor?.name || 'Unknown'}`);
    console.error(`[${requestId}] Error message: ${error?.message}`);
    console.error(`[${requestId}] Stack trace:`);
    console.error(error?.stack);
    console.error('='.repeat(60));
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}
