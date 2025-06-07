"use client";

import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";

import { auth } from "@/lib/firebase/firebase";
import { addUser } from "@/app/api/user/database";

export function useUser() {
  const [user, setUser] = useState<User|null>(null);

  useEffect(() => {
    onAuthStateChanged(auth, (authUser) => {
      const addServerUser = async () => {
        if (authUser!=null){
          await addUser(JSON.stringify(authUser))
        }
      }
      addServerUser();
      setUser(authUser);
    });
  }, []);

  return user;
}