import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
// Use the same Role import as in [...nextauth].ts
import { Role } from "@prisma/client";

export async function middleware(req: NextRequest) {
 // console.log('Middleware - Request path:', req.nextUrl.pathname);
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
 // console.log('Middleware - Auth token:', token);
  const path = req.nextUrl.pathname;

  // Public paths that don't require authentication
  const publicPaths = ['/welcome', '/auth/signin', '/pages/shared', '/welcome.jpg'];
  
  // Skip middleware for static files
  if (path.endsWith('.jpg') || path.endsWith('.png') || path.endsWith('.svg') || path.endsWith('.ico')) {
    return NextResponse.next();
  }
  if (publicPaths.includes(path) || path.startsWith('/auth')) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  if (!token) {
    return NextResponse.redirect(new URL("/welcome", req.url));
  }
  
  // NextAuth stores the role in userRole property after our changes
  const roleValue = token?.userRole;
  //console.log('Middleware - Role from token.userRole:', roleValue);
  
  // Convert role to string for path construction
  let rolePath = '';
  if (typeof roleValue === 'string') {
    rolePath = roleValue.toLowerCase();
  } else if (roleValue) {
    rolePath = String(roleValue).toLowerCase();
  } else {
    // Look at token for debugging
   // console.log('Middleware - Full token contents:', JSON.stringify(token));
    rolePath = 'employee'; // Default fallback
  }
  
 // console.log('Middleware - Path for redirection:', `/roles/${rolePath}`);
  
  // For role checks, convert string back to Role enum
  let role: Role;
  switch(rolePath) {
    case 'admin':
      role = Role.ADMIN;
      break;
    case 'manager':
      role = Role.MANAGER;
      break;
    case 'doctor':
      role = Role.DOCTOR;
      break;
    case 'employee':
    default:
      role = Role.EMPLOYEE;
      break;
  }

  // Handle role-based access to the new folder structure
  if (path.startsWith('/roles/admin') && role !== Role.ADMIN) {
    // If not admin but trying to access admin routes, redirect to their own dashboard
    return NextResponse.redirect(new URL(`/roles/${rolePath}`, req.url));
  }
  
  if (path.startsWith('/roles/manager') && role !== Role.MANAGER) {
    // If not manager but trying to access manager routes, redirect to their own dashboard
    return NextResponse.redirect(new URL(`/roles/${rolePath}`, req.url));
  }
  
  if (path.startsWith('/roles/doctor') && role !== Role.DOCTOR) {
    // If not doctor but trying to access doctor routes, redirect to their own dashboard
    return NextResponse.redirect(new URL(`/roles/${rolePath}`, req.url));
  }
  
  if (path.startsWith('/roles/employee') && role !== Role.EMPLOYEE) {
    // If not employee but trying to access employee routes, redirect to their own dashboard
    return NextResponse.redirect(new URL(`/roles/${rolePath}`, req.url));
  }

  // Handle the dashboard route - redirect to role-specific dashboard
  if (path === '/dashboard') {
    return NextResponse.redirect(new URL(`/roles/${rolePath}`, req.url));
  }

  // Preserve existing route protection
  // Admin only routes
  if (path.startsWith('/admin') && role !== Role.ADMIN) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Doctor only routes
  if (path.startsWith('/doctor') && role !== Role.DOCTOR) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

// Specify which paths should be handled by the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets (images, etc.)
     * - api routes - VERY IMPORTANT to avoid breaking auth
     */
    '/((?!_next/static|_next/image|favicon.ico|\\.jpg|\\.png|\\.svg|\\.ico|api/auth).*)',
  ],
};