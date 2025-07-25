import {
  createUserWithEmailAndPassword as createUserWithEmailAndPasswordApi,
  sendEmailVerification,
} from '@/lib/firebase/auth';

type SignupFormTypes = {
  email: string;
  password: string;
};

type ActionType = {
  isSuccess: boolean;
  userError: string | null;
};

export async function signupAction(
  formData: SignupFormTypes
): Promise<ActionType> {
  try {
    const { email, password } = formData;
    const newUser = await createUserWithEmailAndPasswordApi(email, password);

    if (newUser) {
      await sendEmailVerification(newUser.user);
      return { isSuccess: true, userError: null };
    }
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use')
      return {
        isSuccess: false,
        userError:
          'This email address is already in use. Please try logging in or use a different email.',
      };
    else if (error.code === 'auth/weak-password')
      return {
        isSuccess: false,
        userError: 'Password is too weak. It should be at least 6 characters.',
      };
    else if (error.code === 'auth/invalid-email')
      return {
        isSuccess: false,
        userError: 'Please enter a valid email address.',
      };
    else if (error.code === 'auth/operation-not-allowed')
      return {
        isSuccess: false,
        userError:
          'Email/Password sign-up is not enabled. Please enable it in your Firebase Console: Authentication > Sign-in method.',
      };
  }
  return {
    isSuccess: false,
    userError: 'Failed to sign up. Please try again.',
  };
}
