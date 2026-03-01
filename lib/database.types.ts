export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ab_tests: {
        Row: {
          broker_slug: string
          clicks_a: number | null
          clicks_b: number | null
          conversions_a: number | null
          conversions_b: number | null
          created_at: string | null
          end_date: string | null
          id: number
          impressions_a: number | null
          impressions_b: number | null
          name: string
          start_date: string | null
          status: string
          traffic_split: number | null
          type: string
          updated_at: string | null
          variant_a: Json
          variant_b: Json
          winner: string | null
        }
        Insert: {
          broker_slug: string
          clicks_a?: number | null
          clicks_b?: number | null
          conversions_a?: number | null
          conversions_b?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: number
          impressions_a?: number | null
          impressions_b?: number | null
          name: string
          start_date?: string | null
          status?: string
          traffic_split?: number | null
          type: string
          updated_at?: string | null
          variant_a?: Json
          variant_b?: Json
          winner?: string | null
        }
        Update: {
          broker_slug?: string
          clicks_a?: number | null
          clicks_b?: number | null
          conversions_a?: number | null
          conversions_b?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: number
          impressions_a?: number | null
          impressions_b?: number | null
          name?: string
          start_date?: string | null
          status?: string
          traffic_split?: number | null
          type?: string
          updated_at?: string | null
          variant_a?: Json
          variant_b?: Json
          winner?: string | null
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_email: string | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: number
        }
        Insert: {
          action: string
          admin_email?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: number
        }
        Update: {
          action?: string
          admin_email?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: number
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          broker_id: number | null
          broker_name: string | null
          broker_slug: string | null
          click_id: string | null
          clicked_at: string | null
          device_type: string | null
          id: number
          ip_hash: string | null
          layer: string | null
          page: string | null
          placement_type: string | null
          scenario: string | null
          session_id: string | null
          source: string | null
          user_agent: string | null
        }
        Insert: {
          broker_id?: number | null
          broker_name?: string | null
          broker_slug?: string | null
          click_id?: string | null
          clicked_at?: string | null
          device_type?: string | null
          id?: number
          ip_hash?: string | null
          layer?: string | null
          page?: string | null
          placement_type?: string | null
          scenario?: string | null
          session_id?: string | null
          source?: string | null
          user_agent?: string | null
        }
        Update: {
          broker_id?: number | null
          broker_name?: string | null
          broker_slug?: string | null
          click_id?: string | null
          clicked_at?: string | null
          device_type?: string | null
          id?: number
          ip_hash?: string | null
          layer?: string | null
          page?: string | null
          placement_type?: string | null
          scenario?: string | null
          session_id?: string | null
          source?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      allocation_decisions: {
        Row: {
          candidate_count: number
          candidates: Json
          created_at: string
          device_type: string | null
          duration_ms: number | null
          fallback_used: boolean
          id: number
          page: string | null
          placement_slug: string
          rejection_log: Json
          scenario: string | null
          winner_count: number
          winners: Json
        }
        Insert: {
          candidate_count?: number
          candidates?: Json
          created_at?: string
          device_type?: string | null
          duration_ms?: number | null
          fallback_used?: boolean
          id?: never
          page?: string | null
          placement_slug: string
          rejection_log?: Json
          scenario?: string | null
          winner_count?: number
          winners?: Json
        }
        Update: {
          candidate_count?: number
          candidates?: Json
          created_at?: string
          device_type?: string | null
          duration_ms?: number | null
          fallback_used?: boolean
          id?: never
          page?: string | null
          placement_slug?: string
          rejection_log?: Json
          scenario?: string | null
          winner_count?: number
          winners?: Json
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: number
          ip_hash: string | null
          page: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: number
          ip_hash?: string | null
          page?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: number
          ip_hash?: string | null
          page?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      articles: {
        Row: {
          author_id: number | null
          author_image: string | null
          author_linkedin: string | null
          author_name: string | null
          author_title: string | null
          author_twitter: string | null
          category: string | null
          changelog: Json | null
          content: string | null
          cover_image_url: string | null
          created_at: string | null
          evergreen: boolean | null
          excerpt: string | null
          featured: boolean | null
          id: number
          last_audited_at: string | null
          meta_description: string | null
          meta_title: string | null
          needs_update: boolean | null
          publish_date: string | null
          published_at: string | null
          read_time: number | null
          related_brokers: Json | null
          related_calc: string | null
          reviewed_at: string | null
          reviewer_id: number | null
          sections: Json | null
          slug: string
          staleness_score: number | null
          status: string | null
          tags: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: number | null
          author_image?: string | null
          author_linkedin?: string | null
          author_name?: string | null
          author_title?: string | null
          author_twitter?: string | null
          category?: string | null
          changelog?: Json | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          evergreen?: boolean | null
          excerpt?: string | null
          featured?: boolean | null
          id?: number
          last_audited_at?: string | null
          meta_description?: string | null
          meta_title?: string | null
          needs_update?: boolean | null
          publish_date?: string | null
          published_at?: string | null
          read_time?: number | null
          related_brokers?: Json | null
          related_calc?: string | null
          reviewed_at?: string | null
          reviewer_id?: number | null
          sections?: Json | null
          slug: string
          staleness_score?: number | null
          status?: string | null
          tags?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: number | null
          author_image?: string | null
          author_linkedin?: string | null
          author_name?: string | null
          author_title?: string | null
          author_twitter?: string | null
          category?: string | null
          changelog?: Json | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          evergreen?: boolean | null
          excerpt?: string | null
          featured?: boolean | null
          id?: number
          last_audited_at?: string | null
          meta_description?: string | null
          meta_title?: string | null
          needs_update?: boolean | null
          publish_date?: string | null
          published_at?: string | null
          read_time?: number | null
          related_brokers?: Json | null
          related_calc?: string | null
          reviewed_at?: string | null
          reviewer_id?: number | null
          sections?: Json | null
          slug?: string
          staleness_score?: number | null
          status?: string | null
          tags?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_accounts: {
        Row: {
          auth_user_id: string
          broker_slug: string
          company_name: string | null
          created_at: string | null
          email: string
          email_preferences: Json | null
          full_name: string
          id: string
          invited_by: string | null
          last_login_at: string | null
          package_id: number | null
          package_started_at: string | null
          phone: string | null
          postback_api_key: string | null
          role: string
          status: string
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          auth_user_id: string
          broker_slug: string
          company_name?: string | null
          created_at?: string | null
          email: string
          email_preferences?: Json | null
          full_name: string
          id?: string
          invited_by?: string | null
          last_login_at?: string | null
          package_id?: number | null
          package_started_at?: string | null
          phone?: string | null
          postback_api_key?: string | null
          role?: string
          status?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          auth_user_id?: string
          broker_slug?: string
          company_name?: string | null
          created_at?: string | null
          email?: string
          email_preferences?: Json | null
          full_name?: string
          id?: string
          invited_by?: string | null
          last_login_at?: string | null
          package_id?: number | null
          package_started_at?: string | null
          phone?: string | null
          postback_api_key?: string | null
          role?: string
          status?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      broker_answers: {
        Row: {
          answer: string
          answered_by: string | null
          author_slug: string | null
          created_at: string | null
          display_name: string | null
          id: number
          is_accepted: boolean | null
          question_id: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          answer: string
          answered_by?: string | null
          author_slug?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: number
          is_accepted?: boolean | null
          question_id: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          answer?: string
          answered_by?: string | null
          author_slug?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: number
          is_accepted?: boolean | null
          question_id?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "broker_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_creatives: {
        Row: {
          broker_slug: string
          created_at: string | null
          file_size_bytes: number | null
          height: number | null
          id: number
          is_active: boolean | null
          label: string | null
          sort_order: number | null
          type: string
          updated_at: string | null
          uploaded_by: string | null
          url: string
          width: number | null
        }
        Insert: {
          broker_slug: string
          created_at?: string | null
          file_size_bytes?: number | null
          height?: number | null
          id?: number
          is_active?: boolean | null
          label?: string | null
          sort_order?: number | null
          type: string
          updated_at?: string | null
          uploaded_by?: string | null
          url: string
          width?: number | null
        }
        Update: {
          broker_slug?: string
          created_at?: string | null
          file_size_bytes?: number | null
          height?: number | null
          id?: number
          is_active?: boolean | null
          label?: string | null
          sort_order?: number | null
          type?: string
          updated_at?: string | null
          uploaded_by?: string | null
          url?: string
          width?: number | null
        }
        Relationships: []
      }
      broker_data_changes: {
        Row: {
          broker_id: number | null
          broker_slug: string
          change_type: string
          changed_at: string
          changed_by: string | null
          field_name: string
          id: number
          new_value: string | null
          old_value: string | null
          source: string | null
        }
        Insert: {
          broker_id?: number | null
          broker_slug: string
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          field_name: string
          id?: never
          new_value?: string | null
          old_value?: string | null
          source?: string | null
        }
        Update: {
          broker_id?: number | null
          broker_slug?: string
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          field_name?: string
          id?: never
          new_value?: string | null
          old_value?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_data_changes_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_health_scores: {
        Row: {
          afsl_number: string | null
          afsl_status: string | null
          broker_slug: string
          client_money_notes: string | null
          client_money_score: number | null
          created_at: string | null
          financial_stability_notes: string | null
          financial_stability_score: number | null
          id: number
          insurance_notes: string | null
          insurance_score: number | null
          last_reviewed_at: string | null
          overall_score: number
          platform_reliability_notes: string | null
          platform_reliability_score: number | null
          regulatory_notes: string | null
          regulatory_score: number | null
          updated_at: string | null
        }
        Insert: {
          afsl_number?: string | null
          afsl_status?: string | null
          broker_slug: string
          client_money_notes?: string | null
          client_money_score?: number | null
          created_at?: string | null
          financial_stability_notes?: string | null
          financial_stability_score?: number | null
          id?: never
          insurance_notes?: string | null
          insurance_score?: number | null
          last_reviewed_at?: string | null
          overall_score?: number
          platform_reliability_notes?: string | null
          platform_reliability_score?: number | null
          regulatory_notes?: string | null
          regulatory_score?: number | null
          updated_at?: string | null
        }
        Update: {
          afsl_number?: string | null
          afsl_status?: string | null
          broker_slug?: string
          client_money_notes?: string | null
          client_money_score?: number | null
          created_at?: string | null
          financial_stability_notes?: string | null
          financial_stability_score?: number | null
          id?: never
          insurance_notes?: string | null
          insurance_score?: number | null
          last_reviewed_at?: string | null
          overall_score?: number
          platform_reliability_notes?: string | null
          platform_reliability_score?: number | null
          regulatory_notes?: string | null
          regulatory_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      broker_notifications: {
        Row: {
          broker_slug: string
          created_at: string | null
          email_sent: boolean | null
          id: number
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: string
        }
        Insert: {
          broker_slug: string
          created_at?: string | null
          email_sent?: boolean | null
          id?: number
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type: string
        }
        Update: {
          broker_slug?: string
          created_at?: string | null
          email_sent?: boolean | null
          id?: number
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      broker_packages: {
        Row: {
          cpc_rate_discount_pct: number
          created_at: string
          description: string | null
          featured_slots_included: number
          id: number
          included_placements: Json
          is_active: boolean
          monthly_fee_cents: number
          name: string
          share_of_voice_pct: number | null
          slug: string
          sort_order: number
          support_level: string | null
          tier: string
        }
        Insert: {
          cpc_rate_discount_pct?: number
          created_at?: string
          description?: string | null
          featured_slots_included?: number
          id?: never
          included_placements?: Json
          is_active?: boolean
          monthly_fee_cents?: number
          name: string
          share_of_voice_pct?: number | null
          slug: string
          sort_order?: number
          support_level?: string | null
          tier: string
        }
        Update: {
          cpc_rate_discount_pct?: number
          created_at?: string
          description?: string | null
          featured_slots_included?: number
          id?: never
          included_placements?: Json
          is_active?: boolean
          monthly_fee_cents?: number
          name?: string
          share_of_voice_pct?: number | null
          slug?: string
          sort_order?: number
          support_level?: string | null
          tier?: string
        }
        Relationships: []
      }
      broker_questions: {
        Row: {
          broker_slug: string
          created_at: string | null
          display_name: string
          email: string | null
          id: number
          page_slug: string
          page_type: string | null
          question: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          broker_slug: string
          created_at?: string | null
          display_name: string
          email?: string | null
          id?: number
          page_slug: string
          page_type?: string | null
          question: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          broker_slug?: string
          created_at?: string | null
          display_name?: string
          email?: string | null
          id?: number
          page_slug?: string
          page_type?: string | null
          question?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      broker_review_stats: {
        Row: {
          average_rating: number
          avg_fees_rating: number | null
          avg_platform_rating: number | null
          avg_reliability_rating: number | null
          avg_support_rating: number | null
          broker_id: number
          review_count: number
          updated_at: string | null
        }
        Insert: {
          average_rating?: number
          avg_fees_rating?: number | null
          avg_platform_rating?: number | null
          avg_reliability_rating?: number | null
          avg_support_rating?: number | null
          broker_id: number
          review_count?: number
          updated_at?: string | null
        }
        Update: {
          average_rating?: number
          avg_fees_rating?: number | null
          avg_platform_rating?: number | null
          avg_reliability_rating?: number | null
          avg_support_rating?: number | null
          broker_id?: number
          review_count?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_review_stats_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: true
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_transfer_guides: {
        Row: {
          broker_slug: string
          chess_transfer_fee: number
          created_at: string | null
          estimated_timeline_days: number | null
          exit_fees: string | null
          helpful_links: Json | null
          id: number
          in_specie_notes: string | null
          special_requirements: string[] | null
          steps: Json
          supports_in_specie: boolean
          transfer_type: string
          updated_at: string | null
        }
        Insert: {
          broker_slug: string
          chess_transfer_fee?: number
          created_at?: string | null
          estimated_timeline_days?: number | null
          exit_fees?: string | null
          helpful_links?: Json | null
          id?: never
          in_specie_notes?: string | null
          special_requirements?: string[] | null
          steps?: Json
          supports_in_specie?: boolean
          transfer_type: string
          updated_at?: string | null
        }
        Update: {
          broker_slug?: string
          chess_transfer_fee?: number
          created_at?: string | null
          estimated_timeline_days?: number | null
          exit_fees?: string | null
          helpful_links?: Json | null
          id?: never
          in_specie_notes?: string | null
          special_requirements?: string[] | null
          steps?: Json
          supports_in_specie?: boolean
          transfer_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      broker_wallets: {
        Row: {
          auto_topup_amount_cents: number | null
          auto_topup_enabled: boolean
          auto_topup_threshold_cents: number | null
          balance_cents: number
          broker_slug: string
          created_at: string | null
          currency: string
          id: number
          last_low_balance_alert_at: string | null
          lifetime_deposited_cents: number
          lifetime_spent_cents: number
          low_balance_alert_enabled: boolean
          low_balance_threshold_cents: number | null
          stripe_payment_method_id: string | null
          updated_at: string | null
        }
        Insert: {
          auto_topup_amount_cents?: number | null
          auto_topup_enabled?: boolean
          auto_topup_threshold_cents?: number | null
          balance_cents?: number
          broker_slug: string
          created_at?: string | null
          currency?: string
          id?: never
          last_low_balance_alert_at?: string | null
          lifetime_deposited_cents?: number
          lifetime_spent_cents?: number
          low_balance_alert_enabled?: boolean
          low_balance_threshold_cents?: number | null
          stripe_payment_method_id?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_topup_amount_cents?: number | null
          auto_topup_enabled?: boolean
          auto_topup_threshold_cents?: number | null
          balance_cents?: number
          broker_slug?: string
          created_at?: string | null
          currency?: string
          id?: never
          last_low_balance_alert_at?: string | null
          lifetime_deposited_cents?: number
          lifetime_spent_cents?: number
          low_balance_alert_enabled?: boolean
          low_balance_threshold_cents?: number | null
          stripe_payment_method_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      brokers: {
        Row: {
          affiliate_url: string | null
          asx_fee: string | null
          asx_fee_value: number | null
          benefit_cta: string | null
          chess_sponsored: boolean | null
          color: string
          commission_type: string | null
          commission_value: number | null
          cons: Json | null
          created_at: string | null
          cta_text: string | null
          deal: boolean | null
          deal_category: string | null
          deal_expiry: string | null
          deal_source: string | null
          deal_terms: string | null
          deal_text: string | null
          deal_verified_date: string | null
          editors_pick: boolean | null
          estimated_epc: number | null
          fee_audit: Json | null
          fee_changelog: Json | null
          fee_last_checked: string | null
          fee_page_hash: string | null
          fee_source_tcs_url: string | null
          fee_source_url: string | null
          fee_verified_date: string | null
          fx_rate: number | null
          headquarters: string | null
          icon: string | null
          id: number
          inactivity_fee: string | null
          is_crypto: boolean | null
          layer: string | null
          link_last_checked: string | null
          link_status: string | null
          link_status_code: number | null
          markets: Json | null
          min_deposit: string | null
          name: string
          payment_methods: Json | null
          platforms: Json | null
          pros: Json | null
          rating: number | null
          regulated_by: string | null
          review_content: string | null
          reviewed_at: string | null
          reviewer_id: number | null
          slug: string
          smsf_support: boolean | null
          sponsorship_end: string | null
          sponsorship_start: string | null
          sponsorship_tier: string | null
          status: string | null
          tagline: string | null
          updated_at: string | null
          us_fee: string | null
          us_fee_value: number | null
          year_founded: number | null
        }
        Insert: {
          affiliate_url?: string | null
          asx_fee?: string | null
          asx_fee_value?: number | null
          benefit_cta?: string | null
          chess_sponsored?: boolean | null
          color: string
          commission_type?: string | null
          commission_value?: number | null
          cons?: Json | null
          created_at?: string | null
          cta_text?: string | null
          deal?: boolean | null
          deal_category?: string | null
          deal_expiry?: string | null
          deal_source?: string | null
          deal_terms?: string | null
          deal_text?: string | null
          deal_verified_date?: string | null
          editors_pick?: boolean | null
          estimated_epc?: number | null
          fee_audit?: Json | null
          fee_changelog?: Json | null
          fee_last_checked?: string | null
          fee_page_hash?: string | null
          fee_source_tcs_url?: string | null
          fee_source_url?: string | null
          fee_verified_date?: string | null
          fx_rate?: number | null
          headquarters?: string | null
          icon?: string | null
          id?: number
          inactivity_fee?: string | null
          is_crypto?: boolean | null
          layer?: string | null
          link_last_checked?: string | null
          link_status?: string | null
          link_status_code?: number | null
          markets?: Json | null
          min_deposit?: string | null
          name: string
          payment_methods?: Json | null
          platforms?: Json | null
          pros?: Json | null
          rating?: number | null
          regulated_by?: string | null
          review_content?: string | null
          reviewed_at?: string | null
          reviewer_id?: number | null
          slug: string
          smsf_support?: boolean | null
          sponsorship_end?: string | null
          sponsorship_start?: string | null
          sponsorship_tier?: string | null
          status?: string | null
          tagline?: string | null
          updated_at?: string | null
          us_fee?: string | null
          us_fee_value?: number | null
          year_founded?: number | null
        }
        Update: {
          affiliate_url?: string | null
          asx_fee?: string | null
          asx_fee_value?: number | null
          benefit_cta?: string | null
          chess_sponsored?: boolean | null
          color?: string
          commission_type?: string | null
          commission_value?: number | null
          cons?: Json | null
          created_at?: string | null
          cta_text?: string | null
          deal?: boolean | null
          deal_category?: string | null
          deal_expiry?: string | null
          deal_source?: string | null
          deal_terms?: string | null
          deal_text?: string | null
          deal_verified_date?: string | null
          editors_pick?: boolean | null
          estimated_epc?: number | null
          fee_audit?: Json | null
          fee_changelog?: Json | null
          fee_last_checked?: string | null
          fee_page_hash?: string | null
          fee_source_tcs_url?: string | null
          fee_source_url?: string | null
          fee_verified_date?: string | null
          fx_rate?: number | null
          headquarters?: string | null
          icon?: string | null
          id?: number
          inactivity_fee?: string | null
          is_crypto?: boolean | null
          layer?: string | null
          link_last_checked?: string | null
          link_status?: string | null
          link_status_code?: number | null
          markets?: Json | null
          min_deposit?: string | null
          name?: string
          payment_methods?: Json | null
          platforms?: Json | null
          pros?: Json | null
          rating?: number | null
          regulated_by?: string | null
          review_content?: string | null
          reviewed_at?: string | null
          reviewer_id?: number | null
          slug?: string
          smsf_support?: boolean | null
          sponsorship_end?: string | null
          sponsorship_start?: string | null
          sponsorship_tier?: string | null
          status?: string | null
          tagline?: string | null
          updated_at?: string | null
          us_fee?: string | null
          us_fee_value?: number | null
          year_founded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brokers_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_daily_stats: {
        Row: {
          broker_slug: string
          campaign_id: number
          clicks: number
          conversions: number
          id: number
          impressions: number
          spend_cents: number
          stat_date: string
        }
        Insert: {
          broker_slug: string
          campaign_id: number
          clicks?: number
          conversions?: number
          id?: never
          impressions?: number
          spend_cents?: number
          stat_date: string
        }
        Update: {
          broker_slug?: string
          campaign_id?: number
          clicks?: number
          conversions?: number
          id?: never
          impressions?: number
          spend_cents?: number
          stat_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_daily_stats_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_events: {
        Row: {
          broker_slug: string
          campaign_id: number
          click_id: string | null
          conversion_value_cents: number | null
          cost_cents: number
          created_at: string | null
          device_type: string | null
          event_type: string
          id: number
          ip_hash: string | null
          page: string | null
          placement_id: number | null
          scenario: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          broker_slug: string
          campaign_id: number
          click_id?: string | null
          conversion_value_cents?: number | null
          cost_cents?: number
          created_at?: string | null
          device_type?: string | null
          event_type: string
          id?: never
          ip_hash?: string | null
          page?: string | null
          placement_id?: number | null
          scenario?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          broker_slug?: string
          campaign_id?: number
          click_id?: string | null
          conversion_value_cents?: number | null
          cost_cents?: number
          created_at?: string | null
          device_type?: string | null
          event_type?: string
          id?: never
          ip_hash?: string | null
          page?: string | null
          placement_id?: number | null
          scenario?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_events_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "marketplace_placements"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          broker_slug: string
          created_at: string | null
          daily_budget_cents: number | null
          end_date: string | null
          id: number
          inventory_type: string
          name: string
          placement_id: number
          priority: number
          rate_cents: number
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          total_budget_cents: number | null
          total_spent_cents: number
          updated_at: string | null
        }
        Insert: {
          broker_slug: string
          created_at?: string | null
          daily_budget_cents?: number | null
          end_date?: string | null
          id?: never
          inventory_type: string
          name: string
          placement_id: number
          priority?: number
          rate_cents: number
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          total_budget_cents?: number | null
          total_spent_cents?: number
          updated_at?: string | null
        }
        Update: {
          broker_slug?: string
          created_at?: string | null
          daily_budget_cents?: number | null
          end_date?: string | null
          id?: never
          inventory_type?: string
          name?: string
          placement_id?: number
          priority?: number
          rate_cents?: number
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          total_budget_cents?: number | null
          total_spent_cents?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "marketplace_placements"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_bookings: {
        Row: {
          amount_paid: number
          booked_at: string | null
          cal_booking_uid: string | null
          consultation_id: number
          id: number
          refunded_at: string | null
          status: string
          stripe_payment_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid?: number
          booked_at?: string | null
          cal_booking_uid?: string | null
          consultation_id: number
          id?: number
          refunded_at?: string | null
          status?: string
          stripe_payment_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          booked_at?: string | null
          cal_booking_uid?: string | null
          consultation_id?: number
          id?: number
          refunded_at?: string | null
          status?: string
          stripe_payment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_bookings_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          cal_link: string
          category: string | null
          consultant_id: number
          created_at: string | null
          description: string | null
          duration_minutes: number
          featured: boolean
          id: number
          price: number
          pro_price: number | null
          slug: string
          sort_order: number
          status: string
          stripe_price_id: string | null
          stripe_pro_price_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          cal_link: string
          category?: string | null
          consultant_id: number
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          featured?: boolean
          id?: number
          price: number
          pro_price?: number | null
          slug: string
          sort_order?: number
          status?: string
          stripe_price_id?: string | null
          stripe_pro_price_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          cal_link?: string
          category?: string | null
          consultant_id?: number
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          featured?: boolean
          id?: number
          price?: number
          pro_price?: number | null
          slug?: string
          sort_order?: number
          status?: string
          stripe_price_id?: string | null
          stripe_pro_price_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      content_calendar: {
        Row: {
          actual_publish_date: string | null
          ai_draft_generated_at: string | null
          ai_model: string | null
          article_id: number | null
          article_type: string
          assigned_author_id: number | null
          assigned_reviewer_id: number | null
          brief: string | null
          category: string | null
          created_at: string | null
          id: number
          internal_links: Json | null
          notes: string | null
          priority: string | null
          related_brokers: Json | null
          related_tools: Json | null
          secondary_keywords: Json | null
          status: string
          target_keyword: string | null
          target_publish_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_publish_date?: string | null
          ai_draft_generated_at?: string | null
          ai_model?: string | null
          article_id?: number | null
          article_type?: string
          assigned_author_id?: number | null
          assigned_reviewer_id?: number | null
          brief?: string | null
          category?: string | null
          created_at?: string | null
          id?: number
          internal_links?: Json | null
          notes?: string | null
          priority?: string | null
          related_brokers?: Json | null
          related_tools?: Json | null
          secondary_keywords?: Json | null
          status?: string
          target_keyword?: string | null
          target_publish_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_publish_date?: string | null
          ai_draft_generated_at?: string | null
          ai_model?: string | null
          article_id?: number | null
          article_type?: string
          assigned_author_id?: number | null
          assigned_reviewer_id?: number | null
          brief?: string | null
          category?: string | null
          created_at?: string | null
          id?: number
          internal_links?: Json | null
          notes?: string | null
          priority?: string | null
          related_brokers?: Json | null
          related_tools?: Json | null
          secondary_keywords?: Json | null
          status?: string
          target_keyword?: string | null
          target_publish_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_calendar_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_calendar_assigned_author_id_fkey"
            columns: ["assigned_author_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_calendar_assigned_reviewer_id_fkey"
            columns: ["assigned_reviewer_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_events: {
        Row: {
          broker_slug: string
          campaign_id: number | null
          click_id: string | null
          conversion_value_cents: number | null
          created_at: string
          event_type: string
          id: number
          ip_hash: string | null
          metadata: Json | null
          source: string
        }
        Insert: {
          broker_slug: string
          campaign_id?: number | null
          click_id?: string | null
          conversion_value_cents?: number | null
          created_at?: string
          event_type: string
          id?: never
          ip_hash?: string | null
          metadata?: Json | null
          source?: string
        }
        Update: {
          broker_slug?: string
          campaign_id?: number | null
          click_id?: string | null
          conversion_value_cents?: number | null
          created_at?: string
          event_type?: string
          id?: never
          ip_hash?: string | null
          metadata?: Json | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversion_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          content: string | null
          course_slug: string
          created_at: string | null
          duration_minutes: number | null
          id: number
          is_free_preview: boolean | null
          lesson_index: number
          module_index: number
          module_title: string
          related_brokers: Json | null
          slug: string
          title: string
          updated_at: string | null
          video_duration_seconds: number | null
          video_url: string | null
        }
        Insert: {
          content?: string | null
          course_slug?: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: number
          is_free_preview?: boolean | null
          lesson_index: number
          module_index: number
          module_title: string
          related_brokers?: Json | null
          slug: string
          title: string
          updated_at?: string | null
          video_duration_seconds?: number | null
          video_url?: string | null
        }
        Update: {
          content?: string | null
          course_slug?: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: number
          is_free_preview?: boolean | null
          lesson_index?: number
          module_index?: number
          module_title?: string
          related_brokers?: Json | null
          slug?: string
          title?: string
          updated_at?: string | null
          video_duration_seconds?: number | null
          video_url?: string | null
        }
        Relationships: []
      }
      course_progress: {
        Row: {
          completed_at: string | null
          id: number
          lesson_id: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: number
          lesson_id: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: number
          lesson_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_purchases: {
        Row: {
          amount_paid: number
          course_id: number | null
          course_slug: string
          id: number
          purchased_at: string | null
          refunded: boolean | null
          refunded_at: string | null
          stripe_payment_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid: number
          course_id?: number | null
          course_slug?: string
          id?: number
          purchased_at?: string | null
          refunded?: boolean | null
          refunded_at?: string | null
          stripe_payment_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          course_id?: number | null
          course_slug?: string
          id?: number
          purchased_at?: string | null
          refunded?: boolean | null
          refunded_at?: string | null
          stripe_payment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_revenue: {
        Row: {
          course_id: number
          created_at: string | null
          creator_amount: number
          creator_id: number
          id: number
          paid_at: string | null
          platform_amount: number
          purchase_id: number
          revenue_share_percent: number
          status: string
          total_amount: number
        }
        Insert: {
          course_id: number
          created_at?: string | null
          creator_amount: number
          creator_id: number
          id?: number
          paid_at?: string | null
          platform_amount: number
          purchase_id: number
          revenue_share_percent: number
          status?: string
          total_amount: number
        }
        Update: {
          course_id?: number
          created_at?: string | null
          creator_amount?: number
          creator_id?: number
          id?: number
          paid_at?: string | null
          platform_amount?: number
          purchase_id?: number
          revenue_share_percent?: number
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_revenue_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_revenue_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_revenue_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "course_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          creator_id: number | null
          currency: string
          description: string | null
          estimated_hours: number | null
          featured: boolean | null
          guarantee: string | null
          id: number
          level: string | null
          price: number
          pro_price: number | null
          published_at: string | null
          revenue_share_percent: number
          slug: string
          sort_order: number | null
          status: string
          stripe_price_id: string | null
          stripe_pro_price_id: string | null
          subtitle: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          creator_id?: number | null
          currency?: string
          description?: string | null
          estimated_hours?: number | null
          featured?: boolean | null
          guarantee?: string | null
          id?: number
          level?: string | null
          price?: number
          pro_price?: number | null
          published_at?: string | null
          revenue_share_percent?: number
          slug: string
          sort_order?: number | null
          status?: string
          stripe_price_id?: string | null
          stripe_pro_price_id?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          creator_id?: number | null
          currency?: string
          description?: string | null
          estimated_hours?: number | null
          featured?: boolean | null
          guarantee?: string | null
          id?: number
          level?: string | null
          price?: number
          pro_price?: number | null
          published_at?: string | null
          revenue_share_percent?: number
          slug?: string
          sort_order?: number | null
          status?: string
          stripe_price_id?: string | null
          stripe_pro_price_id?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      email_captures: {
        Row: {
          captured_at: string | null
          email: string
          id: number
          last_newsletter_at: string | null
          name: string | null
          newsletter_opt_in: boolean | null
          source: string | null
          unsubscribed: boolean | null
        }
        Insert: {
          captured_at?: string | null
          email: string
          id?: number
          last_newsletter_at?: string | null
          name?: string | null
          newsletter_opt_in?: boolean | null
          source?: string | null
          unsubscribed?: boolean | null
        }
        Update: {
          captured_at?: string | null
          email?: string
          id?: number
          last_newsletter_at?: string | null
          name?: string | null
          newsletter_opt_in?: boolean | null
          source?: string | null
          unsubscribed?: boolean | null
        }
        Relationships: []
      }
      fee_profiles: {
        Row: {
          asx_trades_per_month: number
          avg_trade_size: number
          created_at: string | null
          current_broker_slug: string | null
          id: number
          portfolio_value: number | null
          updated_at: string | null
          us_trades_per_month: number
          user_id: string
        }
        Insert: {
          asx_trades_per_month?: number
          avg_trade_size?: number
          created_at?: string | null
          current_broker_slug?: string | null
          id?: number
          portfolio_value?: number | null
          updated_at?: string | null
          us_trades_per_month?: number
          user_id: string
        }
        Update: {
          asx_trades_per_month?: number
          avg_trade_size?: number
          created_at?: string | null
          current_broker_slug?: string | null
          id?: number
          portfolio_value?: number | null
          updated_at?: string | null
          us_trades_per_month?: number
          user_id?: string
        }
        Relationships: []
      }
      marketplace_invoices: {
        Row: {
          amount_cents: number
          broker_abn: string | null
          broker_company_name: string | null
          broker_email: string | null
          broker_slug: string
          created_at: string | null
          currency: string
          description: string | null
          id: number
          invoice_number: string | null
          line_items: Json | null
          paid_at: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          subtotal_cents: number | null
          tax_cents: number | null
          type: string
        }
        Insert: {
          amount_cents: number
          broker_abn?: string | null
          broker_company_name?: string | null
          broker_email?: string | null
          broker_slug: string
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: never
          invoice_number?: string | null
          line_items?: Json | null
          paid_at?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number | null
          tax_cents?: number | null
          type: string
        }
        Update: {
          amount_cents?: number
          broker_abn?: string | null
          broker_company_name?: string | null
          broker_email?: string | null
          broker_slug?: string
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: never
          invoice_number?: string | null
          line_items?: Json | null
          paid_at?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number | null
          tax_cents?: number | null
          type?: string
        }
        Relationships: []
      }
      marketplace_placements: {
        Row: {
          base_rate_cents: number | null
          created_at: string | null
          description: string | null
          id: number
          inventory_type: string
          is_active: boolean
          max_slots: number
          name: string
          page: string
          position: string
          slug: string
        }
        Insert: {
          base_rate_cents?: number | null
          created_at?: string | null
          description?: string | null
          id?: never
          inventory_type: string
          is_active?: boolean
          max_slots?: number
          name: string
          page: string
          position: string
          slug: string
        }
        Update: {
          base_rate_cents?: number | null
          created_at?: string | null
          description?: string | null
          id?: never
          inventory_type?: string
          is_active?: boolean
          max_slots?: number
          name?: string
          page?: string
          position?: string
          slug?: string
        }
        Relationships: []
      }
      newsletter_sends: {
        Row: {
          edition_date: string
          email: string
          id: number
          sent_at: string | null
        }
        Insert: {
          edition_date: string
          email: string
          id?: never
          sent_at?: string | null
        }
        Update: {
          edition_date?: string
          email?: string
          id?: never
          sent_at?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          campaign_updates: boolean | null
          created_at: string | null
          deal_alerts: boolean | null
          fee_alerts: boolean | null
          id: string
          marketing: boolean | null
          updated_at: string | null
          user_id: string | null
          weekly_digest: boolean | null
        }
        Insert: {
          campaign_updates?: boolean | null
          created_at?: string | null
          deal_alerts?: boolean | null
          fee_alerts?: boolean | null
          id?: string
          marketing?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          weekly_digest?: boolean | null
        }
        Update: {
          campaign_updates?: boolean | null
          created_at?: string | null
          deal_alerts?: boolean | null
          fee_alerts?: boolean | null
          id?: string
          marketing?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          weekly_digest?: boolean | null
        }
        Relationships: []
      }
      pro_deal_redemptions: {
        Row: {
          deal_id: number
          id: number
          redeemed_at: string | null
          user_id: string
        }
        Insert: {
          deal_id: number
          id?: never
          redeemed_at?: string | null
          user_id: string
        }
        Update: {
          deal_id?: number
          id?: never
          redeemed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_deal_redemptions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "pro_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_deals: {
        Row: {
          broker_slug: string
          created_at: string | null
          deal_value: string | null
          description: string | null
          end_date: string | null
          featured: boolean | null
          id: number
          redemption_code: string | null
          redemption_instructions: string | null
          redemption_url: string | null
          sort_order: number | null
          start_date: string | null
          status: string
          terms: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          broker_slug: string
          created_at?: string | null
          deal_value?: string | null
          description?: string | null
          end_date?: string | null
          featured?: boolean | null
          id?: never
          redemption_code?: string | null
          redemption_instructions?: string | null
          redemption_url?: string | null
          sort_order?: number | null
          start_date?: string | null
          status?: string
          terms?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          broker_slug?: string
          created_at?: string | null
          deal_value?: string | null
          description?: string | null
          end_date?: string | null
          featured?: boolean | null
          id?: never
          redemption_code?: string | null
          redemption_instructions?: string | null
          redemption_url?: string | null
          sort_order?: number | null
          start_date?: string | null
          status?: string
          terms?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string
          email_deal_alerts: boolean | null
          email_fee_alerts: boolean | null
          email_newsletter: boolean | null
          email_weekly_digest: boolean | null
          id: string
          stripe_customer_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email: string
          email_deal_alerts?: boolean | null
          email_fee_alerts?: boolean | null
          email_newsletter?: boolean | null
          email_weekly_digest?: boolean | null
          id: string
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string
          email_deal_alerts?: boolean | null
          email_fee_alerts?: boolean | null
          email_newsletter?: boolean | null
          email_weekly_digest?: boolean | null
          id?: string
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quarterly_reports: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          executive_summary: string | null
          fee_changes_summary: Json | null
          id: number
          key_findings: Json | null
          new_entrants: string[] | null
          published_at: string | null
          quarter: string
          sections: Json | null
          slug: string
          status: string
          title: string
          updated_at: string | null
          year: number
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          executive_summary?: string | null
          fee_changes_summary?: Json | null
          id?: never
          key_findings?: Json | null
          new_entrants?: string[] | null
          published_at?: string | null
          quarter: string
          sections?: Json | null
          slug: string
          status?: string
          title: string
          updated_at?: string | null
          year: number
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          executive_summary?: string | null
          fee_changes_summary?: Json | null
          id?: never
          key_findings?: Json | null
          new_entrants?: string[] | null
          published_at?: string | null
          quarter?: string
          sections?: Json | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      quiz_leads: {
        Row: {
          answers: Json | null
          captured_at: string | null
          email: string
          experience_level: string | null
          id: number
          investment_range: string | null
          name: string | null
          top_match_slug: string | null
          trading_interest: string | null
        }
        Insert: {
          answers?: Json | null
          captured_at?: string | null
          email: string
          experience_level?: string | null
          id?: number
          investment_range?: string | null
          name?: string | null
          top_match_slug?: string | null
          trading_interest?: string | null
        }
        Update: {
          answers?: Json | null
          captured_at?: string | null
          email?: string
          experience_level?: string | null
          id?: number
          investment_range?: string | null
          name?: string | null
          top_match_slug?: string | null
          trading_interest?: string | null
        }
        Relationships: []
      }
      quiz_weights: {
        Row: {
          advanced_weight: number | null
          beginner_weight: number | null
          broker_id: number | null
          broker_slug: string | null
          crypto_weight: number | null
          id: number
          low_fee_weight: number | null
          smsf_weight: number | null
          updated_at: string | null
          us_shares_weight: number | null
        }
        Insert: {
          advanced_weight?: number | null
          beginner_weight?: number | null
          broker_id?: number | null
          broker_slug?: string | null
          crypto_weight?: number | null
          id?: number
          low_fee_weight?: number | null
          smsf_weight?: number | null
          updated_at?: string | null
          us_shares_weight?: number | null
        }
        Update: {
          advanced_weight?: number | null
          beginner_weight?: number | null
          broker_id?: number | null
          broker_slug?: string | null
          crypto_weight?: number | null
          id?: number
          low_fee_weight?: number | null
          smsf_weight?: number | null
          updated_at?: string | null
          us_shares_weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_weights_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_alerts: {
        Row: {
          action_items: Json | null
          alert_type: string
          body: string | null
          created_at: string | null
          effective_date: string | null
          id: number
          impact_summary: string | null
          published_at: string | null
          severity: string
          slug: string
          source_name: string | null
          source_url: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          action_items?: Json | null
          alert_type: string
          body?: string | null
          created_at?: string | null
          effective_date?: string | null
          id?: never
          impact_summary?: string | null
          published_at?: string | null
          severity?: string
          slug: string
          source_name?: string | null
          source_url?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          action_items?: Json | null
          alert_type?: string
          body?: string | null
          created_at?: string | null
          effective_date?: string | null
          id?: never
          impact_summary?: string | null
          published_at?: string | null
          severity?: string
          slug?: string
          source_name?: string | null
          source_url?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      scenarios: {
        Row: {
          brokers: Json | null
          considerations: Json | null
          created_at: string | null
          hero_title: string | null
          icon: string | null
          id: number
          problem: string | null
          related_articles: Json | null
          related_calculators: Json | null
          slug: string
          solution: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          brokers?: Json | null
          considerations?: Json | null
          created_at?: string | null
          hero_title?: string | null
          icon?: string | null
          id?: number
          problem?: string | null
          related_articles?: Json | null
          related_calculators?: Json | null
          slug: string
          solution?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          brokers?: Json | null
          considerations?: Json | null
          created_at?: string | null
          hero_title?: string | null
          icon?: string | null
          id?: number
          problem?: string | null
          related_articles?: Json | null
          related_calculators?: Json | null
          slug?: string
          solution?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shared_shortlists: {
        Row: {
          broker_slugs: string[]
          code: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          view_count: number | null
        }
        Insert: {
          broker_slugs: string[]
          code: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          view_count?: number | null
        }
        Update: {
          broker_slugs?: string[]
          code?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: number
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          id?: number
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          id?: number
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      sponsor_invoices: {
        Row: {
          amount_cents: number
          broker_slug: string
          created_at: string | null
          id: number
          notes: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          status: string
          tier: string
        }
        Insert: {
          amount_cents: number
          broker_slug: string
          created_at?: string | null
          id?: number
          notes?: string | null
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: string
          tier: string
        }
        Update: {
          amount_cents?: number
          broker_slug?: string
          created_at?: string | null
          id?: number
          notes?: string | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: string
          tier?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: number
          plan_interval: string | null
          price_id: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: never
          plan_interval?: string | null
          price_id?: string | null
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: never
          plan_interval?: string | null
          price_id?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string | null
          id: number
          message: string
          sender_name: string | null
          sender_type: string
          ticket_id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          message: string
          sender_name?: string | null
          sender_type: string
          ticket_id: number
        }
        Update: {
          created_at?: string | null
          id?: number
          message?: string
          sender_name?: string | null
          sender_type?: string
          ticket_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          broker_slug: string
          category: string
          created_at: string | null
          id: number
          priority: string
          status: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          broker_slug: string
          category: string
          created_at?: string | null
          id?: number
          priority?: string
          status?: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          broker_slug?: string
          category?: string
          created_at?: string | null
          id?: number
          priority?: string
          status?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      switch_stories: {
        Row: {
          body: string
          created_at: string | null
          dest_broker_id: number
          dest_broker_slug: string
          dest_rating: number
          display_name: string
          email: string
          estimated_savings: string | null
          id: number
          moderation_note: string | null
          reason: string | null
          source_broker_id: number
          source_broker_slug: string
          source_rating: number
          status: string
          time_with_source: string | null
          title: string
          updated_at: string | null
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          dest_broker_id: number
          dest_broker_slug: string
          dest_rating: number
          display_name: string
          email: string
          estimated_savings?: string | null
          id?: number
          moderation_note?: string | null
          reason?: string | null
          source_broker_id: number
          source_broker_slug: string
          source_rating: number
          status?: string
          time_with_source?: string | null
          title: string
          updated_at?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          dest_broker_id?: number
          dest_broker_slug?: string
          dest_rating?: number
          display_name?: string
          email?: string
          estimated_savings?: string | null
          id?: number
          moderation_note?: string | null
          reason?: string | null
          source_broker_id?: number
          source_broker_slug?: string
          source_rating?: number
          status?: string
          time_with_source?: string | null
          title?: string
          updated_at?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "switch_stories_dest_broker_id_fkey"
            columns: ["dest_broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "switch_stories_source_broker_id_fkey"
            columns: ["source_broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          credentials: Json | null
          disclosure: string | null
          full_name: string
          id: number
          linkedin_url: string | null
          publications: Json | null
          role: string
          short_bio: string | null
          slug: string
          status: string | null
          twitter_url: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          credentials?: Json | null
          disclosure?: string | null
          full_name: string
          id?: number
          linkedin_url?: string | null
          publications?: Json | null
          role?: string
          short_bio?: string | null
          slug: string
          status?: string | null
          twitter_url?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          credentials?: Json | null
          disclosure?: string | null
          full_name?: string
          id?: number
          linkedin_url?: string | null
          publications?: Json | null
          role?: string
          short_bio?: string | null
          slug?: string
          status?: string | null
          twitter_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_reviews: {
        Row: {
          body: string
          broker_id: number
          broker_slug: string
          cons: string | null
          created_at: string | null
          display_name: string
          email: string
          experience_months: number | null
          fees_rating: number | null
          id: number
          ip_hash: string | null
          moderation_note: string | null
          platform_rating: number | null
          pros: string | null
          rating: number
          reliability_rating: number | null
          status: string
          support_rating: number | null
          title: string
          updated_at: string | null
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          body: string
          broker_id: number
          broker_slug: string
          cons?: string | null
          created_at?: string | null
          display_name: string
          email: string
          experience_months?: number | null
          fees_rating?: number | null
          id?: number
          ip_hash?: string | null
          moderation_note?: string | null
          platform_rating?: number | null
          pros?: string | null
          rating: number
          reliability_rating?: number | null
          status?: string
          support_rating?: number | null
          title: string
          updated_at?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          body?: string
          broker_id?: number
          broker_slug?: string
          cons?: string | null
          created_at?: string | null
          display_name?: string
          email?: string
          experience_months?: number | null
          fees_rating?: number | null
          id?: number
          ip_hash?: string | null
          moderation_note?: string | null
          platform_rating?: number | null
          pros?: string | null
          rating?: number
          reliability_rating?: number | null
          status?: string
          support_rating?: number | null
          title?: string
          updated_at?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_reviews_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount_cents: number
          balance_after_cents: number
          broker_slug: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: number
          reference_id: string | null
          reference_type: string | null
          stripe_payment_intent_id: string | null
          type: string
        }
        Insert: {
          amount_cents: number
          balance_after_cents: number
          broker_slug: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: never
          reference_id?: string | null
          reference_type?: string | null
          stripe_payment_intent_id?: string | null
          type: string
        }
        Update: {
          amount_cents?: number
          balance_after_cents?: number
          broker_slug?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: never
          reference_id?: string | null
          reference_type?: string | null
          stripe_payment_intent_id?: string | null
          type?: string
        }
        Relationships: []
      }
      webhook_delivery_queue: {
        Row: {
          attempt_count: number | null
          broker_slug: string
          conversion_event_id: number
          created_at: string | null
          id: number
          last_error: string | null
          max_attempts: number | null
          next_retry_at: string | null
          payload: Json
          status: string | null
          updated_at: string | null
          webhook_url: string
        }
        Insert: {
          attempt_count?: number | null
          broker_slug: string
          conversion_event_id: number
          created_at?: string | null
          id?: never
          last_error?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          payload: Json
          status?: string | null
          updated_at?: string | null
          webhook_url: string
        }
        Update: {
          attempt_count?: number | null
          broker_slug?: string
          conversion_event_id?: number
          created_at?: string | null
          id?: never
          last_error?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          payload?: Json
          status?: string | null
          updated_at?: string | null
          webhook_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_click_stats_by_broker: {
        Args: never
        Returns: {
          broker_name: string
          broker_slug: string
          count: number
        }[]
      }
      get_click_stats_by_source: {
        Args: never
        Returns: {
          count: number
          source: string
        }[]
      }
      get_daily_click_stats: {
        Args: { days_back?: number }
        Returns: {
          clicks: number
          day: string
        }[]
      }
      get_revenue_stats_by_broker: {
        Args: never
        Returns: {
          broker_name: string
          broker_slug: string
          clicks: number
          estimated_epc: number
          estimated_revenue: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_pro: { Args: { check_user_id?: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
