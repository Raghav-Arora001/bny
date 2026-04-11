import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import React from "react";

const Header = () => {
  return (
    <header className="flex justify-end items-center p-4 gap-4 h-16 border-b">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50">
            Sign In
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="px-4 py-2 text-sm font-medium bg-black text-white rounded-md hover:bg-gray-900">
            Sign Up
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </header>
  );
};

export default Header;
