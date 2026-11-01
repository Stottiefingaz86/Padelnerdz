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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_allowlist: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      businesses: {
        Row: {
          created_at: string
          google_place_id: string | null
          id: string
          location: string | null
          name: string
          review_source: Database["public"]["Enums"]["review_source"]
          slug: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          google_place_id?: string | null
          id?: string
          location?: string | null
          name: string
          review_source?: Database["public"]["Enums"]["review_source"]
          slug: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          google_place_id?: string | null
          id?: string
          location?: string | null
          name?: string
          review_source?: Database["public"]["Enums"]["review_source"]
          slug?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      client_bookings: {
        Row: {
          booking_date: string | null
          booking_type: string | null
          calendar_event_id: string | null
          client_id: string
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          status: string | null
        }
        Insert: {
          booking_date?: string | null
          booking_type?: string | null
          calendar_event_id?: string | null
          client_id: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          booking_date?: string | null
          booking_type?: string | null
          calendar_event_id?: string | null
          client_id?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_credentials: {
        Row: {
          client_id: string
          created_at: string
          encrypted_api_key: string | null
          encrypted_password: string | null
          id: string
          last_updated: string
          login_url: string | null
          notes: string | null
          owner: string | null
          platform_name: string
          username: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          encrypted_api_key?: string | null
          encrypted_password?: string | null
          id?: string
          last_updated?: string
          login_url?: string | null
          notes?: string | null
          owner?: string | null
          platform_name: string
          username?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          encrypted_api_key?: string | null
          encrypted_password?: string | null
          id?: string
          last_updated?: string
          login_url?: string | null
          notes?: string | null
          owner?: string | null
          platform_name?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_credentials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_integrations: {
        Row: {
          booking_platform: string | null
          booking_platform_notes: string | null
          client_id: string
          created_at: string
          elevenlabs_agent_id: string | null
          elevenlabs_agent_url: string | null
          elevenlabs_phone_number_id: string | null
          google_calendar_id: string | null
          id: string
          n8n_booking_workflow_url: string | null
          n8n_cancel_workflow_url: string | null
          n8n_voc_workflow_url: string | null
          twilio_number: string | null
          updated_at: string
          whatsapp_status: string | null
          zadarma_number: string | null
        }
        Insert: {
          booking_platform?: string | null
          booking_platform_notes?: string | null
          client_id: string
          created_at?: string
          elevenlabs_agent_id?: string | null
          elevenlabs_agent_url?: string | null
          elevenlabs_phone_number_id?: string | null
          google_calendar_id?: string | null
          id?: string
          n8n_booking_workflow_url?: string | null
          n8n_cancel_workflow_url?: string | null
          n8n_voc_workflow_url?: string | null
          twilio_number?: string | null
          updated_at?: string
          whatsapp_status?: string | null
          zadarma_number?: string | null
        }
        Update: {
          booking_platform?: string | null
          booking_platform_notes?: string | null
          client_id?: string
          created_at?: string
          elevenlabs_agent_id?: string | null
          elevenlabs_agent_url?: string | null
          elevenlabs_phone_number_id?: string | null
          google_calendar_id?: string | null
          id?: string
          n8n_booking_workflow_url?: string | null
          n8n_cancel_workflow_url?: string | null
          n8n_voc_workflow_url?: string | null
          twilio_number?: string | null
          updated_at?: string
          whatsapp_status?: string | null
          zadarma_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_integrations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_payments: {
        Row: {
          amount: number | null
          client_id: string
          created_at: string
          due_date: string | null
          id: string
          invoice_sent_at: string | null
          invoice_url: string | null
          paid_date: string | null
          setup_fee_paid: boolean
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          amount?: number | null
          client_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_sent_at?: string | null
          invoice_url?: string | null
          paid_date?: string | null
          setup_fee_paid?: boolean
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          amount?: number | null
          client_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_sent_at?: string | null
          invoice_url?: string | null
          paid_date?: string | null
          setup_fee_paid?: boolean
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_voc_reports: {
        Row: {
          client_id: string
          created_at: string
          id: string
          month: string
          public_token: string | null
          public_url: string | null
          report_json: Json | null
          sent_at: string | null
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          month: string
          public_token?: string | null
          public_url?: string | null
          report_json?: Json | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          month?: string
          public_token?: string | null
          public_url?: string | null
          report_json?: Json | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_voc_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          business_name: string
          business_type: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          included_minutes: number | null
          monthly_fee: number | null
          notes: string | null
          onboarding_checklist: Json
          overage_rate: number | null
          package_name: string | null
          payment_status: string | null
          setup_fee: number | null
          status: string
          updated_at: string
          voc_enabled: boolean
        }
        Insert: {
          business_name: string
          business_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          included_minutes?: number | null
          monthly_fee?: number | null
          notes?: string | null
          onboarding_checklist?: Json
          overage_rate?: number | null
          package_name?: string | null
          payment_status?: string | null
          setup_fee?: number | null
          status?: string
          updated_at?: string
          voc_enabled?: boolean
        }
        Update: {
          business_name?: string
          business_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          included_minutes?: number | null
          monthly_fee?: number | null
          notes?: string | null
          onboarding_checklist?: Json
          overage_rate?: number | null
          package_name?: string | null
          payment_status?: string | null
          setup_fee?: number | null
          status?: string
          updated_at?: string
          voc_enabled?: boolean
        }
        Relationships: []
      }
      group_memberships: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["group_role"]
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_role"]
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_member_profiles: {
        Row: {
          group_id: string
          notes: string
          no_shows: number
          organiser_level: string
          sessions_played: number
          updated_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          notes?: string
          no_shows?: number
          organiser_level?: string
          sessions_played?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          notes?: string
          no_shows?: number
          organiser_level?: string
          sessions_played?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_member_profiles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_member_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_payment_settings: {
        Row: {
          bizum_name: string | null
          bizum_phone: string | null
          group_id: string
          payment_note: string | null
          preferred_method: string
          revolut_me_code: string | null
          revolut_me_url: string | null
          stripe_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bizum_name?: string | null
          bizum_phone?: string | null
          group_id: string
          payment_note?: string | null
          preferred_method?: string
          revolut_me_code?: string | null
          revolut_me_url?: string | null
          stripe_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bizum_name?: string | null
          bizum_phone?: string | null
          group_id?: string
          payment_note?: string | null
          preferred_method?: string
          revolut_me_code?: string | null
          revolut_me_url?: string | null
          stripe_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_payment_settings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_payment_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          body: string
          created_at: string
          group_id: string
          id: string
          kind: Database["public"]["Enums"]["message_kind"]
          payload: Json
          sender_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          group_id: string
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          payload?: Json
          sender_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          group_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          payload?: Json
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          avatar_url: string | null
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          invite_code: string | null
          latitude: number | null
          location_label: string | null
          longitude: number | null
          members_can_post: boolean
          name: string
          skill_level: string | null
          skill_level_max: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["group_visibility"]
        }
        Insert: {
          avatar_url?: string | null
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          invite_code?: string | null
          latitude?: number | null
          location_label?: string | null
          longitude?: number | null
          members_can_post?: boolean
          name: string
          skill_level?: string | null
          skill_level_max?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["group_visibility"]
        }
        Update: {
          avatar_url?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          invite_code?: string | null
          latitude?: number | null
          location_label?: string | null
          longitude?: number | null
          members_can_post?: boolean
          name?: string
          skill_level?: string | null
          skill_level_max?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["group_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kq_attendance: {
        Row: {
          player_id: string
          session_id: string
          state: string
          verified_at: string | null
        }
        Insert: {
          player_id: string
          session_id: string
          state?: string
          verified_at?: string | null
        }
        Update: {
          player_id?: string
          session_id?: string
          state?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kq_attendance_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "kq_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kq_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "kq_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      kq_club_settings: {
        Row: {
          accept_cash: boolean
          accept_revolut_transfer: boolean
          changeover_minutes: number
          club_name: string
          id: string
          max_rounds: number
          organiser_approval_required: boolean
          organiser_commission_cents: number
          payment_note: string | null
          payments_enabled: boolean
          play_minutes: number
          revolut_me_url: string | null
          revolut_qr_image_url: string | null
          session_fee_cents: number
          updated_at: string
        }
        Insert: {
          accept_cash?: boolean
          accept_revolut_transfer?: boolean
          changeover_minutes?: number
          club_name?: string
          id?: string
          max_rounds?: number
          organiser_approval_required?: boolean
          organiser_commission_cents?: number
          payment_note?: string | null
          payments_enabled?: boolean
          play_minutes?: number
          revolut_me_url?: string | null
          revolut_qr_image_url?: string | null
          session_fee_cents?: number
          updated_at?: string
        }
        Update: {
          accept_cash?: boolean
          accept_revolut_transfer?: boolean
          changeover_minutes?: number
          club_name?: string
          id?: string
          max_rounds?: number
          organiser_approval_required?: boolean
          organiser_commission_cents?: number
          payment_note?: string | null
          payments_enabled?: boolean
          play_minutes?: number
          revolut_me_url?: string | null
          revolut_qr_image_url?: string | null
          session_fee_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      kq_notification_outbox: {
        Row: {
          attempts: number
          body: string
          created_at: string
          id: string
          kind: string
          provider_message_id: string | null
          recipient_e164: string | null
          recipient_player_id: string | null
          session_id: string | null
          state: string
          unique_key: string
        }
        Insert: {
          attempts?: number
          body?: string
          created_at?: string
          id?: string
          kind: string
          provider_message_id?: string | null
          recipient_e164?: string | null
          recipient_player_id?: string | null
          session_id?: string | null
          state?: string
          unique_key: string
        }
        Update: {
          attempts?: number
          body?: string
          created_at?: string
          id?: string
          kind?: string
          provider_message_id?: string | null
          recipient_e164?: string | null
          recipient_player_id?: string | null
          session_id?: string | null
          state?: string
          unique_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "kq_notification_outbox_recipient_player_id_fkey"
            columns: ["recipient_player_id"]
            isOneToOne: false
            referencedRelation: "kq_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kq_notification_outbox_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "kq_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      kq_payment_records: {
        Row: {
          claimed_at: string | null
          created_at: string
          expected_cents: number
          id: string
          method: string | null
          organiser_note: string | null
          player_id: string
          reference_text: string | null
          session_id: string
          state: string
          verified_at: string | null
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          expected_cents: number
          id?: string
          method?: string | null
          organiser_note?: string | null
          player_id: string
          reference_text?: string | null
          session_id: string
          state?: string
          verified_at?: string | null
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          expected_cents?: number
          id?: string
          method?: string | null
          organiser_note?: string | null
          player_id?: string
          reference_text?: string | null
          session_id?: string
          state?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kq_payment_records_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "kq_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kq_payment_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "kq_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      kq_players: {
        Row: {
          active: boolean
          consent_at: string | null
          created_at: string
          display_name: string
          id: string
          late_cancels_60d: number
          level: number | null
          level_note: string | null
          no_shows_60d: number
          notes: string | null
          opted_out_at: string | null
          reliability_score: number
          sessions_attended: number
          sessions_confirmed: number
          sessions_offered: number
          suspension_until: string | null
          updated_at: string
          waitlist_passes: number
          whatsapp_e164: string
        }
        Insert: {
          active?: boolean
          consent_at?: string | null
          created_at?: string
          display_name: string
          id?: string
          late_cancels_60d?: number
          level?: number | null
          level_note?: string | null
          no_shows_60d?: number
          notes?: string | null
          opted_out_at?: string | null
          reliability_score?: number
          sessions_attended?: number
          sessions_confirmed?: number
          sessions_offered?: number
          suspension_until?: string | null
          updated_at?: string
          waitlist_passes?: number
          whatsapp_e164: string
        }
        Update: {
          active?: boolean
          consent_at?: string | null
          created_at?: string
          display_name?: string
          id?: string
          late_cancels_60d?: number
          level?: number | null
          level_note?: string | null
          no_shows_60d?: number
          notes?: string | null
          opted_out_at?: string | null
          reliability_score?: number
          sessions_attended?: number
          sessions_confirmed?: number
          sessions_offered?: number
          suspension_until?: string | null
          updated_at?: string
          waitlist_passes?: number
          whatsapp_e164?: string
        }
        Relationships: []
      }
      kq_registrations: {
        Row: {
          allocation_score: number | null
          created_at: string
          id: string
          player_id: string
          session_id: string
          state: string
          updated_at: string
          waitlist_order: number | null
        }
        Insert: {
          allocation_score?: number | null
          created_at?: string
          id?: string
          player_id: string
          session_id: string
          state?: string
          updated_at?: string
          waitlist_order?: number | null
        }
        Update: {
          allocation_score?: number | null
          created_at?: string
          id?: string
          player_id?: string
          session_id?: string
          state?: string
          updated_at?: string
          waitlist_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kq_registrations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "kq_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kq_registrations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "kq_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      kq_sessions: {
        Row: {
          base_fee_cents: number | null
          capacity: number
          court_count: number
          created_at: string
          currency: string
          ends_at: string
          id: string
          organiser_commission_cents: number
          payments_enabled: boolean
          registration_closes_at: string
          session_fee_cents: number
          session_format: string
          starts_at: string
          state: string
          title: string
          venue_address: string | null
          venue_name: string | null
        }
        Insert: {
          base_fee_cents?: number | null
          capacity?: number
          court_count?: number
          created_at?: string
          currency?: string
          ends_at: string
          id?: string
          organiser_commission_cents?: number
          payments_enabled?: boolean
          registration_closes_at: string
          session_fee_cents?: number
          session_format?: string
          starts_at: string
          state?: string
          title: string
          venue_address?: string | null
          venue_name?: string | null
        }
        Update: {
          base_fee_cents?: number | null
          capacity?: number
          court_count?: number
          created_at?: string
          currency?: string
          ends_at?: string
          id?: string
          organiser_commission_cents?: number
          payments_enabled?: boolean
          registration_closes_at?: string
          session_fee_cents?: number
          session_format?: string
          starts_at?: string
          state?: string
          title?: string
          venue_address?: string | null
          venue_name?: string | null
        }
        Relationships: []
      }
      kq_whatsapp_events: {
        Row: {
          body: string | null
          created_at: string
          direction: string
          e164: string | null
          id: string
          kind: string
          payload: Json
          provider_message_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          direction: string
          e164?: string | null
          id?: string
          kind: string
          payload?: Json
          provider_message_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          direction?: string
          e164?: string | null
          id?: string
          kind?: string
          payload?: Json
          provider_message_id?: string | null
        }
        Relationships: []
      }
      player_reliability: {
        Row: {
          attended: number
          group_id: string
          no_shows: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attended?: number
          group_id: string
          no_shows?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attended?: number
          group_id?: string
          no_shows?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_reliability_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_reliability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          level: number | null
          onboarding_completed: boolean
          phone_e164: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          level?: number | null
          onboarding_completed?: boolean
          phone_e164?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          level?: number | null
          onboarding_completed?: boolean
          phone_e164?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ps_action_plans: {
        Row: {
          data: Json
          generated_at: string
          project_id: string
        }
        Insert: {
          data: Json
          generated_at?: string
          project_id: string
        }
        Update: {
          data?: Json
          generated_at?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ps_action_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "ps_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ps_analyses: {
        Row: {
          analysed_at: string
          area: string
          brand_id: string
          data: Json
        }
        Insert: {
          analysed_at?: string
          area: string
          brand_id: string
          data: Json
        }
        Update: {
          analysed_at?: string
          area?: string
          brand_id?: string
          data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ps_analyses_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "ps_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      ps_brand_credentials: {
        Row: {
          brand_id: string
          browserbase_context_id: string | null
          email: string | null
          logged_in_at: string | null
          notes: string | null
          password_enc: string | null
          persona_enc: string | null
          totp_secret_enc: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          brand_id: string
          browserbase_context_id?: string | null
          email?: string | null
          logged_in_at?: string | null
          notes?: string | null
          password_enc?: string | null
          persona_enc?: string | null
          totp_secret_enc?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          brand_id?: string
          browserbase_context_id?: string | null
          email?: string | null
          logged_in_at?: string | null
          notes?: string | null
          password_enc?: string | null
          persona_enc?: string | null
          totp_secret_enc?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ps_brand_credentials_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "ps_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      ps_brands: {
        Row: {
          favicon: string
          id: string
          name: string
          position: number
          project_id: string
          role: string
          url: string
        }
        Insert: {
          favicon?: string
          id: string
          name: string
          position?: number
          project_id: string
          role?: string
          url: string
        }
        Update: {
          favicon?: string
          id?: string
          name?: string
          position?: number
          project_id?: string
          role?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ps_brands_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ps_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ps_design: {
        Row: {
          brand_id: string
          data: Json
          fetched_at: string
        }
        Insert: {
          brand_id: string
          data: Json
          fetched_at: string
        }
        Update: {
          brand_id?: string
          data?: Json
          fetched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ps_design_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "ps_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      ps_nav_hints: {
        Row: {
          area: string
          created_at: string
          hint: string
          host: string
          path: string | null
          updated_at: string
        }
        Insert: {
          area: string
          created_at?: string
          hint: string
          host: string
          path?: string | null
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          hint?: string
          host?: string
          path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ps_profiles: {
        Row: {
          company: string | null
          created_at: string
          email_verified_at: string | null
          phone: string | null
          plan: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email_verified_at?: string | null
          phone?: string | null
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email_verified_at?: string | null
          phone?: string | null
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ps_project_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          project_id: string
          role: string
          status: string
          token: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by: string
          project_id: string
          role?: string
          status?: string
          token: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          project_id?: string
          role?: string
          status?: string
          token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ps_project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ps_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ps_projects: {
        Row: {
          analysed_at: string | null
          analysis_mode: string
          created_at: string
          device: string
          id: string
          journeys: Json
          market: string
          name: string
          products: Json
          status: string
          user_id: string | null
        }
        Insert: {
          analysed_at?: string | null
          analysis_mode?: string
          created_at?: string
          device?: string
          id: string
          journeys?: Json
          market?: string
          name: string
          products?: Json
          status?: string
          user_id?: string | null
        }
        Update: {
          analysed_at?: string | null
          analysis_mode?: string
          created_at?: string
          device?: string
          id?: string
          journeys?: Json
          market?: string
          name?: string
          products?: Json
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ps_report_comments: {
        Row: {
          author_name: string
          body: string
          created_at: string
          id: string
          project_id: string
          section_id: string
          user_id: string
        }
        Insert: {
          author_name: string
          body: string
          created_at?: string
          id?: string
          project_id: string
          section_id: string
          user_id: string
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          project_id?: string
          section_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ps_report_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ps_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ps_report_views: {
        Row: {
          email: string
          name: string
          project_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          email?: string
          name?: string
          project_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          email?: string
          name?: string
          project_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ps_report_views_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ps_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ps_run_log: {
        Row: {
          created_at: string
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      ps_score_history: {
        Row: {
          analysed_at: string
          area: string
          brand_id: string
          id: string
          project_id: string
          raw_score: number | null
          score: number
        }
        Insert: {
          analysed_at?: string
          area: string
          brand_id: string
          id?: string
          project_id: string
          raw_score?: number | null
          score: number
        }
        Update: {
          analysed_at?: string
          area?: string
          brand_id?: string
          id?: string
          project_id?: string
          raw_score?: number | null
          score?: number
        }
        Relationships: []
      }
      ps_sessions: {
        Row: {
          brand_id: string
          created_at: string
          data: Json
          id: string
          project_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          data: Json
          id: string
          project_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          data?: Json
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ps_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ps_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ps_showcase_snapshots: {
        Row: {
          brand_id: string | null
          brand_name: string
          brand_slug: string
          brand_url: string
          cx_score: number
          design_score: number | null
          favicon: string
          homepage: boolean
          id: number
          journeys_score: number | null
          market: string
          month: string
          project_id: string | null
          retention_score: number | null
          updated_at: string
          voc_score: number | null
        }
        Insert: {
          brand_id?: string | null
          brand_name: string
          brand_slug: string
          brand_url: string
          cx_score: number
          design_score?: number | null
          favicon?: string
          homepage?: boolean
          id?: number
          journeys_score?: number | null
          market: string
          month: string
          project_id?: string | null
          retention_score?: number | null
          updated_at?: string
          voc_score?: number | null
        }
        Update: {
          brand_id?: string | null
          brand_name?: string
          brand_slug?: string
          brand_url?: string
          cx_score?: number
          design_score?: number | null
          favicon?: string
          homepage?: boolean
          id?: number
          journeys_score?: number | null
          market?: string
          month?: string
          project_id?: string | null
          retention_score?: number | null
          updated_at?: string
          voc_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ps_showcase_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ps_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ps_voc: {
        Row: {
          brand_id: string
          data: Json
          fetched_at: string
          source: string
        }
        Insert: {
          brand_id: string
          data: Json
          fetched_at?: string
          source?: string
        }
        Update: {
          brand_id?: string
          data?: Json
          fetched_at?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "ps_voc_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "ps_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      research_teardown_jobs: {
        Row: {
          id: string
          payload: Json
          updated_at: string
        }
        Insert: {
          id: string
          payload: Json
          updated_at?: string
        }
        Update: {
          id?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      research_workspace: {
        Row: {
          id: string
          projects: Json
          updated_at: string
        }
        Insert: {
          id?: string
          projects?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          projects?: Json
          updated_at?: string
        }
        Relationships: []
      }
      research_workspace_backups: {
        Row: {
          created_at: string
          id: string
          label: string
          projects: Json
        }
        Insert: {
          created_at?: string
          id: string
          label: string
          projects: Json
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          projects?: Json
        }
        Relationships: []
      }
      session_registrations: {
        Row: {
          created_at: string
          id: string
          payment_claimed_at: string | null
          payment_verified_at: string | null
          payment_verified_by: string | null
          session_id: string
          status: Database["public"]["Enums"]["registration_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_claimed_at?: string | null
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          session_id: string
          status?: Database["public"]["Enums"]["registration_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_claimed_at?: string | null
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["registration_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_registrations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_room_members: {
        Row: {
          added_at: string
          session_room_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          session_room_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          session_room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_room_members_session_room_id_fkey"
            columns: ["session_room_id"]
            isOneToOne: false
            referencedRelation: "session_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_room_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_room_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["message_kind"]
          payload: Json
          sender_id: string | null
          session_room_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          payload?: Json
          sender_id?: string | null
          session_room_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          payload?: Json
          sender_id?: string | null
          session_room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_room_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_room_messages_session_room_id_fkey"
            columns: ["session_room_id"]
            isOneToOne: false
            referencedRelation: "session_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      session_rooms: {
        Row: {
          chat_channel_id: string | null
          created_at: string
          id: string
          session_id: string
        }
        Insert: {
          chat_channel_id?: string | null
          created_at?: string
          id?: string
          session_id: string
        }
        Update: {
          chat_channel_id?: string | null
          created_at?: string
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_rooms_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          banner_url: string | null
          courts: number
          created_at: string
          created_by: string
          currency: string
          format: Database["public"]["Enums"]["session_format"]
          group_id: string
          id: string
          max_players: number
          price_cents: number | null
          starts_at: string
          title: string
          venue_label: string | null
        }
        Insert: {
          banner_url?: string | null
          courts?: number
          created_at?: string
          created_by: string
          currency?: string
          format?: Database["public"]["Enums"]["session_format"]
          group_id: string
          id?: string
          max_players?: number
          price_cents?: number | null
          starts_at: string
          title: string
          venue_label?: string | null
        }
        Update: {
          banner_url?: string | null
          courts?: number
          created_at?: string
          created_by?: string
          currency?: string
          format?: Database["public"]["Enums"]["session_format"]
          group_id?: string
          id?: string
          max_players?: number
          price_cents?: number | null
          starts_at?: string
          title?: string
          venue_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          bookings_created: number | null
          cancellations_created: number | null
          client_id: string
          created_at: string
          elevenlabs_agent_id: string | null
          elevenlabs_minutes: number | null
          elevenlabs_synced_at: string | null
          emails_sent: number | null
          failed_workflows: number | null
          id: string
          included_minutes: number | null
          month: string
          overage_cost: number | null
          overage_minutes: number | null
          sms_sent: number | null
        }
        Insert: {
          bookings_created?: number | null
          cancellations_created?: number | null
          client_id: string
          created_at?: string
          elevenlabs_agent_id?: string | null
          elevenlabs_minutes?: number | null
          elevenlabs_synced_at?: string | null
          emails_sent?: number | null
          failed_workflows?: number | null
          id?: string
          included_minutes?: number | null
          month: string
          overage_cost?: number | null
          overage_minutes?: number | null
          sms_sent?: number | null
        }
        Update: {
          bookings_created?: number | null
          cancellations_created?: number | null
          client_id?: string
          created_at?: string
          elevenlabs_agent_id?: string | null
          elevenlabs_minutes?: number | null
          elevenlabs_synced_at?: string | null
          emails_sent?: number | null
          failed_workflows?: number | null
          id?: string
          included_minutes?: number | null
          month?: string
          overage_cost?: number | null
          overage_minutes?: number | null
          sms_sent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      voc_case_studies: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_published: boolean
          placements: string[]
          report_id: string
          sort_order: number
          tags: string[]
          title: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_published?: boolean
          placements?: string[]
          report_id: string
          sort_order?: number
          tags?: string[]
          title?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_published?: boolean
          placements?: string[]
          report_id?: string
          sort_order?: number
          tags?: string[]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voc_case_studies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voc_case_studies_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "voc_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      voc_reports: {
        Row: {
          business_id: string
          created_at: string
          error_message: string | null
          generated_at: string | null
          id: string
          period: string
          public_slug: string
          report_data: Json | null
          review_count: number
          scraped_reviews: Json | null
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          error_message?: string | null
          generated_at?: string | null
          id?: string
          period: string
          public_slug: string
          report_data?: Json | null
          review_count?: number
          scraped_reviews?: Json | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          error_message?: string | null
          generated_at?: string | null
          id?: string
          period?: string
          public_slug?: string
          report_data?: Json | null
          review_count?: number
          scraped_reviews?: Json | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voc_reports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_health: {
        Row: {
          client_id: string
          created_at: string
          error_message: string | null
          health_status: string | null
          id: string
          last_run: string | null
          status: string | null
          updated_at: string
          workflow_name: string
          workflow_type: string | null
          workflow_url: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          error_message?: string | null
          health_status?: string | null
          id?: string
          last_run?: string | null
          status?: string | null
          updated_at?: string
          workflow_name: string
          workflow_type?: string | null
          workflow_url?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          error_message?: string | null
          health_status?: string | null
          id?: string
          last_run?: string | null
          status?: string | null
          updated_at?: string
          workflow_name?: string
          workflow_type?: string | null
          workflow_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_health_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_group_member: { Args: { p_group_id: string }; Returns: boolean }
      is_group_organiser: { Args: { p_group_id: string }; Returns: boolean }
      is_session_room_member: { Args: { p_room_id: string }; Returns: boolean }
      scuup_admin_usage: { Args: never; Returns: Json }
      slugify: { Args: { input: string }; Returns: string }
    }
    Enums: {
      group_role: "owner" | "admin" | "organiser" | "member"
      group_visibility: "public" | "approval" | "private"
      message_kind: "text" | "system" | "mixin_card" | "image" | "video" | "wrap_card" | "accept_notice"
      registration_status: "registered" | "waitlist" | "selected" | "payment_claimed" | "paid" | "cancelled" | "no_show"
      report_status: "pending" | "scraping" | "analyzing" | "ready" | "failed"
      review_source: "google" | "tripadvisor" | "trustpilot"
      session_format: "kings_and_queens" | "americano" | "mexicano" | "tournament_by_wins" | "custom"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      group_role: ["owner", "admin", "organiser", "member"],
      group_visibility: ["public", "approval", "private"],
      message_kind: ["text", "system", "mixin_card", "image", "video", "wrap_card", "accept_notice"],
      registration_status: ["registered", "waitlist", "selected", "payment_claimed", "paid", "cancelled", "no_show"],
      report_status: ["pending", "scraping", "analyzing", "ready", "failed"],
      review_source: ["google", "tripadvisor", "trustpilot"],
      session_format: ["kings_and_queens", "americano", "mexicano", "tournament_by_wins", "custom"],
    },
  },
} as const
