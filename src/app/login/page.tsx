'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser, useAuth } from '@/firebase';
import {
  initiateAnonymousSignIn,
  initiateEmailSignUp,
  initiateEmailSignIn,
} from '@/firebase/non-blocking-login';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, getAuth } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  const handleAnonymousSignIn = async () => {
    try {
      initiateAnonymousSignIn(auth);
      toast({ title: 'Signed in anonymously.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Anonymous Sign-In Failed', description: error.message });
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({ title: 'Signed in successfully!' });
      router.push('/');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
          const user = userCredential.user;
          if (user && firestore) {
             setDoc(doc(firestore, 'users', user.uid), {
              id: user.uid,
              email: user.email,
              displayName: user.email?.split('@')[0],
              subscriptionStatus: 'free',
            }, { merge: true });
          }
          toast({ title: 'Account created and signed in!' });
          router.push('/');
        } catch (signUpError: any) {
          toast({ variant: 'destructive', title: 'Sign-Up Failed', description: signUpError.message });
        }
      } else {
        toast({ variant: 'destructive', title: 'Sign-In Failed', description: error.message });
      }
    }
  };
  
  if (isUserLoading || user) {
    return <div className="flex-1 flex items-center justify-center"><p>Loading...</p></div>;
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="w-full max-w-sm glass-panel">
            <CardHeader>
              <CardTitle>Login or Sign Up</CardTitle>
              <CardDescription>Enter your details below or sign in anonymously.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" variant="destructive">Sign In / Sign Up</Button>
              <Button type="button" variant="secondary" className="w-full" onClick={handleAnonymousSignIn}>
                Continue Anonymously
              </Button>
            </CardFooter>
          </Card>
        </form>
      </FormProvider>
    </div>
  );
}
