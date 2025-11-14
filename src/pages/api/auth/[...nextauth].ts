import NextAuth, { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

// Add custom user properties to session
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      stockLocation?: {
        id: string;
        name: string;
      };
    }
  }
}

// Add custom properties to JWT token
declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    userRole: string;
  }
}

// Define authOptions for other files to import
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing email or password');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          console.log('No user found with this email');
          throw new Error('No user found with this email');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          console.log('Invalid password');
          throw new Error('Invalid password');
        }

        console.log('Login successful for:', user.email, 'with role:', user.role);
        
        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Save user info from the login to the JWT
        token.userId = user.id;
        token.userRole = String(user.role);
        console.log('JWT callback - Setting user role:', token.userRole);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Pass values from the JWT to the session
        session.user.id = token.userId;
        session.user.role = token.userRole;

        // Fetch user's stock location
        try {
          const user = await prisma.user.findUnique({
            where: { id: token.userId },
            include: {
              stockLocation: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          });

          if (user?.stockLocation) {
            session.user.stockLocation = user.stockLocation;
          }
        } catch (error) {
          console.error('Error fetching stock location in session:', error);
        }

        console.log('Session callback - User role:', session.user.role);
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
};

// Export the NextAuth handler with our configuration
export default NextAuth(authOptions);
