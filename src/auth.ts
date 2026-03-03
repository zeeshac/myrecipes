import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) return null;
        if (email !== process.env.ADMIN_EMAIL) return null;

        const hash = process.env.ADMIN_PASSWORD_HASH;
        if (!hash) return null;

        const isValid = await bcrypt.compare(password, hash);
        if (!isValid) return null;

        return { id: "1", email, name: "Zeesha" };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
