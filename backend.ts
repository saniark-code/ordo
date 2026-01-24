
import { createClient } from '@supabase/supabase-js';
import { User, SavedSpace, UserSettings } from './types';

const SUPABASE_URL = 'https://xaacfqrtjaqsomzeffna.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhYWNmcXJ0amFxc29temVmZm5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMDIzMzMsImV4cCI6MjA4NDc3ODMzM30.hRypL9ugqa8HQ2V6OROVJexlQ_667eEnMSeu4qhvOEo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DEFAULT_SETTINGS: UserSettings = {
  defaultStyle: 'Calm Minimal',
  defaultFocusTime: 7,
  gentleAnimations: true,
  hapticFeedback: true,
  largerText: false,
  highContrast: false,
};

export class OrdoBackend {
  // --- AUTHENTICATION ---

  static async signUp(email: string, name: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('Sign up failed');

    const newUser: User = {
      id: data.user.id,
      email: data.user.email || email,
      name: name,
      settings: { ...DEFAULT_SETTINGS },
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        settings: newUser.settings,
      });

    if (profileError) {
      console.warn("Profile creation failed:", profileError);
    }

    this.setSession(newUser);
    return newUser;
  }

  static async signIn(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Sign in failed');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      const newUser: User = {
        id: data.user.id,
        email: data.user.email || email,
        name: data.user.user_metadata?.full_name || 'User',
        settings: { ...DEFAULT_SETTINGS },
      };
      
      await supabase.from('profiles').insert({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        settings: newUser.settings
      });
      
      this.setSession(newUser);
      return newUser;
    } else if (profileError) {
      throw profileError;
    }

    const loggedUser: User = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      settings: profile.settings || DEFAULT_SETTINGS,
    };

    this.setSession(loggedUser);
    return loggedUser;
  }

  static async updateUserSettings(userId: string, settings: UserSettings): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ settings })
      .eq('id', userId);

    if (error) throw error;

    const session = this.getSession();
    if (session && session.id === userId) {
      this.setSession({ ...session, settings });
    }
  }

  static async deleteAccount(userId: string): Promise<void> {
    // Note: Postgres folds unquoted columns to lowercase. ownerId -> ownerid
    const { error: spacesError } = await supabase
      .from('spaces')
      .delete()
      .eq('ownerid', userId);
    
    if (spacesError) console.error('Error deleting spaces:', spacesError);

    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) console.error('Error deleting profile:', profileError);

    await supabase.auth.signOut();
    this.signOut();
  }

  static getSession(): User | null {
    const session = localStorage.getItem('ordo_session');
    return session ? JSON.parse(session) : null;
  }

  private static setSession(user: User) {
    localStorage.setItem('ordo_session', JSON.stringify(user));
  }

  static signOut() {
    localStorage.removeItem('ordo_session');
    supabase.auth.signOut();
  }

  // --- SPACES ---

  static async getSpaces(userId: string): Promise<SavedSpace[]> {
    // Note: ownerId is stored as ownerid in Postgres
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('ownerid', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Failed to load spaces:", error);
      throw error;
    }

    // Map lowercase Postgres columns back to camelCase TypeScript properties
    return (data || []).map((row: any) => ({
      id: row.id,
      ownerId: row.ownerid,
      name: row.name,
      date: row.date,
      image: row.image,
      beforeImage: row.beforeimage,
      type: row.type,
      note: row.note
    }));
  }

  static async saveSpace(space: SavedSpace): Promise<void> {
    // Explicit mapping to lowercase columns to satisfy Postgres defaults
    const payload = {
      id: space.id,
      ownerid: space.ownerId,
      name: space.name,
      date: space.date,
      image: space.image,
      beforeimage: space.beforeImage || null,
      type: space.type,
      note: space.note || null
    };

    const { error } = await supabase
      .from('spaces')
      .insert(payload);

    if (error) {
      console.error("Supabase Save Error Details:", error);
      throw error;
    }
  }

  static async deleteSpace(id: string): Promise<void> {
    const { error } = await supabase
      .from('spaces')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async updateSpace(id: string, updates: Partial<SavedSpace>): Promise<void> {
    // Construct updates map to handle camelCase to lowercase conversion if needed
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.note) dbUpdates.note = updates.note;
    if (updates.image) dbUpdates.image = updates.image;
    if (updates.beforeImage) dbUpdates.beforeimage = updates.beforeImage;

    const { error } = await supabase
      .from('spaces')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
  }
}
