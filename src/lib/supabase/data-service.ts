import { supabase, isLiveSupabaseConfigured } from './client';
import { localDb } from '../storage/mock-db';
import { FinancialAccount, FundingSource, FinancialObligation, UserProfile } from '../../types';

export const SupabaseDataService = {
  /**
   * Fetch all user data from Supabase and synchronize with localDb
   */
  async syncUserData(userId: string): Promise<boolean> {
    if (!isLiveSupabaseConfigured || !userId) return false;

    try {
      const [accountsRes, fundingRes, obligationsRes] = await Promise.all([
        supabase.from('financial_accounts').select('*').eq('user_id', userId),
        supabase.from('funding_sources').select('*').eq('user_id', userId),
        supabase.from('financial_obligations').select('*').eq('user_id', userId),
      ]);

      if (accountsRes.data && accountsRes.data.length > 0) {
        accountsRes.data.forEach((acc: any) => {
          localDb.addAccount({
            name: acc.name,
            currency: acc.currency,
            balance_minor: Number(acc.balance_minor),
            account_type: acc.account_type,
            source_type: acc.source_type,
            verified_status: acc.verified_status,
            as_of_date: acc.as_of_date,
          });
        });
      }

      if (fundingRes.data && fundingRes.data.length > 0) {
        fundingRes.data.forEach((f: any) => {
          localDb.addFunding({
            name: f.name,
            amount_minor: Number(f.amount_minor),
            currency: f.currency,
            status: f.status,
            expected_date: f.expected_date,
            received_at: f.received_at,
            source_type: f.source_type,
            recurrence_rule: f.recurrence_rule,
            notes: f.notes,
          });
        });
      }

      if (obligationsRes.data && obligationsRes.data.length > 0) {
        obligationsRes.data.forEach((o: any) => {
          localDb.addObligation({
            title: o.title,
            category: o.category,
            amount_minor: Number(o.amount_minor),
            currency: o.currency,
            due_date: o.due_date,
            status: o.status,
            is_essential: Boolean(o.is_essential),
            recurrence_rule: o.recurrence_rule,
            paid_at: o.paid_at,
            notes: o.notes,
          });
        });
      }

      return true;
    } catch (err) {
      console.warn('Failed to sync from Supabase, using local memory:', err);
      return false;
    }
  },

  /**
   * Save a new account to Supabase and localDb
   */
  async addAccount(account: Omit<FinancialAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>, userId?: string) {
    const local = localDb.addAccount(account);
    if (isLiveSupabaseConfigured && userId) {
      try {
        await supabase.from('financial_accounts').insert({
          user_id: userId,
          name: account.name,
          currency: account.currency,
          balance_minor: account.balance_minor,
          account_type: account.account_type,
          source_type: account.source_type || 'manual_declaration',
          verified_status: account.verified_status || 'declared',
          as_of_date: account.as_of_date || new Date().toISOString().split('T')[0],
        });
      } catch (e) {
        console.warn('Supabase account insert error:', e);
      }
    }
    return local;
  },

  /**
   * Save a new funding source to Supabase and localDb
   */
  async addFundingSource(funding: Omit<FundingSource, 'id' | 'user_id' | 'created_at' | 'updated_at'>, userId?: string) {
    const local = localDb.addFunding(funding);
    if (isLiveSupabaseConfigured && userId) {
      try {
        await supabase.from('funding_sources').insert({
          user_id: userId,
          name: funding.name,
          amount_minor: funding.amount_minor,
          currency: funding.currency,
          status: funding.status,
          expected_date: funding.expected_date,
          source_type: funding.source_type,
          notes: funding.notes,
        });
      } catch (e) {
        console.warn('Supabase funding insert error:', e);
      }
    }
    return local;
  },

  /**
   * Save a new financial obligation to Supabase and localDb
   */
  async addObligation(obligation: Omit<FinancialObligation, 'id' | 'user_id' | 'created_at' | 'updated_at'>, userId?: string) {
    const local = localDb.addObligation(obligation);
    if (isLiveSupabaseConfigured && userId) {
      try {
        await supabase.from('financial_obligations').insert({
          user_id: userId,
          title: obligation.title,
          category: obligation.category,
          amount_minor: obligation.amount_minor,
          currency: obligation.currency,
          due_date: obligation.due_date,
          status: obligation.status,
          is_essential: obligation.is_essential,
          notes: obligation.notes,
        });
      } catch (e) {
        console.warn('Supabase obligation insert error:', e);
      }
    }
    return local;
  },

  /**
   * Update student profile in Supabase and localDb
   */
  async updateProfile(profileUpdates: Partial<UserProfile>, userId?: string) {
    const updated = localDb.updateProfile(profileUpdates);
    if (isLiveSupabaseConfigured && userId) {
      try {
        await supabase.from('profiles').update({
          display_name: updated.display_name,
          destination_country: updated.destination_country,
          university: updated.university,
          study_program: updated.study_program,
          study_start_date: updated.study_start_date,
          study_duration_months: updated.study_duration_months,
          home_currency: updated.home_currency,
          reserve_threshold_minor: updated.reserve_threshold_minor,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        }).eq('id', userId);
      } catch (e) {
        console.warn('Supabase profile update error:', e);
      }
    }
    return updated;
  },

  /**
   * Quick preset generator for study abroad packages
   */
  async loadPreset(presetName: 'germany' | 'uk' | 'usa', userId?: string) {
    if (presetName === 'germany') {
      await this.updateProfile({
        destination_country: 'Germany',
        university: 'Technical University of Munich',
        study_program: 'M.Sc. Sustainable FinTech',
        home_currency: 'EUR',
        reserve_threshold_minor: 100000,
      }, userId);

      await this.addAccount({
        name: 'German Blocked Account (Sperrkonto)',
        currency: 'EUR',
        balance_minor: 1120800, // €11,208 statutory requirement
        account_type: 'term_deposit',
        source_type: 'manual_declaration',
        verified_status: 'reviewed',
        as_of_date: new Date().toISOString().split('T')[0],
      }, userId);

      await this.addFundingSource({
        name: 'DAAD Scholarship Award',
        amount_minor: 93400, // €934/month
        currency: 'EUR',
        status: 'confirmed',
        source_type: 'scholarship',
        expected_date: new Date().toISOString().split('T')[0],
      }, userId);

      await this.addObligation({
        title: 'TUM Semester Contribution & Public Transit',
        category: 'tuition',
        amount_minor: 15200, // €152
        currency: 'EUR',
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        status: 'planned',
        is_essential: true,
      }, userId);
    }
  }
};
