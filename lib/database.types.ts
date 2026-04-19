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
      _slug_fix_log: {
        Row: {
          id: number
          note: string | null
          ts: string | null
        }
        Insert: {
          id?: number
          note?: string | null
          ts?: string | null
        }
        Update: {
          id?: number
          note?: string | null
          ts?: string | null
        }
        Relationships: []
      }
      ab_tests: {
        Row: {
          auto_promoted: boolean
          auto_promoted_at: string | null
          auto_promoted_variant: string | null
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
          min_sample_size: number | null
          name: string
          significance_threshold: number | null
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
          auto_promoted?: boolean
          auto_promoted_at?: string | null
          auto_promoted_variant?: string | null
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
          min_sample_size?: number | null
          name: string
          significance_threshold?: number | null
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
          auto_promoted?: boolean
          auto_promoted_at?: string | null
          auto_promoted_variant?: string | null
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
          min_sample_size?: number | null
          name?: string
          significance_threshold?: number | null
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
      admin_action_log: {
        Row: {
          action: string
          admin_email: string
          context: Json | null
          created_at: string
          feature: string
          id: number
          reason: string | null
          target_row_id: number | null
          target_verdict: string | null
        }
        Insert: {
          action: string
          admin_email: string
          context?: Json | null
          created_at?: string
          feature: string
          id?: number
          reason?: string | null
          target_row_id?: number | null
          target_verdict?: string | null
        }
        Update: {
          action?: string
          admin_email?: string
          context?: Json | null
          created_at?: string
          feature?: string
          id?: number
          reason?: string | null
          target_row_id?: number | null
          target_verdict?: string | null
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
      admin_login_attempts: {
        Row: {
          count: number
          ip_hash: string
          reset_at: string
        }
        Insert: {
          count?: number
          ip_hash: string
          reset_at: string
        }
        Update: {
          count?: number
          ip_hash?: string
          reset_at?: string
        }
        Relationships: []
      }
      admin_mfa_enrollments: {
        Row: {
          admin_email: string
          disabled_at: string | null
          enrolled_at: string
          id: number
          last_verified_at: string | null
          recovery_codes: string[]
          secret_encrypted: string
        }
        Insert: {
          admin_email: string
          disabled_at?: string | null
          enrolled_at?: string
          id?: number
          last_verified_at?: string | null
          recovery_codes?: string[]
          secret_encrypted: string
        }
        Update: {
          admin_email?: string
          disabled_at?: string | null
          enrolled_at?: string
          id?: number
          last_verified_at?: string | null
          recovery_codes?: string[]
          secret_encrypted?: string
        }
        Relationships: []
      }
      advisor_applications: {
        Row: {
          abn: string | null
          account_type: string | null
          admin_notes: string | null
          admin_overridden_at: string | null
          admin_overridden_by: string | null
          admin_priority: string | null
          afsl_number: string | null
          bio: string | null
          client_types: string | null
          created_at: string | null
          email: string
          fee_description: string | null
          firm_id: number | null
          firm_name: string | null
          id: number
          languages: string | null
          location_state: string | null
          location_suburb: string | null
          name: string
          phone: string | null
          photo_url: string | null
          pitch_message: string | null
          professional_id: number | null
          referral_source: string | null
          registration_number: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialties: string | null
          status: string | null
          supply_gap_score: number | null
          type: string
          website: string | null
          years_experience: number | null
        }
        Insert: {
          abn?: string | null
          account_type?: string | null
          admin_notes?: string | null
          admin_overridden_at?: string | null
          admin_overridden_by?: string | null
          admin_priority?: string | null
          afsl_number?: string | null
          bio?: string | null
          client_types?: string | null
          created_at?: string | null
          email: string
          fee_description?: string | null
          firm_id?: number | null
          firm_name?: string | null
          id?: number
          languages?: string | null
          location_state?: string | null
          location_suburb?: string | null
          name: string
          phone?: string | null
          photo_url?: string | null
          pitch_message?: string | null
          professional_id?: number | null
          referral_source?: string | null
          registration_number?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialties?: string | null
          status?: string | null
          supply_gap_score?: number | null
          type: string
          website?: string | null
          years_experience?: number | null
        }
        Update: {
          abn?: string | null
          account_type?: string | null
          admin_notes?: string | null
          admin_overridden_at?: string | null
          admin_overridden_by?: string | null
          admin_priority?: string | null
          afsl_number?: string | null
          bio?: string | null
          client_types?: string | null
          created_at?: string | null
          email?: string
          fee_description?: string | null
          firm_id?: number | null
          firm_name?: string | null
          id?: number
          languages?: string | null
          location_state?: string | null
          location_suburb?: string | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          pitch_message?: string | null
          professional_id?: number | null
          referral_source?: string | null
          registration_number?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialties?: string | null
          status?: string | null
          supply_gap_score?: number | null
          type?: string
          website?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_applications_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "advisor_firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_applications_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_advisor_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_applications_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_article_moderation_log: {
        Row: {
          action: string
          article_id: number
          created_at: string | null
          id: number
          new_status: string | null
          notes: string | null
          old_status: string | null
          performed_by: string
        }
        Insert: {
          action: string
          article_id: number
          created_at?: string | null
          id?: never
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          performed_by: string
        }
        Update: {
          action?: string
          article_id?: number
          created_at?: string | null
          id?: never
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          performed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_article_moderation_log_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "advisor_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_articles: {
        Row: {
          admin_notes: string | null
          author_firm: string | null
          author_name: string
          author_photo_url: string | null
          author_slug: string | null
          avg_read_time_seconds: number | null
          canonical_url: string | null
          category: string | null
          click_count: number | null
          content: string
          cover_image_url: string | null
          created_at: string | null
          excerpt: string | null
          featured: boolean | null
          id: number
          lead_clicks: number | null
          meta_description: string | null
          meta_title: string | null
          moderation_score: number | null
          paid_at: string | null
          payment_reference: string | null
          payment_status: string | null
          price_cents: number | null
          pricing_tier: string | null
          professional_id: number
          profile_clicks: number | null
          published_at: string | null
          read_time: number | null
          reading_time_mins: number | null
          rejection_reason: string | null
          related_advisor_type: string | null
          related_advisor_types: string[] | null
          related_broker_slugs: string[] | null
          related_brokers: string[] | null
          reviewed_at: string | null
          reviewed_by: string | null
          share_count: number | null
          slug: string | null
          status: string
          submitted_at: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          view_count: number | null
          word_count: number | null
        }
        Insert: {
          admin_notes?: string | null
          author_firm?: string | null
          author_name: string
          author_photo_url?: string | null
          author_slug?: string | null
          avg_read_time_seconds?: number | null
          canonical_url?: string | null
          category?: string | null
          click_count?: number | null
          content: string
          cover_image_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured?: boolean | null
          id?: number
          lead_clicks?: number | null
          meta_description?: string | null
          meta_title?: string | null
          moderation_score?: number | null
          paid_at?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          price_cents?: number | null
          pricing_tier?: string | null
          professional_id: number
          profile_clicks?: number | null
          published_at?: string | null
          read_time?: number | null
          reading_time_mins?: number | null
          rejection_reason?: string | null
          related_advisor_type?: string | null
          related_advisor_types?: string[] | null
          related_broker_slugs?: string[] | null
          related_brokers?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          share_count?: number | null
          slug?: string | null
          status?: string
          submitted_at?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
          word_count?: number | null
        }
        Update: {
          admin_notes?: string | null
          author_firm?: string | null
          author_name?: string
          author_photo_url?: string | null
          author_slug?: string | null
          avg_read_time_seconds?: number | null
          canonical_url?: string | null
          category?: string | null
          click_count?: number | null
          content?: string
          cover_image_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured?: boolean | null
          id?: number
          lead_clicks?: number | null
          meta_description?: string | null
          meta_title?: string | null
          moderation_score?: number | null
          paid_at?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          price_cents?: number | null
          pricing_tier?: string | null
          professional_id?: number
          profile_clicks?: number | null
          published_at?: string | null
          read_time?: number | null
          reading_time_mins?: number | null
          rejection_reason?: string | null
          related_advisor_type?: string | null
          related_advisor_types?: string[] | null
          related_broker_slugs?: string[] | null
          related_brokers?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          share_count?: number | null
          slug?: string | null
          status?: string
          submitted_at?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_articles_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_advisor_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_articles_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_auth_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: number
          professional_id: number
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: number
          professional_id: number
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: number
          professional_id?: number
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_auth_tokens_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_advisor_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_auth_tokens_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_billing: {
        Row: {
          amount_cents: number
          created_at: string | null
          description: string
          id: number
          invoice_number: string | null
          lead_id: number | null
          paid_at: string | null
          professional_id: number
          status: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          description: string
          id?: number
          invoice_number?: string | null
          lead_id?: number | null
          paid_at?: string | null
          professional_id: number
          status?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          description?: string
          id?: number
          invoice_number?: string | null
          lead_id?: number | null
          paid_at?: string | null
          professional_id?: number
          status?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_billing_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "professional_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_billing_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_advisor_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_billing_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_booking_appointments: {
        Row: {
          booked_at: string | null
          booked_by_email: string | null
          booked_by_name: string | null
          created_at: string
          duration_minutes: number
          ends_at: string
          id: number
          lead_id: number | null
          notes: string | null
          professional_id: number
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          booked_at?: string | null
          booked_by_email?: string | null
          booked_by_name?: string | null
          created_at?: string
          duration_minutes: number
          ends_at: string
          id?: number
          lead_id?: number | null
          notes?: string | null
          professional_id: number
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          booked_at?: string | null
          booked_by_email?: string | null
          booked_by_name?: string | null
          created_at?: string
          duration_minutes?: number
          ends_at?: string
          id?: number
          lead_id?: number | null
          notes?: string | null
          professional_id?: number
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      advisor_booking_slots: {
        Row: {
          day_of_week: number
          end_time: string
          id: number
          is_active: boolean | null
          professional_id: number
          slot_duration_minutes: number | null
          start_time: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          id?: number
          is_active?: boolean | null
          professional_id: number
          slot_duration_minutes?: number | null
          start_time: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          id?: number
          is_active?: boolean | null
          professional_id?: number
          slot_duration_minutes?: number | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_booking_slots_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_advisor_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_booking_slots_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_bookings: {
        Row: {
          booking_date: string
          booking_time: string
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmation_token: string | null
          created_at: string | null
          duration_minutes: number | null
          id: number
          investor_email: string
          investor_name: string
          investor_phone: string | null
          lead_id: number | null
          professional_id: number
          source_page: string | null
          status: string | null
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          booking_date: string
          booking_time: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmation_token?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: number
          investor_email: string
          investor_name: string
          investor_phone?: string | null
          lead_id?: number | null
          professional_id: number
          source_page?: string | null
          status?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_date?: string
          booking_time?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmation_token?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: number
          investor_email?: string
          investor_name?: string
          investor_phone?: string | null
          lead_id?: number | null
          professional_id?: number
          source_page?: string | null
          status?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "professional_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_bookings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_advisor_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_bookings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_credit_topups: {
        Row: {
          amount_cents: number
          created_at: string
          dunning_last_attempt_at: string | null
          dunning_step: number | null
          id: number
          professional_id: number
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          dunning_last_attempt_at?: string | null
          dunning_step?: number | null
          id?: never
          professional_id: number
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          dunning_last_attempt_at?: string | null
          dunning_step?: number | null
          id?: never
          professional_id?: number
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_credit_topups_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_advisor_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_credit_topups_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_firm_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          firm_id: number
          id: number
          invited_by: number
          name: string | null
          role: string | null
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          firm_id: number
          id?: number
          invited_by: number
          name?: string | null
          role?: string | null
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          firm_id?: number
          id?: number
          invited_by?: number
          name?: string | null
          role?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_firm_invitations_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "advisor_firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_firm_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "admin_advisor_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_firm_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_firms: {
        Row: {
          abn: string | null
          acn: string | null
          admin_professional_id: number | null
          afsl_number: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          id: number
          location_display: string | null
          location_state: string | null
          location_suburb: string | null
          logo_url: string | null
          max_seats: number | null
          name: string
          phone: string | null
          slug: string
          status: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          abn?: string | null
          acn?: string | null
          admin_professional_id?: number | null
          afsl_number?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          location_display?: string | null
          location_state?: string | null
          location_suburb?: string | null
          logo_url?: string | null
          max_seats?: number | null
          name: string
          phone?: string | null
          slug: string
          status?: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          abn?: string | null
          acn?: string | null
          admin_professional_id?: number | null
          afsl_number?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          location_display?: string | null
          location_state?: string | null
          location_suburb?: string | null
          logo_url?: string | null
          max_seats?: number | null
          name?: string
          phone?: string | null
          slug?: string
          status?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_firms_admin_professional_id_fkey"
            columns: ["admin_professional_id"]
            isOneToOne: false
            referencedRelation: "admin_advisor_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_firms_admin_professional_id_fkey"
            columns: ["admin_professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_guide_content: {
        Row: {
          advisor_type: string
          checklist: Json | null
          cost_guide: Json | null
          created_at: string | null
          faqs: Json | null
          id: number
          intro: string | null
          meta_description: string | null
          red_flags: Json | null
          sections: Json | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          advisor_type: string
          checklist?: Json | null
          cost_guide?: Json | null
          created_at?: string | null
          faqs?: Json | null
          id?: number
          intro?: string | null
          meta_description?: string | null
          red_flags?: Json | null
          sections?: Json | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          advisor_type?: string
          checklist?: Json | null
          cost_guide?: Json | null
          created_at?: string | null
          faqs?: Json | null
          id?: number
          intro?: string | null
          meta_description?: string | null
          red_flags?: Json | null
          sections?: Json | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      advisor_kyc_documents: {
        Row: {
          document_type: string
          expires_at: string | null
          file_size_bytes: number | null
          id: number
          mime_type: string | null
          original_filename: string | null
          professional_id: number
          rejection_reason: string | null
          status: string
          storage_path: string
          uploaded_at: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          document_type: string
          expires_at?: string | null
          file_size_bytes?: number | null
          id?: number
          mime_type?: string | null
          original_filename?: string | null
          professional_id: number
          rejection_reason?: string | null
          status?: string
          storage_path: string
          uploaded_at?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          document_type?: string
          expires_at?: string | null
          file_size_bytes?: number | null
          id?: number
          mime_type?: string | null
          original_filename?: string | null
          professional_id?: number
          rejection_reason?: string | null
          status?: string
          storage_path?: string
          uploaded_at?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      advisor_metrics_daily: {
        Row: {
          article_views: number | null
          booking_clicks: number | null
          date: string
          enquiry_count: number | null
          id: number
          phone_clicks: number | null
          professional_id: number
          profile_views: number | null
          search_impressions: number | null
          website_clicks: number | null
        }
        Insert: {
          article_views?: number | null
          booking_clicks?: number | null
          date?: string
          enquiry_count?: number | null
          id?: number
          phone_clicks?: number | null
          professional_id: number
          profile_views?: number | null
          search_impressions?: number | null
          website_clicks?: number | null
        }
        Update: {
          article_views?: number | null
          booking_clicks?: number | null
          date?: string
          enquiry_count?: number | null
          id?: number
          phone_clicks?: number | null
          professional_id?: number
          profile_views?: number | null
          search_impressions?: number | null
          website_clicks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_metrics_daily_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_advisor_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_metrics_daily_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_profile_views: {
        Row: {
          id: number
          professional_id: number
          view_count: number | null
          view_date: string
        }
        Insert: {
          id?: number
          professional_id: number
          view_count?: number | null
          view_date?: string
        }
        Update: {
          id?: number
          professional_id?: number
          view_count?: number | null
          view_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_profile_views_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_advisor_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_profile_views_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: number
          professional_id: number
          session_token: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: number
          professional_id: number
          session_token: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: number
          professional_id?: number
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_sessions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_advisor_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_sessions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_specialties: {
        Row: {
          applicable_types: string[]
          category: string
          created_at: string | null
          display_order: number | null
          id: number
          name: string
        }
        Insert: {
          applicable_types?: string[]
          category: string
          created_at?: string | null
          display_order?: number | null
          id?: number
          name: string
        }
        Update: {
          applicable_types?: string[]
          category?: string
          created_at?: string | null
          display_order?: number | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      advisor_verification_log: {
        Row: {
          action: string
          created_at: string | null
          details: string | null
          id: number
          method: string | null
          performed_by: string | null
          professional_id: number
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: string | null
          id?: number
          method?: string | null
          performed_by?: string | null
          professional_id: number
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: string | null
          id?: number
          method?: string | null
          performed_by?: string | null
          professional_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "advisor_verification_log_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_advisor_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_verification_log_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
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
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
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
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
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
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
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
      agreement_acceptances: {
        Row: {
          accepted_at: string
          accepted_by_name: string | null
          agreement_type: string
          agreement_version: string
          broker_id: number | null
          email: string | null
          id: number
          ip_address: string | null
          metadata: Json | null
          professional_id: number | null
          user_agent: string | null
          user_type: string
        }
        Insert: {
          accepted_at?: string
          accepted_by_name?: string | null
          agreement_type: string
          agreement_version?: string
          broker_id?: number | null
          email?: string | null
          id?: never
          ip_address?: string | null
          metadata?: Json | null
          professional_id?: number | null
          user_agent?: string | null
          user_type: string
        }
        Update: {
          accepted_at?: string
          accepted_by_name?: string | null
          agreement_type?: string
          agreement_version?: string
          broker_id?: number | null
          email?: string | null
          id?: never
          ip_address?: string | null
          metadata?: Json | null
          professional_id?: number | null
          user_agent?: string | null
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreement_acceptances_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreement_acceptances_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_advisor_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreement_acceptances_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
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
      anonymous_saves: {
        Row: {
          bookmark_type: string
          claimed_at: string | null
          claimed_by_user_id: string | null
          created_at: string
          id: number
          label: string | null
          ref: string
          session_id: string
        }
        Insert: {
          bookmark_type: string
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string
          id?: number
          label?: string | null
          ref: string
          session_id: string
        }
        Update: {
          bookmark_type?: string
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string
          id?: number
          label?: string | null
          ref?: string
          session_id?: string
        }
        Relationships: []
      }
      article_comments: {
        Row: {
          article_slug: string
          author_email: string
          author_id: string | null
          author_name: string
          auto_moderated_at: string | null
          auto_moderated_verdict: string | null
          body: string
          created_at: string
          helpful_count: number
          id: number
          parent_id: number | null
          status: string
          updated_at: string
        }
        Insert: {
          article_slug: string
          author_email: string
          author_id?: string | null
          author_name: string
          auto_moderated_at?: string | null
          auto_moderated_verdict?: string | null
          body: string
          created_at?: string
          helpful_count?: number
          id?: number
          parent_id?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          article_slug?: string
          author_email?: string
          author_id?: string | null
          author_name?: string
          auto_moderated_at?: string | null
          auto_moderated_verdict?: string | null
          body?: string
          created_at?: string
          helpful_count?: number
          id?: number
          parent_id?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      article_guidelines: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string
          id: number
          key: string
          sort_order: number | null
          title: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description: string
          id?: never
          key: string
          sort_order?: number | null
          title: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string
          id?: never
          key?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      article_moderation_log: {
        Row: {
          action: string
          article_id: number
          created_at: string | null
          id: number
          new_status: string | null
          notes: string | null
          old_status: string | null
          performed_by: string | null
        }
        Insert: {
          action: string
          article_id: number
          created_at?: string | null
          id?: number
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          article_id?: number
          created_at?: string | null
          id?: number
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_moderation_log_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "advisor_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_preview_tokens: {
        Row: {
          article_slug: string
          created_at: string
          created_by: string
          expires_at: string
          id: number
          last_opened_at: string | null
          note: string | null
          opened_count: number
          revoked_at: string | null
          token: string
        }
        Insert: {
          article_slug: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: number
          last_opened_at?: string | null
          note?: string | null
          opened_count?: number
          revoked_at?: string | null
          token: string
        }
        Update: {
          article_slug?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: number
          last_opened_at?: string | null
          note?: string | null
          opened_count?: number
          revoked_at?: string | null
          token?: string
        }
        Relationships: []
      }
      article_quality_scores: {
        Row: {
          article_id: number | null
          article_slug: string | null
          checked_at: string
          feedback: string | null
          id: number
          model: string | null
          provider: string
          rubric: Json
          score: number
          verdict: string
        }
        Insert: {
          article_id?: number | null
          article_slug?: string | null
          checked_at?: string
          feedback?: string | null
          id?: number
          model?: string | null
          provider: string
          rubric: Json
          score: number
          verdict: string
        }
        Update: {
          article_id?: number | null
          article_slug?: string | null
          checked_at?: string
          feedback?: string | null
          id?: number
          model?: string | null
          provider?: string
          rubric?: Json
          score?: number
          verdict?: string
        }
        Relationships: []
      }
      article_reactions: {
        Row: {
          article_slug: string
          created_at: string
          id: number
          ip_hash: string | null
          reaction: string
          user_id: string | null
        }
        Insert: {
          article_slug: string
          created_at?: string
          id?: number
          ip_hash?: string | null
          reaction: string
          user_id?: string | null
        }
        Update: {
          article_slug?: string
          created_at?: string
          id?: number
          ip_hash?: string | null
          reaction?: string
          user_id?: string | null
        }
        Relationships: []
      }
      article_scorecard_runs: {
        Row: {
          article_slug: string
          failed_checks: string[]
          grade: string
          id: number
          passed_checks: string[]
          remediation: Json | null
          run_at: string
          run_by: string | null
          score: number
        }
        Insert: {
          article_slug: string
          failed_checks?: string[]
          grade: string
          id?: number
          passed_checks?: string[]
          remediation?: Json | null
          run_at?: string
          run_by?: string | null
          score: number
        }
        Update: {
          article_slug?: string
          failed_checks?: string[]
          grade?: string
          id?: number
          passed_checks?: string[]
          remediation?: Json | null
          run_at?: string
          run_by?: string | null
          score?: number
        }
        Relationships: []
      }
      article_templates: {
        Row: {
          category_hint: string | null
          compliance_notes: string | null
          created_at: string
          default_tags: string[]
          description: string
          display_name: string
          display_order: number
          id: number
          min_words: number
          required_fields: Json
          required_sections: Json
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          category_hint?: string | null
          compliance_notes?: string | null
          created_at?: string
          default_tags?: string[]
          description: string
          display_name: string
          display_order?: number
          id?: number
          min_words?: number
          required_fields?: Json
          required_sections?: Json
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          category_hint?: string | null
          compliance_notes?: string | null
          created_at?: string
          default_tags?: string[]
          description?: string
          display_name?: string
          display_order?: number
          id?: number
          min_words?: number
          required_fields?: Json
          required_sections?: Json
          slug?: string
          status?: string
          updated_at?: string
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
          content_type: string | null
          cover_image_url: string | null
          created_at: string | null
          evergreen: boolean | null
          excerpt: string | null
          featured: boolean | null
          id: number
          last_audited_at: string | null
          last_reviewed_at: string | null
          last_reviewed_by: string | null
          meta_description: string | null
          meta_title: string | null
          needs_update: boolean | null
          publish_date: string | null
          published_at: string | null
          read_time: number | null
          related_advisor_types: string[] | null
          related_brokers: Json | null
          related_calc: string | null
          related_verticals: string[] | null
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
          content_type?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          evergreen?: boolean | null
          excerpt?: string | null
          featured?: boolean | null
          id?: number
          last_audited_at?: string | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          meta_description?: string | null
          meta_title?: string | null
          needs_update?: boolean | null
          publish_date?: string | null
          published_at?: string | null
          read_time?: number | null
          related_advisor_types?: string[] | null
          related_brokers?: Json | null
          related_calc?: string | null
          related_verticals?: string[] | null
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
          content_type?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          evergreen?: boolean | null
          excerpt?: string | null
          featured?: boolean | null
          id?: number
          last_audited_at?: string | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          meta_description?: string | null
          meta_title?: string | null
          needs_update?: boolean | null
          publish_date?: string | null
          published_at?: string | null
          read_time?: number | null
          related_advisor_types?: string[] | null
          related_brokers?: Json | null
          related_calc?: string | null
          related_verticals?: string[] | null
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
      attribution_touches: {
        Row: {
          campaign: string | null
          channel: string | null
          created_at: string
          event: string
          id: number
          landing_path: string | null
          medium: string | null
          page_path: string | null
          session_id: string
          source: string | null
          user_key: string | null
          value_cents: number | null
          vertical: string | null
        }
        Insert: {
          campaign?: string | null
          channel?: string | null
          created_at?: string
          event: string
          id?: number
          landing_path?: string | null
          medium?: string | null
          page_path?: string | null
          session_id: string
          source?: string | null
          user_key?: string | null
          value_cents?: number | null
          vertical?: string | null
        }
        Update: {
          campaign?: string | null
          channel?: string | null
          created_at?: string
          event?: string
          id?: number
          landing_path?: string | null
          medium?: string | null
          page_path?: string | null
          session_id?: string
          source?: string | null
          user_key?: string | null
          value_cents?: number | null
          vertical?: string | null
        }
        Relationships: []
      }
      au_postcodes: {
        Row: {
          geog: unknown
          latitude: number
          locality: string
          longitude: number
          postcode: string
          state: string
        }
        Insert: {
          geog?: unknown
          latitude: number
          locality: string
          longitude: number
          postcode: string
          state: string
        }
        Update: {
          geog?: unknown
          latitude?: number
          locality?: string
          longitude?: number
          postcode?: string
          state?: string
        }
        Relationships: []
      }
      auth_attempts: {
        Row: {
          attempt_type: string
          created_at: string | null
          email: string | null
          id: number
          ip_address: string | null
          success: boolean | null
        }
        Insert: {
          attempt_type: string
          created_at?: string | null
          email?: string | null
          id?: number
          ip_address?: string | null
          success?: boolean | null
        }
        Update: {
          attempt_type?: string
          created_at?: string | null
          email?: string | null
          id?: number
          ip_address?: string | null
          success?: boolean | null
        }
        Relationships: []
      }
      automation_kill_switches: {
        Row: {
          disabled: boolean
          disabled_at: string | null
          disabled_by: string | null
          feature: string
          reason: string | null
        }
        Insert: {
          disabled?: boolean
          disabled_at?: string | null
          disabled_by?: string | null
          feature: string
          reason?: string | null
        }
        Update: {
          disabled?: boolean
          disabled_at?: string | null
          disabled_by?: string | null
          feature?: string
          reason?: string | null
        }
        Relationships: []
      }
      automation_verdict_daily: {
        Row: {
          approved: number
          auto_acted: number
          day: string
          escalated: number
          feature: string
          id: number
          refunded_cents: number
          rejected: number
        }
        Insert: {
          approved?: number
          auto_acted?: number
          day: string
          escalated?: number
          feature: string
          id?: number
          refunded_cents?: number
          rejected?: number
        }
        Update: {
          approved?: number
          auto_acted?: number
          day?: string
          escalated?: number
          feature?: string
          id?: number
          refunded_cents?: number
          rejected?: number
        }
        Relationships: []
      }
      bd_pipeline: {
        Row: {
          company_name: string
          contact_email: string | null
          contact_linkedin: string | null
          contact_name: string | null
          cpa_rate: string | null
          created_at: string | null
          deal_notes: string | null
          id: number
          last_contact_date: string | null
          next_action: string | null
          next_action_date: string | null
          partnership_type: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_name: string
          contact_email?: string | null
          contact_linkedin?: string | null
          contact_name?: string | null
          cpa_rate?: string | null
          created_at?: string | null
          deal_notes?: string | null
          id?: number
          last_contact_date?: string | null
          next_action?: string | null
          next_action_date?: string | null
          partnership_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string
          contact_email?: string | null
          contact_linkedin?: string | null
          contact_name?: string | null
          cpa_rate?: string | null
          created_at?: string | null
          deal_notes?: string | null
          id?: number
          last_contact_date?: string | null
          next_action?: string | null
          next_action_date?: string | null
          partnership_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      best_for_scenarios: {
        Row: {
          body_sections: Json | null
          category_filter: string | null
          created_at: string
          display_order: number
          h1: string
          id: number
          intro: string
          meta_description: string
          required_attrs: string[]
          scoring_weights: Json
          slug: string
          status: string
          target_user: string
          updated_at: string
        }
        Insert: {
          body_sections?: Json | null
          category_filter?: string | null
          created_at?: string
          display_order?: number
          h1: string
          id?: number
          intro: string
          meta_description: string
          required_attrs?: string[]
          scoring_weights: Json
          slug: string
          status?: string
          target_user: string
          updated_at?: string
        }
        Update: {
          body_sections?: Json | null
          category_filter?: string | null
          created_at?: string
          display_order?: number
          h1?: string
          id?: number
          intro?: string
          meta_description?: string
          required_attrs?: string[]
          scoring_weights?: Json
          slug?: string
          status?: string
          target_user?: string
          updated_at?: string
        }
        Relationships: []
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
      broker_activity_log: {
        Row: {
          action: string
          broker_slug: string
          created_at: string | null
          detail: string | null
          entity_id: string | null
          entity_type: string | null
          id: number
        }
        Insert: {
          action: string
          broker_slug: string
          created_at?: string | null
          detail?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: number
        }
        Update: {
          action?: string
          broker_slug?: string
          created_at?: string | null
          detail?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: number
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
          auto_applied_at: string | null
          auto_applied_tier: string | null
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
          auto_applied_at?: string | null
          auto_applied_tier?: string | null
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
          auto_applied_at?: string | null
          auto_applied_tier?: string | null
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
      broker_price_snapshots: {
        Row: {
          asx_fee: string | null
          asx_fee_value: number | null
          broker_id: number
          broker_slug: string
          captured_at: string
          deal: string | null
          deal_expiry: string | null
          deal_text: string | null
          fx_rate: number | null
          id: number
          inactivity_fee: string | null
          inactivity_fee_value: number | null
          min_deposit: string | null
          min_deposit_value: number | null
          source: string
          status: string
          us_fee: string | null
          us_fee_value: number | null
        }
        Insert: {
          asx_fee?: string | null
          asx_fee_value?: number | null
          broker_id: number
          broker_slug: string
          captured_at?: string
          deal?: string | null
          deal_expiry?: string | null
          deal_text?: string | null
          fx_rate?: number | null
          id?: number
          inactivity_fee?: string | null
          inactivity_fee_value?: number | null
          min_deposit?: string | null
          min_deposit_value?: number | null
          source?: string
          status?: string
          us_fee?: string | null
          us_fee_value?: number | null
        }
        Update: {
          asx_fee?: string | null
          asx_fee_value?: number | null
          broker_id?: number
          broker_slug?: string
          captured_at?: string
          deal?: string | null
          deal_expiry?: string | null
          deal_text?: string | null
          fx_rate?: number | null
          id?: number
          inactivity_fee?: string | null
          inactivity_fee_value?: number | null
          min_deposit?: string | null
          min_deposit_value?: number | null
          source?: string
          status?: string
          us_fee?: string | null
          us_fee_value?: number | null
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
      broker_review_invites: {
        Row: {
          broker_id: number | null
          broker_slug: string
          completed_at: string | null
          email: string
          expires_at: string
          id: number
          opened_at: string | null
          sent_at: string
          status: string
          token: string
          user_review_id: number | null
        }
        Insert: {
          broker_id?: number | null
          broker_slug: string
          completed_at?: string | null
          email: string
          expires_at?: string
          id?: number
          opened_at?: string | null
          sent_at?: string
          status?: string
          token?: string
          user_review_id?: number | null
        }
        Update: {
          broker_id?: number | null
          broker_slug?: string
          completed_at?: string | null
          email?: string
          expires_at?: string
          id?: number
          opened_at?: string | null
          sent_at?: string
          status?: string
          token?: string
          user_review_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_review_invites_user_review_id_fkey"
            columns: ["user_review_id"]
            isOneToOne: false
            referencedRelation: "user_reviews"
            referencedColumns: ["id"]
          },
        ]
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
          accepts_non_residents: boolean | null
          advertising_terms_accepted_at: string | null
          advertising_terms_version: string | null
          affiliate_priority: string | null
          affiliate_url: string | null
          asx_fee: string | null
          asx_fee_value: number | null
          benefit_cta: string | null
          chess_sponsored: boolean | null
          color: string
          commission_type: string | null
          commission_value: number | null
          cons: Json | null
          cpa_value: number | null
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
          fee_auto_disabled: boolean | null
          fee_changelog: Json | null
          fee_check_failures: number | null
          fee_last_checked: string | null
          fee_page_hash: string | null
          fee_source_tcs_url: string | null
          fee_source_url: string | null
          fee_stale: boolean | null
          fee_stale_since: string | null
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
          logo_url: string | null
          markets: Json | null
          min_deposit: string | null
          name: string
          payment_methods: Json | null
          platform_type: string | null
          platforms: Json | null
          promoted_placement: boolean | null
          pros: Json | null
          rating: number | null
          regulated_by: string | null
          review_content: string | null
          reviewed_at: string | null
          reviewer_id: number | null
          slug: string
          smsf_support: boolean | null
          sponsored: boolean | null
          sponsored_tier: string | null
          sponsored_until: string | null
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
          accepts_non_residents?: boolean | null
          advertising_terms_accepted_at?: string | null
          advertising_terms_version?: string | null
          affiliate_priority?: string | null
          affiliate_url?: string | null
          asx_fee?: string | null
          asx_fee_value?: number | null
          benefit_cta?: string | null
          chess_sponsored?: boolean | null
          color: string
          commission_type?: string | null
          commission_value?: number | null
          cons?: Json | null
          cpa_value?: number | null
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
          fee_auto_disabled?: boolean | null
          fee_changelog?: Json | null
          fee_check_failures?: number | null
          fee_last_checked?: string | null
          fee_page_hash?: string | null
          fee_source_tcs_url?: string | null
          fee_source_url?: string | null
          fee_stale?: boolean | null
          fee_stale_since?: string | null
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
          logo_url?: string | null
          markets?: Json | null
          min_deposit?: string | null
          name: string
          payment_methods?: Json | null
          platform_type?: string | null
          platforms?: Json | null
          promoted_placement?: boolean | null
          pros?: Json | null
          rating?: number | null
          regulated_by?: string | null
          review_content?: string | null
          reviewed_at?: string | null
          reviewer_id?: number | null
          slug: string
          smsf_support?: boolean | null
          sponsored?: boolean | null
          sponsored_tier?: string | null
          sponsored_until?: string | null
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
          accepts_non_residents?: boolean | null
          advertising_terms_accepted_at?: string | null
          advertising_terms_version?: string | null
          affiliate_priority?: string | null
          affiliate_url?: string | null
          asx_fee?: string | null
          asx_fee_value?: number | null
          benefit_cta?: string | null
          chess_sponsored?: boolean | null
          color?: string
          commission_type?: string | null
          commission_value?: number | null
          cons?: Json | null
          cpa_value?: number | null
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
          fee_auto_disabled?: boolean | null
          fee_changelog?: Json | null
          fee_check_failures?: number | null
          fee_last_checked?: string | null
          fee_page_hash?: string | null
          fee_source_tcs_url?: string | null
          fee_source_url?: string | null
          fee_stale?: boolean | null
          fee_stale_since?: string | null
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
          logo_url?: string | null
          markets?: Json | null
          min_deposit?: string | null
          name?: string
          payment_methods?: Json | null
          platform_type?: string | null
          platforms?: Json | null
          promoted_placement?: boolean | null
          pros?: Json | null
          rating?: number | null
          regulated_by?: string | null
          review_content?: string | null
          reviewed_at?: string | null
          reviewer_id?: number | null
          slug?: string
          smsf_support?: boolean | null
          sponsored?: boolean | null
          sponsored_tier?: string | null
          sponsored_until?: string | null
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
      buyer_agents: {
        Row: {
          agency_name: string | null
          avg_property_value: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          featured: boolean | null
          fee_fixed_cents: number | null
          fee_percent: number | null
          fee_structure: string | null
          id: number
          investment_focus: string[] | null
          listing_fee_cents: number | null
          name: string
          phone: string | null
          photo_url: string | null
          rating: number | null
          review_count: number | null
          slug: string
          states_covered: string[] | null
          status: string | null
          suburbs_speciality: string[] | null
          updated_at: string | null
          verified: boolean | null
          website: string | null
        }
        Insert: {
          agency_name?: string | null
          avg_property_value?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          featured?: boolean | null
          fee_fixed_cents?: number | null
          fee_percent?: number | null
          fee_structure?: string | null
          id?: number
          investment_focus?: string[] | null
          listing_fee_cents?: number | null
          name: string
          phone?: string | null
          photo_url?: string | null
          rating?: number | null
          review_count?: number | null
          slug: string
          states_covered?: string[] | null
          status?: string | null
          suburbs_speciality?: string[] | null
          updated_at?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          agency_name?: string | null
          avg_property_value?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          featured?: boolean | null
          fee_fixed_cents?: number | null
          fee_percent?: number | null
          fee_structure?: string | null
          id?: number
          investment_focus?: string[] | null
          listing_fee_cents?: number | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          rating?: number | null
          review_count?: number | null
          slug?: string
          states_covered?: string[] | null
          status?: string | null
          suburbs_speciality?: string[] | null
          updated_at?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Relationships: []
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
      campaign_templates: {
        Row: {
          active_days: number[] | null
          active_hours_end: number | null
          active_hours_start: number | null
          broker_slug: string
          created_at: string | null
          daily_budget_cents: number | null
          id: number
          inventory_type: string | null
          name: string
          placement_id: number | null
          rate_cents: number | null
          total_budget_cents: number | null
          updated_at: string | null
        }
        Insert: {
          active_days?: number[] | null
          active_hours_end?: number | null
          active_hours_start?: number | null
          broker_slug: string
          created_at?: string | null
          daily_budget_cents?: number | null
          id?: number
          inventory_type?: string | null
          name: string
          placement_id?: number | null
          rate_cents?: number | null
          total_budget_cents?: number | null
          updated_at?: string | null
        }
        Update: {
          active_days?: number[] | null
          active_hours_end?: number | null
          active_hours_start?: number | null
          broker_slug?: string
          created_at?: string | null
          daily_budget_cents?: number | null
          id?: number
          inventory_type?: string | null
          name?: string
          placement_id?: number | null
          rate_cents?: number | null
          total_budget_cents?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_templates_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "marketplace_placements"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          active_days: number[] | null
          active_hours_end: number | null
          active_hours_start: number | null
          auto_bid_current_cents: number | null
          auto_bid_last_adjusted_at: string | null
          auto_bid_max_cents: number | null
          auto_bid_min_cents: number | null
          bid_strategy: string
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
          target_cpa_cents: number | null
          total_budget_cents: number | null
          total_spent_cents: number
          updated_at: string | null
        }
        Insert: {
          active_days?: number[] | null
          active_hours_end?: number | null
          active_hours_start?: number | null
          auto_bid_current_cents?: number | null
          auto_bid_last_adjusted_at?: string | null
          auto_bid_max_cents?: number | null
          auto_bid_min_cents?: number | null
          bid_strategy?: string
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
          target_cpa_cents?: number | null
          total_budget_cents?: number | null
          total_spent_cents?: number
          updated_at?: string | null
        }
        Update: {
          active_days?: number[] | null
          active_hours_end?: number | null
          active_hours_start?: number | null
          auto_bid_current_cents?: number | null
          auto_bid_last_adjusted_at?: string | null
          auto_bid_max_cents?: number | null
          auto_bid_min_cents?: number | null
          bid_strategy?: string
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
          target_cpa_cents?: number | null
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
      chatbot_conversations: {
        Row: {
          content: string
          context: Json | null
          created_at: string
          flagged: boolean
          flagged_reason: string | null
          id: number
          model: string | null
          role: string
          session_id: string
          tokens_in: number | null
          tokens_out: number | null
          user_key: string | null
        }
        Insert: {
          content: string
          context?: Json | null
          created_at?: string
          flagged?: boolean
          flagged_reason?: string | null
          id?: number
          model?: string | null
          role: string
          session_id: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_key?: string | null
        }
        Update: {
          content?: string
          context?: Json | null
          created_at?: string
          flagged?: boolean
          flagged_reason?: string | null
          id?: number
          model?: string | null
          role?: string
          session_id?: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_key?: string | null
        }
        Relationships: []
      }
      churn_scores: {
        Row: {
          computed_at: string
          id: number
          professional_id: number
          reasons: Json | null
          risk_bucket: string
          risk_score: number
        }
        Insert: {
          computed_at?: string
          id?: number
          professional_id: number
          reasons?: Json | null
          risk_bucket: string
          risk_score: number
        }
        Update: {
          computed_at?: string
          id?: number
          professional_id?: number
          reasons?: Json | null
          risk_bucket?: string
          risk_score?: number
        }
        Relationships: []
      }
      churn_surveys: {
        Row: {
          comment: string | null
          created_at: string
          id: number
          months_active: number | null
          plan_label: string | null
          reason_code: string
          stripe_subscription_id: string | null
          subscriber_email: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: number
          months_active?: number | null
          plan_label?: string | null
          reason_code: string
          stripe_subscription_id?: string | null
          subscriber_email: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: number
          months_active?: number | null
          plan_label?: string | null
          reason_code?: string
          stripe_subscription_id?: string | null
          subscriber_email?: string
        }
        Relationships: []
      }
      classifier_config: {
        Row: {
          classifier: string
          description: string | null
          id: number
          max_value: number | null
          min_value: number | null
          threshold_name: string
          updated_at: string
          updated_by: string | null
          value: number
        }
        Insert: {
          classifier: string
          description?: string | null
          id?: number
          max_value?: number | null
          min_value?: number | null
          threshold_name: string
          updated_at?: string
          updated_by?: string | null
          value: number
        }
        Update: {
          classifier?: string
          description?: string | null
          id?: number
          max_value?: number | null
          min_value?: number | null
          threshold_name?: string
          updated_at?: string
          updated_by?: string | null
          value?: number
        }
        Relationships: []
      }
      commodity_etfs: {
        Row: {
          blurb: string | null
          created_at: string
          display_order: number
          distribution_frequency: string | null
          domicile: string | null
          id: number
          issuer: string | null
          mer_pct: number | null
          name: string
          sector_slug: string
          status: string
          ticker: string
          underlying_exposure: string | null
          updated_at: string
        }
        Insert: {
          blurb?: string | null
          created_at?: string
          display_order?: number
          distribution_frequency?: string | null
          domicile?: string | null
          id?: number
          issuer?: string | null
          mer_pct?: number | null
          name: string
          sector_slug: string
          status?: string
          ticker: string
          underlying_exposure?: string | null
          updated_at?: string
        }
        Update: {
          blurb?: string | null
          created_at?: string
          display_order?: number
          distribution_frequency?: string | null
          domicile?: string | null
          id?: number
          issuer?: string | null
          mer_pct?: number | null
          name?: string
          sector_slug?: string
          status?: string
          ticker?: string
          underlying_exposure?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      commodity_news_briefs: {
        Row: {
          article_slug: string
          compliance_flags: string[] | null
          created_at: string
          event_date: string
          event_title: string
          id: number
          published_at: string | null
          retired_at: string | null
          reviewed_by: string | null
          sector_slug: string
          source_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          article_slug: string
          compliance_flags?: string[] | null
          created_at?: string
          event_date: string
          event_title: string
          id?: number
          published_at?: string | null
          retired_at?: string | null
          reviewed_by?: string | null
          sector_slug: string
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          article_slug?: string
          compliance_flags?: string[] | null
          created_at?: string
          event_date?: string
          event_title?: string
          id?: number
          published_at?: string | null
          retired_at?: string | null
          reviewed_by?: string | null
          sector_slug?: string
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      commodity_price_snapshots: {
        Row: {
          captured_at: string
          currency: string
          dividend_yield_pct: number | null
          entity_kind: string
          entity_ref: string
          id: number
          mer_pct: number | null
          pe_ratio: number | null
          price_minor_units: number | null
          sector_slug: string | null
          source: string
        }
        Insert: {
          captured_at?: string
          currency?: string
          dividend_yield_pct?: number | null
          entity_kind: string
          entity_ref: string
          id?: number
          mer_pct?: number | null
          pe_ratio?: number | null
          price_minor_units?: number | null
          sector_slug?: string | null
          source?: string
        }
        Update: {
          captured_at?: string
          currency?: string
          dividend_yield_pct?: number | null
          entity_kind?: string
          entity_ref?: string
          id?: number
          mer_pct?: number | null
          pe_ratio?: number | null
          price_minor_units?: number | null
          sector_slug?: string | null
          source?: string
        }
        Relationships: []
      }
      commodity_sectors: {
        Row: {
          created_at: string
          display_name: string
          display_order: number
          esg_risk_rating: string
          hero_description: string
          hero_stats: Json | null
          id: number
          launched_at: string | null
          regulator_notes: string | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          display_order?: number
          esg_risk_rating?: string
          hero_description: string
          hero_stats?: Json | null
          id?: number
          launched_at?: string | null
          regulator_notes?: string | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          display_order?: number
          esg_risk_rating?: string
          hero_description?: string
          hero_stats?: Json | null
          id?: number
          launched_at?: string | null
          regulator_notes?: string | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      commodity_stocks: {
        Row: {
          blurb: string | null
          company_name: string
          created_at: string
          display_order: number
          dividend_yield_pct: number | null
          foreign_ownership_risk: string | null
          id: number
          included_in_indices: string[] | null
          last_reviewed_at: string | null
          market_cap_bucket: string | null
          pe_ratio: number | null
          primary_exposure: string | null
          sector_slug: string
          status: string
          ticker: string
          updated_at: string
        }
        Insert: {
          blurb?: string | null
          company_name: string
          created_at?: string
          display_order?: number
          dividend_yield_pct?: number | null
          foreign_ownership_risk?: string | null
          id?: number
          included_in_indices?: string[] | null
          last_reviewed_at?: string | null
          market_cap_bucket?: string | null
          pe_ratio?: number | null
          primary_exposure?: string | null
          sector_slug: string
          status?: string
          ticker: string
          updated_at?: string
        }
        Update: {
          blurb?: string | null
          company_name?: string
          created_at?: string
          display_order?: number
          dividend_yield_pct?: number | null
          foreign_ownership_risk?: string | null
          id?: number
          included_in_indices?: string[] | null
          last_reviewed_at?: string | null
          market_cap_bucket?: string | null
          pe_ratio?: number | null
          primary_exposure?: string | null
          sector_slug?: string
          status?: string
          ticker?: string
          updated_at?: string
        }
        Relationships: []
      }
      competitor_watch: {
        Row: {
          competitor: string
          created_at: string | null
          detail: string | null
          event_type: string
          id: number
          spotted_at: string | null
          title: string
          url: string | null
        }
        Insert: {
          competitor: string
          created_at?: string | null
          detail?: string | null
          event_type?: string
          id?: number
          spotted_at?: string | null
          title: string
          url?: string | null
        }
        Update: {
          competitor?: string
          created_at?: string | null
          detail?: string | null
          event_type?: string
          id?: number
          spotted_at?: string | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      complaints_register: {
        Row: {
          acknowledged_at: string | null
          assigned_to: string | null
          auto_escalated_at: string | null
          body: string
          category: string
          complainant_email: string
          complainant_name: string | null
          complainant_phone: string | null
          created_at: string
          escalated_at: string | null
          id: number
          reference_id: string
          related_advisor_id: number | null
          related_broker_slug: string | null
          related_lead_id: number | null
          resolution: string | null
          resolved_at: string | null
          severity: string
          sla_due_at: string
          sla_warning_sent_at: string | null
          status: string
          subject: string
          submitted_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          assigned_to?: string | null
          auto_escalated_at?: string | null
          body: string
          category: string
          complainant_email: string
          complainant_name?: string | null
          complainant_phone?: string | null
          created_at?: string
          escalated_at?: string | null
          id?: number
          reference_id: string
          related_advisor_id?: number | null
          related_broker_slug?: string | null
          related_lead_id?: number | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          sla_due_at: string
          sla_warning_sent_at?: string | null
          status?: string
          subject: string
          submitted_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          assigned_to?: string | null
          auto_escalated_at?: string | null
          body?: string
          category?: string
          complainant_email?: string
          complainant_name?: string | null
          complainant_phone?: string | null
          created_at?: string
          escalated_at?: string | null
          id?: number
          reference_id?: string
          related_advisor_id?: number | null
          related_broker_slug?: string | null
          related_lead_id?: number | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          sla_due_at?: string
          sla_warning_sent_at?: string | null
          status?: string
          subject?: string
          submitted_at?: string
        }
        Relationships: []
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
      content_freshness_log: {
        Row: {
          article_id: number | null
          flagged_at: string | null
          id: number
          reason: string | null
          resolved: boolean | null
        }
        Insert: {
          article_id?: number | null
          flagged_at?: string | null
          id?: number
          reason?: string | null
          resolved?: boolean | null
        }
        Update: {
          article_id?: number | null
          flagged_at?: string | null
          id?: number
          reason?: string | null
          resolved?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "content_freshness_log_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_products: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: number
          name: string
          price_cents: number
          slug: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
          price_cents: number
          slug: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
          price_cents?: number
          slug?: string
        }
        Relationships: []
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
      country_investment_profiles: {
        Row: {
          active: boolean | null
          country_code: string
          country_name: string
          created_at: string | null
          dta_year: number | null
          estimated_annual_fdi_aud_millions: number | null
          flag_emoji: string | null
          fta_partner: boolean | null
          has_dta: boolean | null
          hero_subtitle: string | null
          hero_title: string | null
          id: number
          key_facts: Json | null
          meta_description: string | null
          meta_title: string | null
          popular_visa_pathways: string[] | null
          primary_investment_sectors: string[] | null
          recommended_advisor_types: string[] | null
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          country_code: string
          country_name: string
          created_at?: string | null
          dta_year?: number | null
          estimated_annual_fdi_aud_millions?: number | null
          flag_emoji?: string | null
          fta_partner?: boolean | null
          has_dta?: boolean | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: number
          key_facts?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          popular_visa_pathways?: string[] | null
          primary_investment_sectors?: string[] | null
          recommended_advisor_types?: string[] | null
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          country_code?: string
          country_name?: string
          created_at?: string | null
          dta_year?: number | null
          estimated_annual_fdi_aud_millions?: number | null
          flag_emoji?: string | null
          fta_partner?: boolean | null
          has_dta?: boolean | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: number
          key_facts?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          popular_visa_pathways?: string[] | null
          primary_investment_sectors?: string[] | null
          recommended_advisor_types?: string[] | null
          sort_order?: number | null
        }
        Relationships: []
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
      credit_packs: {
        Row: {
          active: boolean | null
          badge: string | null
          created_at: string | null
          description: string | null
          id: number
          lead_count: number
          name: string
          price_cents: number
          price_per_lead_cents: number
          savings_percent: number | null
          slug: string
          sort_order: number | null
          stripe_price_id: string | null
        }
        Insert: {
          active?: boolean | null
          badge?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          lead_count: number
          name: string
          price_cents: number
          price_per_lead_cents: number
          savings_percent?: number | null
          slug: string
          sort_order?: number | null
          stripe_price_id?: string | null
        }
        Update: {
          active?: boolean | null
          badge?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          lead_count?: number
          name?: string
          price_cents?: number
          price_per_lead_cents?: number
          savings_percent?: number | null
          slug?: string
          sort_order?: number | null
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      cron_health_alerts: {
        Row: {
          alerted_at: string
          cadence: string
          endpoint: string
          id: number
          kind: string
        }
        Insert: {
          alerted_at?: string
          cadence: string
          endpoint: string
          id?: number
          kind: string
        }
        Update: {
          alerted_at?: string
          cadence?: string
          endpoint?: string
          id?: number
          kind?: string
        }
        Relationships: []
      }
      cron_run_log: {
        Row: {
          duration_ms: number | null
          ended_at: string | null
          error_message: string | null
          id: number
          name: string
          started_at: string
          stats: Json | null
          status: string
          triggered_by: string | null
        }
        Insert: {
          duration_ms?: number | null
          ended_at?: string | null
          error_message?: string | null
          id?: number
          name: string
          started_at: string
          stats?: Json | null
          status: string
          triggered_by?: string | null
        }
        Update: {
          duration_ms?: number | null
          ended_at?: string | null
          error_message?: string | null
          id?: number
          name?: string
          started_at?: string
          stats?: Json | null
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      data_integrity_issues: {
        Row: {
          check_name: string
          description: string | null
          first_seen_at: string
          id: number
          issue_count: number
          last_seen_at: string
          resolved_at: string | null
          sample_ids: Json | null
          severity: string
        }
        Insert: {
          check_name: string
          description?: string | null
          first_seen_at?: string
          id?: number
          issue_count: number
          last_seen_at?: string
          resolved_at?: string | null
          sample_ids?: Json | null
          severity?: string
        }
        Update: {
          check_name?: string
          description?: string | null
          first_seen_at?: string
          id?: number
          issue_count?: number
          last_seen_at?: string
          resolved_at?: string | null
          sample_ids?: Json | null
          severity?: string
        }
        Relationships: []
      }
      developer_leads: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          fund_id: number | null
          id: number
          investment_amount_range: string | null
          investor_type: string | null
          listing_id: number | null
          message: string | null
          phone: string | null
          report_slug: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          fund_id?: number | null
          id?: number
          investment_amount_range?: string | null
          investor_type?: string | null
          listing_id?: number | null
          message?: string | null
          phone?: string | null
          report_slug?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          fund_id?: number | null
          id?: number
          investment_amount_range?: string | null
          investor_type?: string | null
          listing_id?: number | null
          message?: string | null
          phone?: string | null
          report_slug?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "developer_leads_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "developer_leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "investment_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_pricing_rules: {
        Row: {
          advisor_type: string | null
          cap_cents: number | null
          created_at: string
          description: string | null
          enabled: boolean
          floor_cents: number | null
          id: number
          max_quality_score: number | null
          min_quality_score: number | null
          multiplier: number
          name: string
          new_advisor_days: number | null
          priority: number
          time_of_day_end_hour: number | null
          time_of_day_start_hour: number | null
          updated_at: string
          updated_by: string | null
          vertical: string | null
        }
        Insert: {
          advisor_type?: string | null
          cap_cents?: number | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          floor_cents?: number | null
          id?: number
          max_quality_score?: number | null
          min_quality_score?: number | null
          multiplier?: number
          name: string
          new_advisor_days?: number | null
          priority?: number
          time_of_day_end_hour?: number | null
          time_of_day_start_hour?: number | null
          updated_at?: string
          updated_by?: string | null
          vertical?: string | null
        }
        Update: {
          advisor_type?: string | null
          cap_cents?: number | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          floor_cents?: number | null
          id?: number
          max_quality_score?: number | null
          min_quality_score?: number | null
          multiplier?: number
          name?: string
          new_advisor_days?: number | null
          priority?: number
          time_of_day_end_hour?: number | null
          time_of_day_start_hour?: number | null
          updated_at?: string
          updated_by?: string | null
          vertical?: string | null
        }
        Relationships: []
      }
      email_captures: {
        Row: {
          captured_at: string | null
          email: string
          id: number
          last_annual_reminder: string | null
          last_newsletter_at: string | null
          name: string | null
          newsletter_opt_in: boolean | null
          recovery_sent_at: string | null
          referral_url: string | null
          session_id: string | null
          source: string | null
          status: string | null
          unsubscribed: boolean | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          winback_sent_at: string | null
        }
        Insert: {
          captured_at?: string | null
          email: string
          id?: number
          last_annual_reminder?: string | null
          last_newsletter_at?: string | null
          name?: string | null
          newsletter_opt_in?: boolean | null
          recovery_sent_at?: string | null
          referral_url?: string | null
          session_id?: string | null
          source?: string | null
          status?: string | null
          unsubscribed?: boolean | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          winback_sent_at?: string | null
        }
        Update: {
          captured_at?: string | null
          email?: string
          id?: number
          last_annual_reminder?: string | null
          last_newsletter_at?: string | null
          name?: string | null
          newsletter_opt_in?: boolean | null
          recovery_sent_at?: string | null
          referral_url?: string | null
          session_id?: string | null
          source?: string | null
          status?: string | null
          unsubscribed?: boolean | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          winback_sent_at?: string | null
        }
        Relationships: []
      }
      email_suppression_list: {
        Row: {
          bounce_count: number | null
          email: string
          first_seen_at: string
          last_seen_at: string
          notes: string | null
          reason: string
          source: string | null
        }
        Insert: {
          bounce_count?: number | null
          email: string
          first_seen_at?: string
          last_seen_at?: string
          notes?: string | null
          reason: string
          source?: string | null
        }
        Update: {
          bounce_count?: number | null
          email?: string
          first_seen_at?: string
          last_seen_at?: string
          notes?: string | null
          reason?: string
          source?: string | null
        }
        Relationships: []
      }
      exit_intent_events: {
        Row: {
          action: string
          created_at: string
          id: number
          modal_variant: string
          page_path: string | null
          session_hash: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          modal_variant: string
          page_path?: string | null
          session_hash?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          modal_variant?: string
          page_path?: string | null
          session_hash?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          allowlist: string[]
          created_at: string
          denylist: string[]
          description: string | null
          enabled: boolean
          flag_key: string
          id: number
          rollout_pct: number
          segments: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowlist?: string[]
          created_at?: string
          denylist?: string[]
          description?: string | null
          enabled?: boolean
          flag_key: string
          id?: number
          rollout_pct?: number
          segments?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowlist?: string[]
          created_at?: string
          denylist?: string[]
          description?: string | null
          enabled?: boolean
          flag_key?: string
          id?: number
          rollout_pct?: number
          segments?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      featured_plans: {
        Row: {
          active: boolean | null
          created_at: string | null
          features: Json | null
          id: number
          name: string
          price_cents_monthly: number
          slug: string
          stripe_price_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          features?: Json | null
          id?: number
          name: string
          price_cents_monthly: number
          slug: string
          stripe_price_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          features?: Json | null
          id?: number
          name?: string
          price_cents_monthly?: number
          slug?: string
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      fee_alert_subscriptions: {
        Row: {
          alert_type: string | null
          broker_slugs: Json | null
          created_at: string | null
          email: string
          frequency: string | null
          id: number
          unsubscribe_token: string
          verified: boolean | null
          verify_token: string | null
        }
        Insert: {
          alert_type?: string | null
          broker_slugs?: Json | null
          created_at?: string | null
          email: string
          frequency?: string | null
          id?: number
          unsubscribe_token: string
          verified?: boolean | null
          verify_token?: string | null
        }
        Update: {
          alert_type?: string | null
          broker_slugs?: Json | null
          created_at?: string | null
          email?: string
          frequency?: string | null
          id?: number
          unsubscribe_token?: string
          verified?: boolean | null
          verify_token?: string | null
        }
        Relationships: []
      }
      fee_auto_rules: {
        Row: {
          action: string
          condition: string
          created_at: string | null
          enabled: boolean | null
          field_name: string
          id: number
          rule_name: string
        }
        Insert: {
          action?: string
          condition: string
          created_at?: string | null
          enabled?: boolean | null
          field_name: string
          id?: number
          rule_name: string
        }
        Update: {
          action?: string
          condition?: string
          created_at?: string | null
          enabled?: boolean | null
          field_name?: string
          id?: number
          rule_name?: string
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
      fee_update_queue: {
        Row: {
          auto_applied: boolean | null
          broker_id: number
          broker_name: string
          broker_slug: string
          created_at: string | null
          extracted_from: string | null
          field_name: string
          id: number
          new_value: string | null
          old_value: string | null
          priority: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rule_id: number | null
          status: string | null
        }
        Insert: {
          auto_applied?: boolean | null
          broker_id: number
          broker_name: string
          broker_slug: string
          created_at?: string | null
          extracted_from?: string | null
          field_name: string
          id?: number
          new_value?: string | null
          old_value?: string | null
          priority?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_id?: number | null
          status?: string | null
        }
        Update: {
          auto_applied?: boolean | null
          broker_id?: number
          broker_name?: string
          broker_slug?: string
          created_at?: string | null
          extracted_from?: string | null
          field_name?: string
          id?: number
          new_value?: string | null
          old_value?: string | null
          priority?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_id?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_update_queue_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_update_queue_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "fee_auto_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_transactions: {
        Row: {
          amount_cents: number
          category: string
          counterparty: string | null
          created_at: string | null
          date: string
          description: string
          id: number
          notes: string | null
          recurring: boolean | null
          recurring_interval: string | null
          reference: string | null
          type: string
        }
        Insert: {
          amount_cents: number
          category: string
          counterparty?: string | null
          created_at?: string | null
          date?: string
          description: string
          id?: number
          notes?: string | null
          recurring?: boolean | null
          recurring_interval?: string | null
          reference?: string | null
          type: string
        }
        Update: {
          amount_cents?: number
          category?: string
          counterparty?: string | null
          created_at?: string | null
          date?: string
          description?: string
          id?: number
          notes?: string | null
          recurring?: boolean | null
          recurring_interval?: string | null
          reference?: string | null
          type?: string
        }
        Relationships: []
      }
      financial_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          amount_cents: number | null
          context: Json | null
          created_at: string
          currency: string | null
          id: number
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          resource_id: string
          resource_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          amount_cents?: number | null
          context?: Json | null
          created_at?: string
          currency?: string | null
          id?: number
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          resource_id: string
          resource_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          amount_cents?: number | null
          context?: Json | null
          created_at?: string
          currency?: string | null
          id?: number
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          resource_id?: string
          resource_type?: string
        }
        Relationships: []
      }
      financial_periods: {
        Row: {
          audit_row_count: number | null
          closed_at: string | null
          closed_by: string | null
          id: number
          notes: string | null
          period_end: string
          period_start: string
          revenue_summary: Json | null
          status: string
          total_credits_cents: number | null
          total_refunds_cents: number | null
        }
        Insert: {
          audit_row_count?: number | null
          closed_at?: string | null
          closed_by?: string | null
          id?: number
          notes?: string | null
          period_end: string
          period_start: string
          revenue_summary?: Json | null
          status?: string
          total_credits_cents?: number | null
          total_refunds_cents?: number | null
        }
        Update: {
          audit_row_count?: number | null
          closed_at?: string | null
          closed_by?: string | null
          id?: number
          notes?: string | null
          period_end?: string
          period_start?: string
          revenue_summary?: Json | null
          status?: string
          total_credits_cents?: number | null
          total_refunds_cents?: number | null
        }
        Relationships: []
      }
      foreign_investment_flags: {
        Row: {
          description: string | null
          flag_key: string
          flag_value: boolean | null
          id: number
          updated_at: string | null
        }
        Insert: {
          description?: string | null
          flag_key: string
          flag_value?: boolean | null
          id?: number
          updated_at?: string | null
        }
        Update: {
          description?: string | null
          flag_key?: string
          flag_value?: boolean | null
          id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      foreign_investment_rates: {
        Row: {
          active: boolean | null
          category: string | null
          country_code: string | null
          country_name: string | null
          effective_from: string | null
          effective_to: string | null
          fee_cents: number | null
          id: number
          notes: string | null
          rate_percent: number | null
          rate_type: string
          state: string | null
          threshold_cents: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          country_code?: string | null
          country_name?: string | null
          effective_from?: string | null
          effective_to?: string | null
          fee_cents?: number | null
          id?: number
          notes?: string | null
          rate_percent?: number | null
          rate_type: string
          state?: string | null
          threshold_cents?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          country_code?: string | null
          country_name?: string | null
          effective_from?: string | null
          effective_to?: string | null
          fee_cents?: number | null
          id?: number
          notes?: string | null
          rate_percent?: number | null
          rate_type?: string
          state?: string | null
          threshold_cents?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      form_events: {
        Row: {
          created_at: string
          event: string
          form_name: string
          id: number
          meta: Json | null
          session_id: string
          step: string
          step_index: number | null
          user_key: string | null
        }
        Insert: {
          created_at?: string
          event: string
          form_name: string
          id?: number
          meta?: Json | null
          session_id: string
          step: string
          step_index?: number | null
          user_key?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          form_name?: string
          id?: number
          meta?: Json | null
          session_id?: string
          step?: string
          step_index?: number | null
          user_key?: string | null
        }
        Relationships: []
      }
      forum_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: number
          is_active: boolean | null
          last_post_at: string | null
          last_thread_id: number | null
          name: string
          post_count: number | null
          slug: string
          sort_order: number | null
          status: string | null
          thread_count: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: number
          is_active?: boolean | null
          last_post_at?: string | null
          last_thread_id?: number | null
          name: string
          post_count?: number | null
          slug: string
          sort_order?: number | null
          status?: string | null
          thread_count?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: number
          is_active?: boolean | null
          last_post_at?: string | null
          last_thread_id?: number | null
          name?: string
          post_count?: number | null
          slug?: string
          sort_order?: number | null
          status?: string | null
          thread_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          author_id: string | null
          author_name: string | null
          body: string
          created_at: string | null
          id: number
          is_moderator: boolean | null
          is_removed: boolean | null
          thread_id: number
          updated_at: string | null
          vote_score: number | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body: string
          created_at?: string | null
          id?: number
          is_moderator?: boolean | null
          is_removed?: boolean | null
          thread_id: number
          updated_at?: string | null
          vote_score?: number | null
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body?: string
          created_at?: string | null
          id?: number
          is_moderator?: boolean | null
          is_removed?: boolean | null
          thread_id?: number
          updated_at?: string | null
          vote_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_threads: {
        Row: {
          author_id: string | null
          author_name: string | null
          body: string
          category_id: number | null
          category_slug: string
          created_at: string | null
          id: number
          is_locked: boolean | null
          is_moderator: boolean | null
          is_pinned: boolean | null
          is_removed: boolean | null
          last_reply_at: string | null
          reply_count: number | null
          slug: string
          title: string
          updated_at: string | null
          view_count: number | null
          vote_score: number | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body: string
          category_id?: number | null
          category_slug: string
          created_at?: string | null
          id?: number
          is_locked?: boolean | null
          is_moderator?: boolean | null
          is_pinned?: boolean | null
          is_removed?: boolean | null
          last_reply_at?: string | null
          reply_count?: number | null
          slug: string
          title: string
          updated_at?: string | null
          view_count?: number | null
          vote_score?: number | null
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body?: string
          category_id?: number | null
          category_slug?: string
          created_at?: string | null
          id?: number
          is_locked?: boolean | null
          is_moderator?: boolean | null
          is_pinned?: boolean | null
          is_removed?: boolean | null
          last_reply_at?: string | null
          reply_count?: number | null
          slug?: string
          title?: string
          updated_at?: string | null
          view_count?: number | null
          vote_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_threads_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      forum_user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: number
          is_moderator: boolean | null
          post_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: number
          is_moderator?: boolean | null
          post_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: number
          is_moderator?: boolean | null
          post_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      forum_votes: {
        Row: {
          created_at: string | null
          id: number
          target_id: number
          target_type: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          target_id: number
          target_type: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string | null
          id?: number
          target_id?: number
          target_type?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      fraud_signals: {
        Row: {
          computed_at: string
          entity_id: string
          entity_type: string
          id: number
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_verdict: string | null
          score: number
          signals: Json | null
          verdict: string
        }
        Insert: {
          computed_at?: string
          entity_id: string
          entity_type: string
          id?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_verdict?: string | null
          score: number
          signals?: Json | null
          verdict: string
        }
        Update: {
          computed_at?: string
          entity_id?: string
          entity_type?: string
          id?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_verdict?: string | null
          score?: number
          signals?: Json | null
          verdict?: string
        }
        Relationships: []
      }
      fund_listings: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string | null
          description: string | null
          featured: boolean | null
          featured_tier: string | null
          firb_relevant: boolean | null
          fund_size_cents: number | null
          fund_type: string | null
          id: number
          manager_name: string | null
          min_investment_cents: number | null
          monthly_fee_cents: number | null
          open_to_retail: boolean | null
          report_url: string | null
          siv_complying: boolean | null
          slug: string
          status: string | null
          target_return_percent: number | null
          title: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          featured_tier?: string | null
          firb_relevant?: boolean | null
          fund_size_cents?: number | null
          fund_type?: string | null
          id?: number
          manager_name?: string | null
          min_investment_cents?: number | null
          monthly_fee_cents?: number | null
          open_to_retail?: boolean | null
          report_url?: string | null
          siv_complying?: boolean | null
          slug: string
          status?: string | null
          target_return_percent?: number | null
          title: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          featured_tier?: string | null
          firb_relevant?: boolean | null
          fund_size_cents?: number | null
          fund_type?: string | null
          id?: number
          manager_name?: string | null
          min_investment_cents?: number | null
          monthly_fee_cents?: number | null
          open_to_retail?: boolean | null
          report_url?: string | null
          siv_complying?: boolean | null
          slug?: string
          status?: string | null
          target_return_percent?: number | null
          title?: string
        }
        Relationships: []
      }
      glossary_terms: {
        Row: {
          category: string | null
          created_at: string
          definition: string
          id: number
          slug: string
          sort_order: number | null
          status: string
          term: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          definition: string
          id?: number
          slug: string
          sort_order?: number | null
          status?: string
          term: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          definition?: string
          id?: number
          slug?: string
          sort_order?: number | null
          status?: string
          term?: string
          updated_at?: string
        }
        Relationships: []
      }
      health_pings: {
        Row: {
          created_at: string | null
          id: number
          latency_ms: number | null
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          latency_ms?: number | null
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: number
          latency_ms?: number | null
          status?: string
        }
        Relationships: []
      }
      i18n_currency_rates: {
        Row: {
          base_currency: string
          effective_date: string
          fetched_at: string
          id: number
          rate: number
          source: string | null
          target_currency: string
        }
        Insert: {
          base_currency?: string
          effective_date: string
          fetched_at?: string
          id?: number
          rate: number
          source?: string | null
          target_currency: string
        }
        Update: {
          base_currency?: string
          effective_date?: string
          fetched_at?: string
          id?: number
          rate?: number
          source?: string | null
          target_currency?: string
        }
        Relationships: []
      }
      international_leads: {
        Row: {
          created_at: string | null
          estimated_investment_aud: number | null
          id: number
          investment_type: string | null
          investor_country: string
          investor_type: string
          language_preference: string | null
          professional_lead_id: number | null
          requires_firb: boolean | null
          visa_type: string | null
        }
        Insert: {
          created_at?: string | null
          estimated_investment_aud?: number | null
          id?: number
          investment_type?: string | null
          investor_country: string
          investor_type: string
          language_preference?: string | null
          professional_lead_id?: number | null
          requires_firb?: boolean | null
          visa_type?: string | null
        }
        Update: {
          created_at?: string | null
          estimated_investment_aud?: number | null
          id?: number
          investment_type?: string | null
          investor_country?: string
          investor_type?: string
          language_preference?: string | null
          professional_lead_id?: number | null
          requires_firb?: boolean | null
          visa_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "international_leads_professional_lead_id_fkey"
            columns: ["professional_lead_id"]
            isOneToOne: false
            referencedRelation: "professional_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_listings: {
        Row: {
          admin_overridden_at: string | null
          admin_overridden_by: string | null
          annual_profit_cents: number | null
          annual_revenue_cents: number | null
          asking_price_cents: number | null
          auto_classified_at: string | null
          auto_classified_reasons: Json | null
          auto_classified_risk_score: number | null
          auto_classified_verdict: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          enquiries: number | null
          expires_at: string | null
          external_url: string | null
          firb_eligible: boolean | null
          id: number
          images: string[] | null
          industry: string | null
          key_metrics: Json | null
          listed_by_professional_id: number | null
          listing_type: string | null
          location_city: string | null
          location_state: string | null
          price_display: string | null
          siv_complying: boolean | null
          slug: string
          status: string | null
          sub_category: string | null
          title: string
          updated_at: string | null
          vertical: string
          views: number | null
        }
        Insert: {
          admin_overridden_at?: string | null
          admin_overridden_by?: string | null
          annual_profit_cents?: number | null
          annual_revenue_cents?: number | null
          asking_price_cents?: number | null
          auto_classified_at?: string | null
          auto_classified_reasons?: Json | null
          auto_classified_risk_score?: number | null
          auto_classified_verdict?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          enquiries?: number | null
          expires_at?: string | null
          external_url?: string | null
          firb_eligible?: boolean | null
          id?: number
          images?: string[] | null
          industry?: string | null
          key_metrics?: Json | null
          listed_by_professional_id?: number | null
          listing_type?: string | null
          location_city?: string | null
          location_state?: string | null
          price_display?: string | null
          siv_complying?: boolean | null
          slug: string
          status?: string | null
          sub_category?: string | null
          title: string
          updated_at?: string | null
          vertical: string
          views?: number | null
        }
        Update: {
          admin_overridden_at?: string | null
          admin_overridden_by?: string | null
          annual_profit_cents?: number | null
          annual_revenue_cents?: number | null
          asking_price_cents?: number | null
          auto_classified_at?: string | null
          auto_classified_reasons?: Json | null
          auto_classified_risk_score?: number | null
          auto_classified_verdict?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          enquiries?: number | null
          expires_at?: string | null
          external_url?: string | null
          firb_eligible?: boolean | null
          id?: number
          images?: string[] | null
          industry?: string | null
          key_metrics?: Json | null
          listed_by_professional_id?: number | null
          listing_type?: string | null
          location_city?: string | null
          location_state?: string | null
          price_display?: string | null
          siv_complying?: boolean | null
          slug?: string
          status?: string | null
          sub_category?: string | null
          title?: string
          updated_at?: string | null
          vertical?: string
          views?: number | null
        }
        Relationships: []
      }
      investment_verticals: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          domestic: boolean | null
          fdi_share_percent: number | null
          hero_image: string | null
          hero_subtitle: string | null
          hero_title: string | null
          icon: string | null
          id: number
          international: boolean | null
          meta_description: string | null
          meta_title: string | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          domestic?: boolean | null
          fdi_share_percent?: number | null
          hero_image?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          icon?: string | null
          id?: number
          international?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          domestic?: boolean | null
          fdi_share_percent?: number | null
          hero_image?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          icon?: string | null
          id?: number
          international?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      investor_drip_log: {
        Row: {
          drip_number: number
          email: string
          id: number
          sent_at: string | null
        }
        Insert: {
          drip_number: number
          email: string
          id?: number
          sent_at?: string | null
        }
        Update: {
          drip_number?: number
          email?: string
          id?: number
          sent_at?: string | null
        }
        Relationships: []
      }
      investor_journey_touchpoints: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          domestic: boolean | null
          estimated_revenue_cents: number | null
          id: number
          international: boolean | null
          partner_type: string | null
          revenue_type: string
          sort_order: number | null
          stage: string
          touchpoint: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          domestic?: boolean | null
          estimated_revenue_cents?: number | null
          id?: number
          international?: boolean | null
          partner_type?: string | null
          revenue_type: string
          sort_order?: number | null
          stage: string
          touchpoint: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          domestic?: boolean | null
          estimated_revenue_cents?: number | null
          id?: number
          international?: boolean | null
          partner_type?: string | null
          revenue_type?: string
          sort_order?: number | null
          stage?: string
          touchpoint?: string
        }
        Relationships: []
      }
      job_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          id: number
          job_type: string
          last_error: string | null
          max_attempts: number
          payload: Json
          scheduled_at: string
          started_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: number
          job_type: string
          last_error?: string | null
          max_attempts?: number
          payload: Json
          scheduled_at?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: number
          job_type?: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json
          scheduled_at?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      lead_disputes: {
        Row: {
          admin_notes: string | null
          admin_overridden_at: string | null
          admin_overridden_by: string | null
          admin_override_reason: string | null
          auto_resolved_at: string | null
          auto_resolved_confidence: string | null
          auto_resolved_reasons: Json | null
          auto_resolved_verdict: string | null
          billing_id: number | null
          created_at: string | null
          details: string | null
          id: number
          lead_id: number
          professional_id: number
          reason: string
          reason_code: string | null
          refunded_cents: number | null
          resolved_at: string | null
          status: string | null
        }
        Insert: {
          admin_notes?: string | null
          admin_overridden_at?: string | null
          admin_overridden_by?: string | null
          admin_override_reason?: string | null
          auto_resolved_at?: string | null
          auto_resolved_confidence?: string | null
          auto_resolved_reasons?: Json | null
          auto_resolved_verdict?: string | null
          billing_id?: number | null
          created_at?: string | null
          details?: string | null
          id?: number
          lead_id: number
          professional_id: number
          reason: string
          reason_code?: string | null
          refunded_cents?: number | null
          resolved_at?: string | null
          status?: string | null
        }
        Update: {
          admin_notes?: string | null
          admin_overridden_at?: string | null
          admin_overridden_by?: string | null
          admin_override_reason?: string | null
          auto_resolved_at?: string | null
          auto_resolved_confidence?: string | null
          auto_resolved_reasons?: Json | null
          auto_resolved_verdict?: string | null
          billing_id?: number | null
          created_at?: string | null
          details?: string | null
          id?: number
          lead_id?: number
          professional_id?: number
          reason?: string
          reason_code?: string | null
          refunded_cents?: number | null
          resolved_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_disputes_billing_id_fkey"
            columns: ["billing_id"]
            isOneToOne: false
            referencedRelation: "advisor_billing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_disputes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "professional_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_disputes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_advisor_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_disputes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_pricing: {
        Row: {
          advisor_type: string
          description: string | null
          featured_monthly_cents: number
          free_trial_leads: number
          id: number
          max_price_cents: number
          min_price_cents: number
          price_cents: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          advisor_type: string
          description?: string | null
          featured_monthly_cents?: number
          free_trial_leads?: number
          id?: number
          max_price_cents?: number
          min_price_cents?: number
          price_cents: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          advisor_type?: string
          description?: string | null
          featured_monthly_cents?: number
          free_trial_leads?: number
          id?: number
          max_price_cents?: number
          min_price_cents?: number
          price_cents?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      lead_pricing_log: {
        Row: {
          advisor_type: string
          changed_at: string | null
          changed_by: string | null
          field_changed: string
          id: number
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          advisor_type: string
          changed_at?: string | null
          changed_by?: string | null
          field_changed: string
          id?: number
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          advisor_type?: string
          changed_at?: string | null
          changed_by?: string | null
          field_changed?: string
          id?: number
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: []
      }
      lead_quality_weights: {
        Row: {
          computed_at: string
          hit_rate: number
          id: number
          model_version: number
          sample_size: number
          signal_name: string
          weight: number
        }
        Insert: {
          computed_at?: string
          hit_rate: number
          id?: number
          model_version: number
          sample_size: number
          signal_name: string
          weight: number
        }
        Update: {
          computed_at?: string
          hit_rate?: number
          id?: number
          model_version?: number
          sample_size?: number
          signal_name?: string
          weight?: number
        }
        Relationships: []
      }
      leads: {
        Row: {
          broker_id: number | null
          created_at: string | null
          id: number
          lead_type: string
          professional_id: number | null
          revenue_value_cents: number | null
          source_page: string | null
          status: string | null
          updated_at: string | null
          user_email: string
          user_intent: Json | null
          user_location_state: string | null
          user_name: string | null
          user_phone: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          broker_id?: number | null
          created_at?: string | null
          id?: number
          lead_type: string
          professional_id?: number | null
          revenue_value_cents?: number | null
          source_page?: string | null
          status?: string | null
          updated_at?: string | null
          user_email: string
          user_intent?: Json | null
          user_location_state?: string | null
          user_name?: string | null
          user_phone?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          broker_id?: number | null
          created_at?: string | null
          id?: number
          lead_type?: string
          professional_id?: number | null
          revenue_value_cents?: number | null
          source_page?: string | null
          status?: string | null
          updated_at?: string | null
          user_email?: string
          user_intent?: Json | null
          user_location_state?: string | null
          user_name?: string | null
          user_phone?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_advisor_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          category: string
          counterparty: string | null
          created_at: string | null
          description: string | null
          expires_at: string | null
          file_url: string | null
          id: number
          metadata: Json | null
          notes: string | null
          renewal_reminder_days: number | null
          responsible_person: string | null
          signed_at: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          counterparty?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          file_url?: string | null
          id?: number
          metadata?: Json | null
          notes?: string | null
          renewal_reminder_days?: number | null
          responsible_person?: string | null
          signed_at?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          counterparty?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          file_url?: string | null
          id?: number
          metadata?: Json | null
          notes?: string | null
          renewal_reminder_days?: number | null
          responsible_person?: string | null
          signed_at?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      listing_claims: {
        Row: {
          admin_notes: string | null
          claim_type: string
          company_role: string | null
          created_at: string | null
          email: string
          full_name: string
          id: number
          message: string | null
          phone: string | null
          status: string | null
          target_slug: string
        }
        Insert: {
          admin_notes?: string | null
          claim_type: string
          company_role?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: number
          message?: string | null
          phone?: string | null
          status?: string | null
          target_slug: string
        }
        Update: {
          admin_notes?: string | null
          claim_type?: string
          company_role?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: number
          message?: string | null
          phone?: string | null
          status?: string | null
          target_slug?: string
        }
        Relationships: []
      }
      listing_enquiries: {
        Row: {
          created_at: string | null
          id: number
          investor_country: string | null
          investor_type: string | null
          listing_id: number | null
          message: string | null
          source_page: string | null
          status: string | null
          user_email: string
          user_name: string
          user_phone: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          investor_country?: string | null
          investor_type?: string | null
          listing_id?: number | null
          message?: string | null
          source_page?: string | null
          status?: string | null
          user_email: string
          user_name: string
          user_phone?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          investor_country?: string | null
          investor_type?: string | null
          listing_id?: number | null
          message?: string | null
          source_page?: string | null
          status?: string | null
          user_email?: string
          user_name?: string
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_enquiries_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "investment_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_plans: {
        Row: {
          active: boolean | null
          features: Json | null
          id: number
          plan_name: string
          price_cents_monthly: number
          stripe_price_id: string | null
          vertical: string
        }
        Insert: {
          active?: boolean | null
          features?: Json | null
          id?: number
          plan_name: string
          price_cents_monthly: number
          stripe_price_id?: string | null
          vertical: string
        }
        Update: {
          active?: boolean | null
          features?: Json | null
          id?: number
          plan_name?: string
          price_cents_monthly?: number
          stripe_price_id?: string | null
          vertical?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string
          failure_count: number
          id: number
          last_failure_at: string
          last_ip_hash: string | null
          locked_until: string | null
        }
        Insert: {
          created_at?: string
          email: string
          failure_count?: number
          id?: number
          last_failure_at?: string
          last_ip_hash?: string | null
          locked_until?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          failure_count?: number
          id?: number
          last_failure_at?: string
          last_ip_hash?: string | null
          locked_until?: string | null
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
          avg_ctr_pct: number | null
          base_rate_cents: number | null
          created_at: string | null
          description: string | null
          id: number
          inventory_type: string
          is_active: boolean
          max_slots: number
          monthly_impressions: number | null
          name: string
          page: string
          position: string
          slug: string
          stats_updated_at: string | null
        }
        Insert: {
          avg_ctr_pct?: number | null
          base_rate_cents?: number | null
          created_at?: string | null
          description?: string | null
          id?: never
          inventory_type: string
          is_active?: boolean
          max_slots?: number
          monthly_impressions?: number | null
          name: string
          page: string
          position: string
          slug: string
          stats_updated_at?: string | null
        }
        Update: {
          avg_ctr_pct?: number | null
          base_rate_cents?: number | null
          created_at?: string | null
          description?: string | null
          id?: never
          inventory_type?: string
          is_active?: boolean
          max_slots?: number
          monthly_impressions?: number | null
          name?: string
          page?: string
          position?: string
          slug?: string
          stats_updated_at?: string | null
        }
        Relationships: []
      }
      newsletter_editions: {
        Row: {
          articles_count: number
          created_at: string
          deals_count: number
          edition_date: string
          fee_changes_count: number
          html_content: string | null
          id: number
          subject: string
        }
        Insert: {
          articles_count?: number
          created_at?: string
          deals_count?: number
          edition_date: string
          fee_changes_count?: number
          html_content?: string | null
          id?: number
          subject: string
        }
        Update: {
          articles_count?: number
          created_at?: string
          deals_count?: number
          edition_date?: string
          fee_changes_count?: number
          html_content?: string | null
          id?: number
          subject?: string
        }
        Relationships: []
      }
      newsletter_segments: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: number
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: number
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: number
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
      newsletter_sponsors: {
        Row: {
          company_name: string
          contact_email: string
          created_at: string | null
          cta_text: string | null
          cta_url: string | null
          fee_cents: number | null
          id: number
          send_date: string | null
          status: string | null
          subject_line: string | null
        }
        Insert: {
          company_name: string
          contact_email: string
          created_at?: string | null
          cta_text?: string | null
          cta_url?: string | null
          fee_cents?: number | null
          id?: number
          send_date?: string | null
          status?: string | null
          subject_line?: string | null
        }
        Update: {
          company_name?: string
          contact_email?: string
          created_at?: string | null
          cta_text?: string | null
          cta_url?: string | null
          fee_cents?: number | null
          id?: number
          send_date?: string | null
          status?: string | null
          subject_line?: string | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          confirmed_at: string | null
          email: string
          id: number
          last_sent_at: string | null
          name: string | null
          preference: string
          source: string | null
          status: string
          subscribed_at: string
          unsubscribed_at: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          confirmed_at?: string | null
          email: string
          id?: number
          last_sent_at?: string | null
          name?: string | null
          preference?: string
          source?: string | null
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          confirmed_at?: string | null
          email?: string
          id?: number
          last_sent_at?: string | null
          name?: string | null
          preference?: string
          source?: string | null
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      newsletter_subscriptions: {
        Row: {
          confirmation_token: string | null
          confirmed: boolean
          confirmed_at: string | null
          created_at: string
          email: string
          id: number
          segment_slug: string | null
          unsubscribe_token: string
          unsubscribed_at: string | null
        }
        Insert: {
          confirmation_token?: string | null
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: number
          segment_slug?: string | null
          unsubscribe_token: string
          unsubscribed_at?: string | null
        }
        Update: {
          confirmation_token?: string | null
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: number
          segment_slug?: string | null
          unsubscribe_token?: string
          unsubscribed_at?: string | null
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
      nps_responses: {
        Row: {
          comment: string | null
          created_at: string
          id: number
          ip_hash: string | null
          respondent_id: string | null
          respondent_type: string
          score: number
          session_id: string | null
          trigger: string
          user_agent: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: number
          ip_hash?: string | null
          respondent_id?: string | null
          respondent_type: string
          score: number
          session_id?: string | null
          trigger: string
          user_agent?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: number
          ip_hash?: string | null
          respondent_id?: string | null
          respondent_type?: string
          score?: number
          session_id?: string | null
          trigger?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      photo_moderation_log: {
        Row: {
          checked_at: string
          confidence: number | null
          id: number
          labels: Json | null
          photo_url: string
          provider: string
          target_id: number | null
          target_type: string
          verdict: string
        }
        Insert: {
          checked_at?: string
          confidence?: number | null
          id?: number
          labels?: Json | null
          photo_url: string
          provider: string
          target_id?: number | null
          target_type: string
          verdict: string
        }
        Update: {
          checked_at?: string
          confidence?: number | null
          id?: number
          labels?: Json | null
          photo_url?: string
          provider?: string
          target_id?: number | null
          target_type?: string
          verdict?: string
        }
        Relationships: []
      }
      portfolio_alerts: {
        Row: {
          alert_type: string
          broker_slug: string | null
          created_at: string | null
          detail: string | null
          id: number
          portfolio_id: number | null
          read: boolean | null
          title: string
        }
        Insert: {
          alert_type: string
          broker_slug?: string | null
          created_at?: string | null
          detail?: string | null
          id?: number
          portfolio_id?: number | null
          read?: boolean | null
          title: string
        }
        Update: {
          alert_type?: string
          broker_slug?: string | null
          created_at?: string | null
          detail?: string | null
          id?: number
          portfolio_id?: number | null
          read?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_alerts_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "user_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_calculations: {
        Row: {
          cheapest_annual_fees: number | null
          cheapest_broker_slug: string | null
          created_at: string | null
          current_annual_fees: number | null
          email: string | null
          holdings: Json
          id: number
          potential_savings: number | null
          session_id: string | null
          total_value_aud: number | null
        }
        Insert: {
          cheapest_annual_fees?: number | null
          cheapest_broker_slug?: string | null
          created_at?: string | null
          current_annual_fees?: number | null
          email?: string | null
          holdings: Json
          id?: number
          potential_savings?: number | null
          session_id?: string | null
          total_value_aud?: number | null
        }
        Update: {
          cheapest_annual_fees?: number | null
          cheapest_broker_slug?: string | null
          created_at?: string | null
          current_annual_fees?: number | null
          email?: string | null
          holdings?: Json
          id?: number
          potential_savings?: number | null
          session_id?: string | null
          total_value_aud?: number | null
        }
        Relationships: []
      }
      portfolio_fee_snapshots: {
        Row: {
          breakdown: Json | null
          cheapest_alternative_fees: number | null
          created_at: string | null
          id: number
          portfolio_id: number | null
          potential_savings: number | null
          snapshot_date: string
          total_annual_fees: number | null
        }
        Insert: {
          breakdown?: Json | null
          cheapest_alternative_fees?: number | null
          created_at?: string | null
          id?: number
          portfolio_id?: number | null
          potential_savings?: number | null
          snapshot_date: string
          total_annual_fees?: number | null
        }
        Update: {
          breakdown?: Json | null
          cheapest_alternative_fees?: number | null
          created_at?: string | null
          id?: number
          portfolio_id?: number | null
          potential_savings?: number | null
          snapshot_date?: string
          total_annual_fees?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_fee_snapshots_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "user_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_holdings: {
        Row: {
          added_at: string | null
          approximate_value: number | null
          broker_id: number | null
          broker_slug: string
          holding_type: string | null
          id: number
          notes: string | null
          portfolio_id: number | null
          trades_per_year: number | null
        }
        Insert: {
          added_at?: string | null
          approximate_value?: number | null
          broker_id?: number | null
          broker_slug: string
          holding_type?: string | null
          id?: number
          notes?: string | null
          portfolio_id?: number | null
          trades_per_year?: number | null
        }
        Update: {
          added_at?: string | null
          approximate_value?: number | null
          broker_id?: number | null
          broker_slug?: string
          holding_type?: string | null
          id?: number
          notes?: string | null
          portfolio_id?: number | null
          trades_per_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_holdings_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "user_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_data_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          email: string
          id: number
          request_type: string
          requested_by_ip: string | null
          result_url: string | null
          rows_affected: Json | null
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          email: string
          id?: number
          request_type: string
          requested_by_ip?: string | null
          result_url?: string | null
          rows_affected?: Json | null
          verification_token: string
          verified_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          email?: string
          id?: number
          request_type?: string
          requested_by_ip?: string | null
          result_url?: string | null
          rows_affected?: Json | null
          verification_token?: string
          verified_at?: string | null
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
      professional_leads: {
        Row: {
          advisor_notes: string | null
          bill_amount_cents: number | null
          billed: boolean | null
          contacted_at: string | null
          converted_at: string | null
          created_at: string | null
          device_type: string | null
          id: number
          lead_value: number | null
          message: string | null
          outcome: string | null
          post_drip_last_at: string | null
          post_drip_step: number | null
          professional_id: number
          quality_band: string | null
          quality_score: number | null
          quality_signals: Json | null
          referrer: string | null
          responded_at: string | null
          response_time_minutes: number | null
          source_page: string | null
          status: string | null
          updated_at: string | null
          user_email: string
          user_name: string
          user_phone: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          advisor_notes?: string | null
          bill_amount_cents?: number | null
          billed?: boolean | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: number
          lead_value?: number | null
          message?: string | null
          outcome?: string | null
          post_drip_last_at?: string | null
          post_drip_step?: number | null
          professional_id: number
          quality_band?: string | null
          quality_score?: number | null
          quality_signals?: Json | null
          referrer?: string | null
          responded_at?: string | null
          response_time_minutes?: number | null
          source_page?: string | null
          status?: string | null
          updated_at?: string | null
          user_email: string
          user_name: string
          user_phone?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          advisor_notes?: string | null
          bill_amount_cents?: number | null
          billed?: boolean | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: number
          lead_value?: number | null
          message?: string | null
          outcome?: string | null
          post_drip_last_at?: string | null
          post_drip_step?: number | null
          professional_id?: number
          quality_band?: string | null
          quality_score?: number | null
          quality_signals?: Json | null
          referrer?: string | null
          responded_at?: string | null
          response_time_minutes?: number | null
          source_page?: string | null
          status?: string | null
          updated_at?: string | null
          user_email?: string
          user_name?: string
          user_phone?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_leads_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_advisor_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_leads_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_reviews: {
        Row: {
          admin_overridden_at: string | null
          admin_overridden_by: string | null
          auto_moderated_at: string | null
          auto_moderated_reasons: Json | null
          auto_moderated_verdict: string | null
          body: string
          communication_rating: number | null
          created_at: string | null
          expertise_rating: number | null
          id: number
          moderation_notes: string | null
          professional_id: number
          rating: number
          reviewer_email: string | null
          reviewer_name: string
          status: string | null
          title: string | null
          updated_at: string | null
          used_services: boolean | null
          value_for_money_rating: number | null
          verified: boolean | null
        }
        Insert: {
          admin_overridden_at?: string | null
          admin_overridden_by?: string | null
          auto_moderated_at?: string | null
          auto_moderated_reasons?: Json | null
          auto_moderated_verdict?: string | null
          body: string
          communication_rating?: number | null
          created_at?: string | null
          expertise_rating?: number | null
          id?: number
          moderation_notes?: string | null
          professional_id: number
          rating: number
          reviewer_email?: string | null
          reviewer_name: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          used_services?: boolean | null
          value_for_money_rating?: number | null
          verified?: boolean | null
        }
        Update: {
          admin_overridden_at?: string | null
          admin_overridden_by?: string | null
          auto_moderated_at?: string | null
          auto_moderated_reasons?: Json | null
          auto_moderated_verdict?: string | null
          body?: string
          communication_rating?: number | null
          created_at?: string | null
          expertise_rating?: number | null
          id?: number
          moderation_notes?: string | null
          professional_id?: number
          rating?: number
          reviewer_email?: string | null
          reviewer_name?: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          used_services?: boolean | null
          value_for_money_rating?: number | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "admin_advisor_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          abn: string | null
          accepting_new_clients: boolean | null
          accepts_international: boolean | null
          accepts_new_clients: boolean
          account_type: string | null
          acn: string | null
          admin_notes: string | null
          admin_tags: string[] | null
          advisor_dormant_nudged_at: string | null
          advisor_tier: string | null
          afsl_number: string | null
          aum_aud_billions: number | null
          aum_percentage: number | null
          auth_user_id: string | null
          auto_pause_reason: string | null
          auto_paused_at: string | null
          avg_response_minutes: number | null
          bio: string | null
          booking_enabled: boolean | null
          booking_intro: string | null
          booking_link: string | null
          content_license_accepted_at: string | null
          conversion_rate: number | null
          created_at: string | null
          credit_auto_topup: boolean | null
          credit_balance_cents: number
          education: Json | null
          email: string | null
          faqs: Json | null
          featured_stripe_subscription_id: string | null
          featured_until: string | null
          fee_description: string | null
          fee_model: string | null
          fee_structure: string | null
          firm_id: number | null
          firm_name: string | null
          firm_type: string | null
          flat_fee_cents: number | null
          free_leads_used: number | null
          geog: unknown
          health_factors: Json | null
          health_score: number | null
          health_scored_at: string | null
          health_status: string | null
          hourly_rate_cents: number | null
          id: number
          ideal_client: string | null
          initial_consultation_free: boolean | null
          intro_video_poster_url: string | null
          intro_video_url: string | null
          is_firm_admin: boolean | null
          is_sponsored: boolean
          languages: Json | null
          last_drip_at: string | null
          last_lead_at: string | null
          last_lead_date: string | null
          last_login_at: string | null
          last_verified_at: string | null
          latitude: number | null
          lead_price_cents: number | null
          leads_this_month: number | null
          lifetime_credit_cents: number
          lifetime_lead_spend_cents: number
          linkedin_url: string | null
          location_display: string | null
          location_postcode: string | null
          location_state: string | null
          location_suburb: string | null
          login_count: number | null
          longitude: number | null
          low_credit_alert_sent_at: string | null
          meeting_types: Json | null
          memberships: Json | null
          meta_description: string | null
          meta_title: string | null
          min_client_balance_cents: number | null
          min_investment_cents: number | null
          minimum_investment_cents: number | null
          name: string
          offer_active: boolean | null
          offer_expiry: string | null
          offer_terms: string | null
          offer_text: string | null
          office_states: string[] | null
          onboarded_at: string | null
          onboarding_step: number | null
          pause_warning_sent_at: string | null
          phone: string | null
          photo_url: string | null
          portal_onboarded: boolean | null
          preferred_lead_price_cents: number | null
          profile_complete: boolean | null
          profile_gate_checked_at: string | null
          profile_gate_step: number | null
          profile_missing_fields: string[] | null
          profile_quality_gate: string | null
          profile_score: number | null
          qualifications: Json | null
          rating: number | null
          registration_number: string | null
          research_offering: string | null
          response_time_hours: number | null
          review_count: number | null
          service_areas: Json | null
          service_tiers: Json | null
          slug: string
          specialties: Json | null
          sponsored_boost: number | null
          status: string | null
          stripe_customer_id: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          testimonials: Json | null
          tier_change_reason: string | null
          tier_changed_at: string | null
          tier_changed_by: string | null
          total_leads: number | null
          twitter_url: string | null
          type: string
          unresponded_leads: number | null
          updated_at: string | null
          verification_failures: number | null
          verification_method: string | null
          verification_notes: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
          website: string | null
          year_founded: number | null
          years_experience: number | null
        }
        Insert: {
          abn?: string | null
          accepting_new_clients?: boolean | null
          accepts_international?: boolean | null
          accepts_new_clients?: boolean
          account_type?: string | null
          acn?: string | null
          admin_notes?: string | null
          admin_tags?: string[] | null
          advisor_dormant_nudged_at?: string | null
          advisor_tier?: string | null
          afsl_number?: string | null
          aum_aud_billions?: number | null
          aum_percentage?: number | null
          auth_user_id?: string | null
          auto_pause_reason?: string | null
          auto_paused_at?: string | null
          avg_response_minutes?: number | null
          bio?: string | null
          booking_enabled?: boolean | null
          booking_intro?: string | null
          booking_link?: string | null
          content_license_accepted_at?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          credit_auto_topup?: boolean | null
          credit_balance_cents?: number
          education?: Json | null
          email?: string | null
          faqs?: Json | null
          featured_stripe_subscription_id?: string | null
          featured_until?: string | null
          fee_description?: string | null
          fee_model?: string | null
          fee_structure?: string | null
          firm_id?: number | null
          firm_name?: string | null
          firm_type?: string | null
          flat_fee_cents?: number | null
          free_leads_used?: number | null
          geog?: unknown
          health_factors?: Json | null
          health_score?: number | null
          health_scored_at?: string | null
          health_status?: string | null
          hourly_rate_cents?: number | null
          id?: number
          ideal_client?: string | null
          initial_consultation_free?: boolean | null
          intro_video_poster_url?: string | null
          intro_video_url?: string | null
          is_firm_admin?: boolean | null
          is_sponsored?: boolean
          languages?: Json | null
          last_drip_at?: string | null
          last_lead_at?: string | null
          last_lead_date?: string | null
          last_login_at?: string | null
          last_verified_at?: string | null
          latitude?: number | null
          lead_price_cents?: number | null
          leads_this_month?: number | null
          lifetime_credit_cents?: number
          lifetime_lead_spend_cents?: number
          linkedin_url?: string | null
          location_display?: string | null
          location_postcode?: string | null
          location_state?: string | null
          location_suburb?: string | null
          login_count?: number | null
          longitude?: number | null
          low_credit_alert_sent_at?: string | null
          meeting_types?: Json | null
          memberships?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          min_client_balance_cents?: number | null
          min_investment_cents?: number | null
          minimum_investment_cents?: number | null
          name: string
          offer_active?: boolean | null
          offer_expiry?: string | null
          offer_terms?: string | null
          offer_text?: string | null
          office_states?: string[] | null
          onboarded_at?: string | null
          onboarding_step?: number | null
          pause_warning_sent_at?: string | null
          phone?: string | null
          photo_url?: string | null
          portal_onboarded?: boolean | null
          preferred_lead_price_cents?: number | null
          profile_complete?: boolean | null
          profile_gate_checked_at?: string | null
          profile_gate_step?: number | null
          profile_missing_fields?: string[] | null
          profile_quality_gate?: string | null
          profile_score?: number | null
          qualifications?: Json | null
          rating?: number | null
          registration_number?: string | null
          research_offering?: string | null
          response_time_hours?: number | null
          review_count?: number | null
          service_areas?: Json | null
          service_tiers?: Json | null
          slug: string
          specialties?: Json | null
          sponsored_boost?: number | null
          status?: string | null
          stripe_customer_id?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          testimonials?: Json | null
          tier_change_reason?: string | null
          tier_changed_at?: string | null
          tier_changed_by?: string | null
          total_leads?: number | null
          twitter_url?: string | null
          type: string
          unresponded_leads?: number | null
          updated_at?: string | null
          verification_failures?: number | null
          verification_method?: string | null
          verification_notes?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
          year_founded?: number | null
          years_experience?: number | null
        }
        Update: {
          abn?: string | null
          accepting_new_clients?: boolean | null
          accepts_international?: boolean | null
          accepts_new_clients?: boolean
          account_type?: string | null
          acn?: string | null
          admin_notes?: string | null
          admin_tags?: string[] | null
          advisor_dormant_nudged_at?: string | null
          advisor_tier?: string | null
          afsl_number?: string | null
          aum_aud_billions?: number | null
          aum_percentage?: number | null
          auth_user_id?: string | null
          auto_pause_reason?: string | null
          auto_paused_at?: string | null
          avg_response_minutes?: number | null
          bio?: string | null
          booking_enabled?: boolean | null
          booking_intro?: string | null
          booking_link?: string | null
          content_license_accepted_at?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          credit_auto_topup?: boolean | null
          credit_balance_cents?: number
          education?: Json | null
          email?: string | null
          faqs?: Json | null
          featured_stripe_subscription_id?: string | null
          featured_until?: string | null
          fee_description?: string | null
          fee_model?: string | null
          fee_structure?: string | null
          firm_id?: number | null
          firm_name?: string | null
          firm_type?: string | null
          flat_fee_cents?: number | null
          free_leads_used?: number | null
          geog?: unknown
          health_factors?: Json | null
          health_score?: number | null
          health_scored_at?: string | null
          health_status?: string | null
          hourly_rate_cents?: number | null
          id?: number
          ideal_client?: string | null
          initial_consultation_free?: boolean | null
          intro_video_poster_url?: string | null
          intro_video_url?: string | null
          is_firm_admin?: boolean | null
          is_sponsored?: boolean
          languages?: Json | null
          last_drip_at?: string | null
          last_lead_at?: string | null
          last_lead_date?: string | null
          last_login_at?: string | null
          last_verified_at?: string | null
          latitude?: number | null
          lead_price_cents?: number | null
          leads_this_month?: number | null
          lifetime_credit_cents?: number
          lifetime_lead_spend_cents?: number
          linkedin_url?: string | null
          location_display?: string | null
          location_postcode?: string | null
          location_state?: string | null
          location_suburb?: string | null
          login_count?: number | null
          longitude?: number | null
          low_credit_alert_sent_at?: string | null
          meeting_types?: Json | null
          memberships?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          min_client_balance_cents?: number | null
          min_investment_cents?: number | null
          minimum_investment_cents?: number | null
          name?: string
          offer_active?: boolean | null
          offer_expiry?: string | null
          offer_terms?: string | null
          offer_text?: string | null
          office_states?: string[] | null
          onboarded_at?: string | null
          onboarding_step?: number | null
          pause_warning_sent_at?: string | null
          phone?: string | null
          photo_url?: string | null
          portal_onboarded?: boolean | null
          preferred_lead_price_cents?: number | null
          profile_complete?: boolean | null
          profile_gate_checked_at?: string | null
          profile_gate_step?: number | null
          profile_missing_fields?: string[] | null
          profile_quality_gate?: string | null
          profile_score?: number | null
          qualifications?: Json | null
          rating?: number | null
          registration_number?: string | null
          research_offering?: string | null
          response_time_hours?: number | null
          review_count?: number | null
          service_areas?: Json | null
          service_tiers?: Json | null
          slug?: string
          specialties?: Json | null
          sponsored_boost?: number | null
          status?: string | null
          stripe_customer_id?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          testimonials?: Json | null
          tier_change_reason?: string | null
          tier_changed_at?: string | null
          tier_changed_by?: string | null
          total_leads?: number | null
          twitter_url?: string | null
          type?: string
          unresponded_leads?: number | null
          updated_at?: string | null
          verification_failures?: number | null
          verification_method?: string | null
          verification_notes?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
          year_founded?: number | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "advisor_firms"
            referencedColumns: ["id"]
          },
        ]
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
      property_developers: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          credit_balance_cents: number | null
          description: string | null
          established_year: number | null
          id: number
          logo_url: string | null
          monthly_fee_cents: number | null
          name: string
          projects_completed: number | null
          slug: string
          status: string | null
          stripe_customer_id: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          credit_balance_cents?: number | null
          description?: string | null
          established_year?: number | null
          id?: number
          logo_url?: string | null
          monthly_fee_cents?: number | null
          name: string
          projects_completed?: number | null
          slug: string
          status?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          credit_balance_cents?: number | null
          description?: string | null
          established_year?: number | null
          id?: number
          logo_url?: string | null
          monthly_fee_cents?: number | null
          name?: string
          projects_completed?: number | null
          slug?: string
          status?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      property_leads: {
        Row: {
          created_at: string | null
          developer_id: number | null
          id: number
          investment_budget: string | null
          listing_id: number | null
          source_page: string | null
          status: string | null
          timeline: string | null
          user_country: string | null
          user_email: string
          user_message: string | null
          user_name: string
          user_phone: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string | null
          developer_id?: number | null
          id?: number
          investment_budget?: string | null
          listing_id?: number | null
          source_page?: string | null
          status?: string | null
          timeline?: string | null
          user_country?: string | null
          user_email: string
          user_message?: string | null
          user_name: string
          user_phone?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string | null
          developer_id?: number | null
          id?: number
          investment_budget?: string | null
          listing_id?: number | null
          source_page?: string | null
          status?: string | null
          timeline?: string | null
          user_country?: string | null
          user_email?: string
          user_message?: string | null
          user_name?: string
          user_phone?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_leads_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "property_developers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "property_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      property_listings: {
        Row: {
          address_display: string | null
          bedrooms_max: number | null
          bedrooms_min: number | null
          brochure_url: string | null
          capital_growth_10yr: number | null
          city: string | null
          completion_date: string | null
          created_at: string | null
          description: string | null
          developer_id: number | null
          developer_name: string | null
          featured: boolean | null
          firb_approved: boolean | null
          floor_plans: Json | null
          foreign_buyer_eligible: boolean | null
          id: number
          images: Json | null
          investment_highlights: Json | null
          lead_count: number | null
          monthly_fee_cents: number | null
          new_development: boolean | null
          off_the_plan: boolean | null
          price_from_cents: number | null
          price_to_cents: number | null
          property_type: string | null
          rental_yield_estimate: number | null
          slug: string
          sponsored: boolean | null
          state: string | null
          status: string | null
          suburb: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          address_display?: string | null
          bedrooms_max?: number | null
          bedrooms_min?: number | null
          brochure_url?: string | null
          capital_growth_10yr?: number | null
          city?: string | null
          completion_date?: string | null
          created_at?: string | null
          description?: string | null
          developer_id?: number | null
          developer_name?: string | null
          featured?: boolean | null
          firb_approved?: boolean | null
          floor_plans?: Json | null
          foreign_buyer_eligible?: boolean | null
          id?: number
          images?: Json | null
          investment_highlights?: Json | null
          lead_count?: number | null
          monthly_fee_cents?: number | null
          new_development?: boolean | null
          off_the_plan?: boolean | null
          price_from_cents?: number | null
          price_to_cents?: number | null
          property_type?: string | null
          rental_yield_estimate?: number | null
          slug: string
          sponsored?: boolean | null
          state?: string | null
          status?: string | null
          suburb?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          address_display?: string | null
          bedrooms_max?: number | null
          bedrooms_min?: number | null
          brochure_url?: string | null
          capital_growth_10yr?: number | null
          city?: string | null
          completion_date?: string | null
          created_at?: string | null
          description?: string | null
          developer_id?: number | null
          developer_name?: string | null
          featured?: boolean | null
          firb_approved?: boolean | null
          floor_plans?: Json | null
          foreign_buyer_eligible?: boolean | null
          id?: number
          images?: Json | null
          investment_highlights?: Json | null
          lead_count?: number | null
          monthly_fee_cents?: number | null
          new_development?: boolean | null
          off_the_plan?: boolean | null
          price_from_cents?: number | null
          price_to_cents?: number | null
          property_type?: string | null
          rental_yield_estimate?: number | null
          slug?: string
          sponsored?: boolean | null
          state?: string | null
          status?: string | null
          suburb?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_listings_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "property_developers"
            referencedColumns: ["id"]
          },
        ]
      }
      property_suburb_refresh_log: {
        Row: {
          fields_changed: Json | null
          id: number
          provider: string
          refreshed_at: string
          suburb_slug: string
        }
        Insert: {
          fields_changed?: Json | null
          id?: number
          provider: string
          refreshed_at?: string
          suburb_slug: string
        }
        Update: {
          fields_changed?: Json | null
          id?: number
          provider?: string
          refreshed_at?: string
          suburb_slug?: string
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
      quiz_follow_ups: {
        Row: {
          created_at: string | null
          drip_type: string
          email: string
          email_sent: boolean | null
          id: number
        }
        Insert: {
          created_at?: string | null
          drip_type: string
          email: string
          email_sent?: boolean | null
          id?: never
        }
        Update: {
          created_at?: string | null
          drip_type?: string
          email?: string
          email_sent?: boolean | null
          id?: never
        }
        Relationships: []
      }
      quiz_leads: {
        Row: {
          answers: Json | null
          captured_at: string | null
          converted_at: string | null
          drip_last_sent_at: string | null
          drip_step: number
          email: string
          experience_level: string | null
          id: number
          inferred_confidence: number | null
          inferred_vertical: string | null
          investment_range: string | null
          last_annual_reminder: string | null
          name: string | null
          top_match_slug: string | null
          trading_interest: string | null
          unsubscribed: boolean | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          answers?: Json | null
          captured_at?: string | null
          converted_at?: string | null
          drip_last_sent_at?: string | null
          drip_step?: number
          email: string
          experience_level?: string | null
          id?: number
          inferred_confidence?: number | null
          inferred_vertical?: string | null
          investment_range?: string | null
          last_annual_reminder?: string | null
          name?: string | null
          top_match_slug?: string | null
          trading_interest?: string | null
          unsubscribed?: boolean | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          answers?: Json | null
          captured_at?: string | null
          converted_at?: string | null
          drip_last_sent_at?: string | null
          drip_step?: number
          email?: string
          experience_level?: string | null
          id?: number
          inferred_confidence?: number | null
          inferred_vertical?: string | null
          investment_range?: string | null
          last_annual_reminder?: string | null
          name?: string | null
          top_match_slug?: string | null
          trading_interest?: string | null
          unsubscribed?: boolean | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
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
          property_weight: number | null
          robo_weight: number | null
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
          property_weight?: number | null
          robo_weight?: number | null
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
          property_weight?: number | null
          robo_weight?: number | null
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
      rate_limit_buckets: {
        Row: {
          created_at: string
          key: string
          max_tokens: number
          refill_per_sec: number
          refilled_at: string
          scope: string
          tokens: number
        }
        Insert: {
          created_at?: string
          key: string
          max_tokens: number
          refill_per_sec: number
          refilled_at?: string
          scope: string
          tokens: number
        }
        Update: {
          created_at?: string
          key?: string
          max_tokens?: number
          refill_per_sec?: number
          refilled_at?: string
          scope?: string
          tokens?: number
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number | null
          id: number
          key: string
          window_start: string | null
        }
        Insert: {
          count?: number | null
          id?: number
          key: string
          window_start?: string | null
        }
        Update: {
          count?: number | null
          id?: number
          key?: string
          window_start?: string | null
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          created_at: string
          id: number
          paid_at: string | null
          payout_method: string | null
          payout_reference: string | null
          referral_code: string
          referred_email: string
          referrer_email: string
          rejection_reason: string | null
          reward_cents: number
          status: string
          trigger_event: string
        }
        Insert: {
          created_at?: string
          id?: number
          paid_at?: string | null
          payout_method?: string | null
          payout_reference?: string | null
          referral_code: string
          referred_email: string
          referrer_email: string
          rejection_reason?: string | null
          reward_cents: number
          status?: string
          trigger_event: string
        }
        Update: {
          created_at?: string
          id?: number
          paid_at?: string | null
          payout_method?: string | null
          payout_reference?: string | null
          referral_code?: string
          referred_email?: string
          referrer_email?: string
          rejection_reason?: string | null
          reward_cents?: number
          status?: string
          trigger_event?: string
        }
        Relationships: []
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
      retention_rules: {
        Row: {
          description: string | null
          email_column: string | null
          enabled: boolean
          id: number
          keep_days: number
          last_rows_affected: number | null
          last_run_at: string | null
          strategy: string
          table_name: string
          timestamp_column: string
        }
        Insert: {
          description?: string | null
          email_column?: string | null
          enabled?: boolean
          id?: number
          keep_days: number
          last_rows_affected?: number | null
          last_run_at?: string | null
          strategy: string
          table_name: string
          timestamp_column: string
        }
        Update: {
          description?: string | null
          email_column?: string | null
          enabled?: boolean
          id?: number
          keep_days?: number
          last_rows_affected?: number | null
          last_run_at?: string | null
          strategy?: string
          table_name?: string
          timestamp_column?: string
        }
        Relationships: []
      }
      revenue_attribution_daily: {
        Row: {
          channel: string
          computed_at: string
          first_touch_conversions: number
          id: number
          last_touch_conversions: number
          linear_conversions: number
          revenue_cents: number
          run_date: string
          touches: number
          vertical: string | null
        }
        Insert: {
          channel: string
          computed_at?: string
          first_touch_conversions?: number
          id?: number
          last_touch_conversions?: number
          linear_conversions?: number
          revenue_cents?: number
          run_date: string
          touches?: number
          vertical?: string | null
        }
        Update: {
          channel?: string
          computed_at?: string
          first_touch_conversions?: number
          id?: number
          last_touch_conversions?: number
          linear_conversions?: number
          revenue_cents?: number
          run_date?: string
          touches?: number
          vertical?: string | null
        }
        Relationships: []
      }
      revenue_reconciliation_runs: {
        Row: {
          alert_sent_to: string | null
          alerted: boolean
          expected_cents: number | null
          id: number
          notes: string | null
          reported_cents: number | null
          run_at: string
          run_date: string
          source: string
          variance_cents: number | null
          variance_pct: number | null
        }
        Insert: {
          alert_sent_to?: string | null
          alerted?: boolean
          expected_cents?: number | null
          id?: number
          notes?: string | null
          reported_cents?: number | null
          run_at?: string
          run_date: string
          source: string
          variance_cents?: number | null
          variance_pct?: number | null
        }
        Update: {
          alert_sent_to?: string | null
          alerted?: boolean
          expected_cents?: number | null
          id?: number
          notes?: string | null
          reported_cents?: number | null
          run_at?: string
          run_date?: string
          source?: string
          variance_cents?: number | null
          variance_pct?: number | null
        }
        Relationships: []
      }
      review_sentiment_facets: {
        Row: {
          customer_service: number | null
          fees_value: number | null
          id: number
          model: string | null
          overall_tone: string | null
          platform_ux: number | null
          provider: string
          review_id: number
          review_type: string
          scored_at: string
          speed_reliability: number | null
          summary: string | null
          trust_accuracy: number | null
        }
        Insert: {
          customer_service?: number | null
          fees_value?: number | null
          id?: number
          model?: string | null
          overall_tone?: string | null
          platform_ux?: number | null
          provider: string
          review_id: number
          review_type: string
          scored_at?: string
          speed_reliability?: number | null
          summary?: string | null
          trust_accuracy?: number | null
        }
        Update: {
          customer_service?: number | null
          fees_value?: number | null
          id?: number
          model?: string | null
          overall_tone?: string | null
          platform_ux?: number | null
          provider?: string
          review_id?: number
          review_type?: string
          scored_at?: string
          speed_reliability?: number | null
          summary?: string | null
          trust_accuracy?: number | null
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
      search_embeddings: {
        Row: {
          body_excerpt: string | null
          document_id: string
          document_type: string
          embedded_at: string
          embedding: string | null
          id: number
          model: string
          source_updated_at: string | null
          title: string | null
        }
        Insert: {
          body_excerpt?: string | null
          document_id: string
          document_type: string
          embedded_at?: string
          embedding?: string | null
          id?: number
          model: string
          source_updated_at?: string | null
          title?: string | null
        }
        Update: {
          body_excerpt?: string | null
          document_id?: string
          document_type?: string
          embedded_at?: string
          embedding?: string | null
          id?: number
          model?: string
          source_updated_at?: string | null
          title?: string | null
        }
        Relationships: []
      }
      search_queries: {
        Row: {
          clicked_rank: number | null
          created_at: string
          id: number
          query_length: number
          query_text: string
          result_clicked: boolean
          result_count: number | null
          session_hash: string | null
          surface: string
        }
        Insert: {
          clicked_rank?: number | null
          created_at?: string
          id?: number
          query_length: number
          query_text: string
          result_clicked?: boolean
          result_count?: number | null
          session_hash?: string | null
          surface: string
        }
        Update: {
          clicked_rank?: number | null
          created_at?: string
          id?: number
          query_length?: number
          query_text?: string
          result_clicked?: boolean
          result_count?: number | null
          session_hash?: string | null
          surface?: string
        }
        Relationships: []
      }
      sector_reports: {
        Row: {
          gated: boolean | null
          id: number
          published_at: string | null
          report_url: string | null
          sector: string | null
          slug: string
          sponsor_logo_url: string | null
          sponsor_name: string | null
          status: string | null
          summary: string | null
          title: string
        }
        Insert: {
          gated?: boolean | null
          id?: number
          published_at?: string | null
          report_url?: string | null
          sector?: string | null
          slug: string
          sponsor_logo_url?: string | null
          sponsor_name?: string | null
          status?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          gated?: boolean | null
          id?: number
          published_at?: string | null
          report_url?: string | null
          sector?: string | null
          slug?: string
          sponsor_logo_url?: string | null
          sponsor_name?: string | null
          status?: string | null
          summary?: string | null
          title?: string
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
      slo_definitions: {
        Row: {
          comparator: string
          created_at: string
          enabled: boolean
          evaluation_source: Json | null
          id: number
          metric: string
          name: string
          service: string
          target: number
          window_minutes: number
        }
        Insert: {
          comparator: string
          created_at?: string
          enabled?: boolean
          evaluation_source?: Json | null
          id?: number
          metric: string
          name: string
          service: string
          target: number
          window_minutes?: number
        }
        Update: {
          comparator?: string
          created_at?: string
          enabled?: boolean
          evaluation_source?: Json | null
          id?: number
          metric?: string
          name?: string
          service?: string
          target?: number
          window_minutes?: number
        }
        Relationships: []
      }
      slo_incidents: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          comparator: string | null
          context: Json | null
          id: number
          measured_value: number | null
          notes: string | null
          resolved_at: string | null
          service: string
          severity: string
          slo_name: string
          started_at: string
          status: string
          target_value: number | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          comparator?: string | null
          context?: Json | null
          id?: number
          measured_value?: number | null
          notes?: string | null
          resolved_at?: string | null
          service: string
          severity: string
          slo_name: string
          started_at?: string
          status?: string
          target_value?: number | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          comparator?: string | null
          context?: Json | null
          id?: number
          measured_value?: number | null
          notes?: string | null
          resolved_at?: string | null
          service?: string
          severity?: string
          slo_name?: string
          started_at?: string
          status?: string
          target_value?: number | null
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
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
      sponsored_placements: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          daily_cap_cents: number
          ends_at: string | null
          id: number
          professional_id: number
          spend_today_cents: number
          starts_at: string
          tier: string
          vertical: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          daily_cap_cents?: number
          ends_at?: string | null
          id?: number
          professional_id: number
          spend_today_cents?: number
          starts_at?: string
          tier: string
          vertical?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          daily_cap_cents?: number
          ends_at?: string | null
          id?: number
          professional_id?: number
          spend_today_cents?: number
          starts_at?: string
          tier?: string
          vertical?: string | null
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          completed_at: string | null
          event_id: string
          event_type: string
          received_at: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          event_id: string
          event_type: string
          received_at?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          event_id?: string
          event_type?: string
          received_at?: string
          started_at?: string | null
          status?: string
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
          dunning_attempt_count: number | null
          grace_period_until: string | null
          id: number
          last_dunning_email_at: string | null
          pause_reason: string | null
          paused_at: string | null
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
          dunning_attempt_count?: number | null
          grace_period_until?: string | null
          id?: never
          last_dunning_email_at?: string | null
          pause_reason?: string | null
          paused_at?: string | null
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
          dunning_attempt_count?: number | null
          grace_period_until?: string | null
          id?: never
          last_dunning_email_at?: string | null
          pause_reason?: string | null
          paused_at?: string | null
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
      suburb_data: {
        Row: {
          capital_growth_10yr: number | null
          capital_growth_1yr: number | null
          capital_growth_3yr: number | null
          capital_growth_5yr: number | null
          created_at: string | null
          data_date: string | null
          distance_to_cbd_km: number | null
          id: number
          median_age: number | null
          median_income: number | null
          median_price_house: number | null
          median_price_unit: number | null
          population: number | null
          population_growth: number | null
          postcode: string | null
          rental_yield_house: number | null
          rental_yield_unit: number | null
          slug: string | null
          state: string
          suburb: string
          vacancy_rate: number | null
        }
        Insert: {
          capital_growth_10yr?: number | null
          capital_growth_1yr?: number | null
          capital_growth_3yr?: number | null
          capital_growth_5yr?: number | null
          created_at?: string | null
          data_date?: string | null
          distance_to_cbd_km?: number | null
          id?: number
          median_age?: number | null
          median_income?: number | null
          median_price_house?: number | null
          median_price_unit?: number | null
          population?: number | null
          population_growth?: number | null
          postcode?: string | null
          rental_yield_house?: number | null
          rental_yield_unit?: number | null
          slug?: string | null
          state: string
          suburb: string
          vacancy_rate?: number | null
        }
        Update: {
          capital_growth_10yr?: number | null
          capital_growth_1yr?: number | null
          capital_growth_3yr?: number | null
          capital_growth_5yr?: number | null
          created_at?: string | null
          data_date?: string | null
          distance_to_cbd_km?: number | null
          id?: number
          median_age?: number | null
          median_income?: number | null
          median_price_house?: number | null
          median_price_unit?: number | null
          population?: number | null
          population_growth?: number | null
          postcode?: string | null
          rental_yield_house?: number | null
          rental_yield_unit?: number | null
          slug?: string | null
          state?: string
          suburb?: string
          vacancy_rate?: number | null
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
      tmds: {
        Row: {
          id: number
          product_name: string
          product_ref: string
          product_type: string
          reviewed_at: string | null
          tmd_url: string
          tmd_version: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          id?: number
          product_name: string
          product_ref: string
          product_type: string
          reviewed_at?: string | null
          tmd_url: string
          tmd_version: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          id?: number
          product_name?: string
          product_ref?: string
          product_type?: string
          reviewed_at?: string | null
          tmd_url?: string
          tmd_version?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      tos_acceptances: {
        Row: {
          accepted_at: string | null
          id: number
          ip_address: string | null
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string | null
          id?: number
          ip_address?: string | null
          user_id: string
          version?: string
        }
        Update: {
          accepted_at?: string | null
          id?: number
          ip_address?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      user_bookmarks: {
        Row: {
          bookmark_type: string
          created_at: string
          id: number
          label: string | null
          note: string | null
          ref: string
          user_id: string
        }
        Insert: {
          bookmark_type: string
          created_at?: string
          id?: number
          label?: string | null
          note?: string | null
          ref: string
          user_id: string
        }
        Update: {
          bookmark_type?: string
          created_at?: string
          id?: number
          label?: string | null
          note?: string | null
          ref?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string | null
          created_at: string
          email_delivery_key: string | null
          id: number
          link_url: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          email_delivery_key?: string | null
          id?: number
          link_url?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          email_delivery_key?: string | null
          id?: number
          link_url?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_portfolios: {
        Row: {
          alert_frequency: string | null
          alert_on_better_deal: boolean | null
          alert_on_fee_change: boolean | null
          annual_fees_cents: number | null
          created_at: string | null
          email: string
          holdings: Json | null
          id: number
          last_checked_at: string | null
          last_snapshot_at: string | null
          name: string | null
          optimal_broker_slug: string | null
          optimal_fees_cents: number | null
          pro_subscriber: boolean | null
          savings_cents: number | null
          total_balance_cents: number | null
          updated_at: string | null
        }
        Insert: {
          alert_frequency?: string | null
          alert_on_better_deal?: boolean | null
          alert_on_fee_change?: boolean | null
          annual_fees_cents?: number | null
          created_at?: string | null
          email: string
          holdings?: Json | null
          id?: number
          last_checked_at?: string | null
          last_snapshot_at?: string | null
          name?: string | null
          optimal_broker_slug?: string | null
          optimal_fees_cents?: number | null
          pro_subscriber?: boolean | null
          savings_cents?: number | null
          total_balance_cents?: number | null
          updated_at?: string | null
        }
        Update: {
          alert_frequency?: string | null
          alert_on_better_deal?: boolean | null
          alert_on_fee_change?: boolean | null
          annual_fees_cents?: number | null
          created_at?: string | null
          email?: string
          holdings?: Json | null
          id?: number
          last_checked_at?: string | null
          last_snapshot_at?: string | null
          name?: string | null
          optimal_broker_slug?: string | null
          optimal_fees_cents?: number | null
          pro_subscriber?: boolean | null
          savings_cents?: number | null
          total_balance_cents?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_quiz_history: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string
          id: number
          inferred_vertical: string | null
          resumed_from: number | null
          session_id: string | null
          top_match_slug: string | null
          user_id: string | null
        }
        Insert: {
          answers: Json
          completed_at?: string | null
          created_at?: string
          id?: number
          inferred_vertical?: string | null
          resumed_from?: number | null
          session_id?: string | null
          top_match_slug?: string | null
          user_id?: string | null
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          id?: number
          inferred_vertical?: string | null
          resumed_from?: number | null
          session_id?: string | null
          top_match_slug?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_reviews: {
        Row: {
          admin_overridden_at: string | null
          admin_overridden_by: string | null
          auto_moderated_at: string | null
          auto_moderated_reasons: Json | null
          auto_moderated_verdict: string | null
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
          admin_overridden_at?: string | null
          admin_overridden_by?: string | null
          auto_moderated_at?: string | null
          auto_moderated_reasons?: Json | null
          auto_moderated_verdict?: string | null
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
          admin_overridden_at?: string | null
          admin_overridden_by?: string | null
          auto_moderated_at?: string | null
          auto_moderated_reasons?: Json | null
          auto_moderated_verdict?: string | null
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
      versus_editorials: {
        Row: {
          broker_a_slug: string
          broker_b_slug: string
          choose_a: string | null
          choose_b: string | null
          created_at: string | null
          faqs: Json | null
          id: number
          intro: string | null
          meta_description: string | null
          sections: Json | null
          slug: string
          title: string
          updated_at: string | null
          verdict: string | null
        }
        Insert: {
          broker_a_slug: string
          broker_b_slug: string
          choose_a?: string | null
          choose_b?: string | null
          created_at?: string | null
          faqs?: Json | null
          id?: number
          intro?: string | null
          meta_description?: string | null
          sections?: Json | null
          slug: string
          title: string
          updated_at?: string | null
          verdict?: string | null
        }
        Update: {
          broker_a_slug?: string
          broker_b_slug?: string
          choose_a?: string | null
          choose_b?: string | null
          created_at?: string | null
          faqs?: Json | null
          id?: number
          intro?: string | null
          meta_description?: string | null
          sections?: Json | null
          slug?: string
          title?: string
          updated_at?: string | null
          verdict?: string | null
        }
        Relationships: []
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
      warehouse_daily_facts: {
        Row: {
          computed_at: string
          day: string
          dimension_1: string | null
          dimension_2: string | null
          id: number
          metric_name: string
          metric_value: number
        }
        Insert: {
          computed_at?: string
          day: string
          dimension_1?: string | null
          dimension_2?: string | null
          id?: number
          metric_name: string
          metric_value: number
        }
        Update: {
          computed_at?: string
          day?: string
          dimension_1?: string | null
          dimension_2?: string | null
          id?: number
          metric_name?: string
          metric_value?: number
        }
        Relationships: []
      }
      web_vitals_daily_rollup: {
        Row: {
          device_kind: string
          good_pct: number | null
          id: number
          metric: string
          p50: number
          p75: number
          p95: number
          page_path: string
          poor_pct: number | null
          run_date: string
          sample_count: number
        }
        Insert: {
          device_kind: string
          good_pct?: number | null
          id?: number
          metric: string
          p50: number
          p75: number
          p95: number
          page_path: string
          poor_pct?: number | null
          run_date: string
          sample_count: number
        }
        Update: {
          device_kind?: string
          good_pct?: number | null
          id?: number
          metric?: string
          p50?: number
          p75?: number
          p95?: number
          page_path?: string
          poor_pct?: number | null
          run_date?: string
          sample_count?: number
        }
        Relationships: []
      }
      web_vitals_samples: {
        Row: {
          created_at: string
          device_kind: string | null
          id: number
          metric: string
          page_path: string
          rating: string | null
          session_hash: string | null
          value: number
        }
        Insert: {
          created_at?: string
          device_kind?: string | null
          id?: number
          metric: string
          page_path: string
          rating?: string | null
          session_hash?: string | null
          value: number
        }
        Update: {
          created_at?: string
          device_kind?: string | null
          id?: number
          metric?: string
          page_path?: string
          rating?: string | null
          session_hash?: string | null
          value?: number
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
      admin_advisor_health: {
        Row: {
          admin_tags: string[] | null
          auto_health_flag: string | null
          avg_response_minutes: number | null
          conversion_rate: number | null
          created_at: string | null
          credit_balance_cents: number | null
          firm_name: string | null
          health_status: string | null
          id: number | null
          last_lead_at: string | null
          last_login_at: string | null
          leads_this_month: number | null
          login_count: number | null
          name: string | null
          profile_complete: boolean | null
          response_speed: string | null
          status: string | null
          total_leads: number | null
          type: string | null
        }
        Insert: {
          admin_tags?: string[] | null
          auto_health_flag?: never
          avg_response_minutes?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          credit_balance_cents?: number | null
          firm_name?: string | null
          health_status?: string | null
          id?: number | null
          last_lead_at?: string | null
          last_login_at?: string | null
          leads_this_month?: number | null
          login_count?: number | null
          name?: string | null
          profile_complete?: boolean | null
          response_speed?: never
          status?: string | null
          total_leads?: number | null
          type?: string | null
        }
        Update: {
          admin_tags?: string[] | null
          auto_health_flag?: never
          avg_response_minutes?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          credit_balance_cents?: number | null
          firm_name?: string | null
          health_status?: string | null
          id?: number | null
          last_lead_at?: string | null
          last_login_at?: string | null
          leads_this_month?: number | null
          login_count?: number | null
          name?: string | null
          profile_complete?: boolean | null
          response_speed?: never
          status?: string | null
          total_leads?: number | null
          type?: string | null
        }
        Relationships: []
      }
      advisor_cohort_metrics: {
        Row: {
          advisors_signed_up: number | null
          advisors_still_active: number | null
          cohort_month: string | null
          earliest_signup: string | null
          latest_signup: string | null
          retention_pct: number | null
          total_credit_balance_cents: number | null
        }
        Relationships: []
      }
      connection_pool_snapshot: {
        Row: {
          connection_count: number | null
          max_age_seconds: number | null
          state: string | null
        }
        Relationships: []
      }
      finance_monthly_summary: {
        Row: {
          expense_cents: number | null
          expense_count: number | null
          income_cents: number | null
          income_count: number | null
          month: string | null
          net_cents: number | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      slow_query_snapshot: {
        Row: {
          calls: number | null
          max_exec_time: number | null
          mean_exec_time: number | null
          query_sample: string | null
          queryid: number | null
          rows: number | null
          total_exec_time: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      advisor_fee_stats: {
        Args: { p_type?: string }
        Returns: {
          advisor_count: number
          advisor_type: string
          avg_aum_pct: number
          avg_flat_fee_cents: number
          avg_hourly_cents: number
          max_flat_fee_cents: number
          max_hourly_cents: number
          min_flat_fee_cents: number
          min_hourly_cents: number
        }[]
      }
      cleanup_expired_data: { Args: never; Returns: undefined }
      cleanup_old_analytics: { Args: never; Returns: undefined }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_broker_percentile: {
        Args: { p_broker_slug: string; p_date_from: string }
        Returns: {
          broker_value: number
          metric: string
          percentile_rank: number
          total_brokers: number
        }[]
      }
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
      get_clicks_by_placement_7d: {
        Args: never
        Returns: {
          count: number
          placement_type: string
        }[]
      }
      get_daily_click_stats: {
        Args: { days_back?: number }
        Returns: {
          clicks: number
          day: string
        }[]
      }
      get_daily_clicks_30d: {
        Args: never
        Returns: {
          count: number
          day: string
        }[]
      }
      get_daily_events_30d: {
        Args: never
        Returns: {
          count: number
          day: string
        }[]
      }
      get_device_breakdown_7d: {
        Args: never
        Returns: {
          count: number
          device_type: string
        }[]
      }
      get_platform_benchmarks: {
        Args: { date_from: string }
        Returns: {
          total_clicks: number
          total_conversions: number
          total_impressions: number
          total_spend_cents: number
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
      get_top_broker_clicks_7d: {
        Args: never
        Returns: {
          broker_name: string
          broker_slug: string
          count: number
        }[]
      }
      get_top_events_7d: {
        Args: never
        Returns: {
          count: number
          event_type: string
        }[]
      }
      get_top_pages_7d: {
        Args: never
        Returns: {
          count: number
          page: string
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      increment_advisor_view: {
        Args: { p_date: string; p_professional_id: number }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_pro: { Args: { check_user_id?: string }; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      refresh_advisor_cohort_metrics: { Args: never; Returns: undefined }
      refresh_placement_stats: { Args: never; Returns: undefined }
      search_advisors_nearby: {
        Args: {
          p_fee_structure?: string
          p_lat: number
          p_limit?: number
          p_lng: number
          p_offset?: number
          p_radius_km?: number
          p_specialty?: string
          p_type?: string
        }
        Returns: {
          aum_percentage: number
          distance_km: number
          fee_description: string
          fee_structure: string
          firm_name: string
          flat_fee_cents: number
          hourly_rate_cents: number
          id: number
          initial_consultation_free: boolean
          location_display: string
          location_postcode: string
          location_state: string
          location_suburb: string
          name: string
          offer_active: boolean
          offer_text: string
          photo_url: string
          rating: number
          review_count: number
          slug: string
          specialties: Json
          type: string
          verified: boolean
        }[]
      }
      search_embeddings_knn: {
        Args: {
          match_limit?: number
          match_type?: string
          query_embedding: string
        }
        Returns: {
          body_excerpt: string
          distance: number
          document_id: string
          document_type: string
          title: string
        }[]
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
