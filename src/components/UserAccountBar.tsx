import React, { useState, useRef, useEffect } from 'react';
import { LogIn, LogOut, User as UserIcon, Loader2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export const UserAccountBar: React.FC = () => {
  const { user, userProfile, signingIn, authError, signInWithGoogle, signOutUser, clearError } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative z-30 mb-6 flex flex-col gap-2 select-none">
      {/* Error Alert */}
      {authError && (
        <div className="border-[2.5px] border-black bg-white p-3 flex items-start gap-2 shadow-[3px_3px_0px_#000]">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-black leading-snug">
            {authError}
          </div>
          <button
            onClick={clearError}
            className="p-1 hover:bg-gray-100 border border-black text-black"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Account Bar Status */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-wider font-bold text-black flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-black animate-pulse" />
          Interactive Visual Dictionary
        </div>

        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 border-[2.5px] border-black bg-white hover:bg-[#fff9d0] transition-colors shadow-[2px_2px_0px_#000] text-sm font-semibold text-black"
              id="user-profile-menu-button"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Google Profile'}
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full border border-black object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <span className="max-w-[120px] sm:max-w-[160px] truncate text-left">
                {user.displayName || user.email?.split('@')[0] || 'User'}
              </span>
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-72 border-[2.5px] border-black bg-white p-4 shadow-[4px_4px_0px_#000] z-50 flex flex-col gap-3"
                id="user-profile-dropdown"
              >
                <div className="flex items-center gap-3 pb-3 border-b-2 border-black">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Google Profile'}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full border-2 border-black object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center text-lg font-bold shrink-0">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-base text-black truncate">
                      {user.displayName || 'Google User'}
                    </p>
                    <p className="text-xs text-gray-700 truncate" title={user.email || ''}>
                      {user.email}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-green-700 mt-1 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Google Authenticated
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-700 bg-gray-100 p-2 border border-black/30">
                  <span className="font-bold">UID:</span> {user.uid.slice(0, 10)}...
                  {userProfile?.createdAt && (
                    <div className="mt-1">
                      <span className="font-bold">Member since:</span>{' '}
                      {userProfile.createdAt.toDate ? userProfile.createdAt.toDate().toLocaleDateString() : 'Today'}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    signOutUser();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 border-[2px] border-black bg-[#FAE125] text-black font-bold hover:bg-[#f5db18] transition-colors"
                  id="sign-out-button"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={signInWithGoogle}
            disabled={signingIn}
            className="flex items-center gap-2 px-3 py-1.5 border-[2.5px] border-black bg-white hover:bg-[#fff9d0] transition-colors shadow-[2px_2px_0px_#000] text-sm font-semibold text-black cursor-pointer disabled:opacity-50"
            id="header-google-signin-button"
          >
            {signingIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <GoogleIcon className="w-4 h-4" />
                <span>Sign in with Google</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
