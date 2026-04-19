export function useAuth() {
  return {
    user: null,
    loading: false,
    signIn: async () => {},
    signOut: async () => {},
  }
}
