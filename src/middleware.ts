
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public paths that don't require authentication
const PUBLIC_PATHS = ['/login']; // Add any other public paths like '/forgot-password'

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const sessionToken = request.cookies.get('firebaseIdToken')?.value; // Use a consistent cookie name

    console.log(`Middleware: Pathname: ${pathname}, Session Token Found: ${!!sessionToken}`);

    // Check if the path is public
    const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path));

    if (isPublicPath) {
        // If accessing a public path (like login) with a valid token, redirect to HOME ('/')
        if (sessionToken) {
            console.log(`Middleware: Public path (${pathname}), but token exists. Redirecting to /`);
            return NextResponse.redirect(new URL('/', request.url));
        }
        // Allow access to public paths if no token
        console.log(`Middleware: Public path (${pathname}), no token. Allowing access.`);
        return NextResponse.next();
    }

    // --- Protected Routes (including root) ---
    // If accessing a protected route (or root) without a valid token, redirect to login
    if (!sessionToken) {
        console.log(`Middleware: Protected/Root path (${pathname}), no token. Redirecting to /login`);
        // Preserve the intended destination for redirection after login
        const loginUrl = new URL('/login', request.url);
        // Preserve redirect only if it's not the root path itself
        // If the target was root, don't add redirect, just go to login.
        if (pathname !== '/') {
             loginUrl.searchParams.set('redirect', pathname);
        }
        return NextResponse.redirect(loginUrl);
    }

    // --- Handle root path specifically for authenticated users ---
    // Authenticated users are allowed to access the root path ('/')
    if (pathname === '/') {
        console.log(`Middleware: Authenticated user accessing root path. Allowing access.`);
        return NextResponse.next();
    }


    // If token exists for a protected route (other than root), allow access
    console.log(`Middleware: Protected path (${pathname}), token exists. Allowing access.`);
    return NextResponse.next();

}

// Configure the middleware to run on specific paths
export const config = {
    // Match all paths except for static assets, API routes, and Next.js internals
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

