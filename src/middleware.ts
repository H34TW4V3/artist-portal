
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
        // If accessing a public path (like login) with a valid token, redirect to home
        if (sessionToken) {
            // Basic check: If token exists, assume valid for now.
            // Ideally, verify token validity here if using Edge functions with Firebase Admin SDK or a backend endpoint.
            // Since direct Admin SDK usage isn't trivial in Edge Middleware without workarounds,
            // we'll rely on the client-side checks for now.
            console.log(`Middleware: Public path (${pathname}), but token exists. Redirecting to /`);
            return NextResponse.redirect(new URL('/', request.url));
        }
        // Allow access to public paths if no token
        console.log(`Middleware: Public path (${pathname}), no token. Allowing access.`);
        return NextResponse.next();
    }

    // --- Protected Routes ---
    // If accessing a protected route without a valid token, redirect to login
    if (!sessionToken) {
        console.log(`Middleware: Protected path (${pathname}), no token. Redirecting to /login`);
        // Preserve the intended destination for redirection after login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname); // Add redirect query param if needed
        return NextResponse.redirect(loginUrl);
    }

    // If token exists for a protected route, allow access
    // Again, ideal verification would happen here or on the client-side components
    console.log(`Middleware: Protected path (${pathname}), token exists. Allowing access.`);
    return NextResponse.next();

    // --- Token Verification (Advanced - Example using a hypothetical backend) ---
    // If you have a backend endpoint for verification:
    /*
    try {
        const verificationResponse = await fetch('/api/auth/verify', {
            headers: { Authorization: `Bearer ${sessionToken}` }
        });
        if (!verificationResponse.ok) {
             console.log(`Middleware: Token verification failed for path ${pathname}. Redirecting to /login`);
             request.cookies.delete('firebaseIdToken'); // Clear invalid cookie
             const loginUrl = new URL('/login', request.url);
             return NextResponse.redirect(loginUrl);
        }
        // Token is valid, allow access
        console.log(`Middleware: Protected path (${pathname}), token verified. Allowing access.`);
        return NextResponse.next();
    } catch (error) {
        console.error('Middleware: Error during token verification:', error);
        // Redirect to login on verification error
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }
    */
}

// Configure the middleware to run on specific paths
export const config = {
    // Match all paths except for static assets, API routes, and Next.js internals
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
