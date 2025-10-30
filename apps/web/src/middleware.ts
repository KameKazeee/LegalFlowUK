import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    // Protect only app areas that require auth; leave "/" and "/login" open
    '/cases/:path*',
    '/intake/:path*',
    '/dashboard/:path*',
  ],
};
