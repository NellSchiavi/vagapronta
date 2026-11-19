
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "ai_usage": {
                  Row: {
                    "by_feature": NonNullable<Json>,"calls": number,"created_at": string,"day": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "by_feature"?: NonNullable<Json>,"calls"?: number,"created_at"?: string,"day"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "by_feature"?: NonNullable<Json>,"calls"?: number,"created_at"?: string,"day"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"applications": {
                  Row: {
                    "applied_on": string | null,"company": string,"cover_letter_id": string | null,"created_at": string,"follow_up_on": string | null,"id": string,"job_id": string | null,"notes": string | null,"position": number,"resume_id": string | null,"role": string,"status": string,"updated_at": string,"url": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "applied_on"?: string | null,"company": string,"cover_letter_id"?: string | null,"created_at"?: string,"follow_up_on"?: string | null,"id"?: string,"job_id"?: string | null,"notes"?: string | null,"position"?: number,"resume_id"?: string | null,"role": string,"status"?: string,"updated_at"?: string,"url"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "applied_on"?: string | null,"company"?: string,"cover_letter_id"?: string | null,"created_at"?: string,"follow_up_on"?: string | null,"id"?: string,"job_id"?: string | null,"notes"?: string | null,"position"?: number,"resume_id"?: string | null,"role"?: string,"status"?: string,"updated_at"?: string,"url"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "applications_job_fk"
      columns: ["job_id","user_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "applications_letter_fk"
      columns: ["cover_letter_id","user_id"]
isOneToOne: false
      referencedRelation: "cover_letters"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "applications_resume_fk"
      columns: ["resume_id","user_id"]
isOneToOne: false
      referencedRelation: "resumes"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"cover_letters": {
                  Row: {
                    "content": string,"created_at": string,"id": string,"job_id": string | null,"resume_id": string | null,"title": string,"tone": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content"?: string,"created_at"?: string,"id"?: string,"job_id"?: string | null,"resume_id"?: string | null,"title"?: string,"tone"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"id"?: string,"job_id"?: string | null,"resume_id"?: string | null,"title"?: string,"tone"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cover_letters_job_fk"
      columns: ["job_id","user_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "cover_letters_resume_fk"
      columns: ["resume_id","user_id"]
isOneToOne: false
      referencedRelation: "resumes"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"job_destinations": {
                  Row: {
                    "country_code": string,"created_at": string,"priority": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "country_code": string,"created_at"?: string,"priority": number,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "country_code"?: string,"created_at"?: string,"priority"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"job_preferences": {
                  Row: {
                    "areas": (string)[],"blocked_companies": (string)[],"cities": (string)[],"contract_types": (string)[],"created_at": string,"desired_roles": (string)[],"keywords_exclude": (string)[],"keywords_include": (string)[],"languages": NonNullable<Json>,"open_to_relocate": boolean,"salary_currency": string,"salary_max": number | null,"salary_min": number | null,"seniority": (string)[],"suggestions": NonNullable<Json>,"updated_at": string,"user_id": string,"work_modes": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "areas"?: (string)[],"blocked_companies"?: (string)[],"cities"?: (string)[],"contract_types"?: (string)[],"created_at"?: string,"desired_roles"?: (string)[],"keywords_exclude"?: (string)[],"keywords_include"?: (string)[],"languages"?: NonNullable<Json>,"open_to_relocate"?: boolean,"salary_currency"?: string,"salary_max"?: number | null,"salary_min"?: number | null,"seniority"?: (string)[],"suggestions"?: NonNullable<Json>,"updated_at"?: string,"user_id"?: string,"work_modes"?: (string)[]
                  }
                  Update: {
                    "areas"?: (string)[],"blocked_companies"?: (string)[],"cities"?: (string)[],"contract_types"?: (string)[],"created_at"?: string,"desired_roles"?: (string)[],"keywords_exclude"?: (string)[],"keywords_include"?: (string)[],"languages"?: NonNullable<Json>,"open_to_relocate"?: boolean,"salary_currency"?: string,"salary_max"?: number | null,"salary_min"?: number | null,"seniority"?: (string)[],"suggestions"?: NonNullable<Json>,"updated_at"?: string,"user_id"?: string,"work_modes"?: (string)[]
                  }
                  Relationships: [
                    
                  ]
                },"job_search_runs": {
                  Row: {
                    "created_at": string,"found": number,"id": string,"inserted": number,"mode": string,"sources": NonNullable<Json>,"trigger": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"found"?: number,"id"?: string,"inserted"?: number,"mode"?: string,"sources"?: NonNullable<Json>,"trigger": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"found"?: number,"id"?: string,"inserted"?: number,"mode"?: string,"sources"?: NonNullable<Json>,"trigger"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"jobs": {
                  Row: {
                    "company": string | null,"compatibility": number | null,"country": string | null,"created_at": string,"description": string | null,"destination": string | null,"external_id": string | null,"id": string,"language_required": string | null,"location": string | null,"match_notes": NonNullable<Json>,"published_at": string | null,"remote_from_brazil": boolean | null,"salary": string | null,"source": string,"source_url": string | null,"status": string,"title": string,"updated_at": string,"url": string | null,"user_id": string,"visa_sponsorship": boolean | null,"work_mode": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "company"?: string | null,"compatibility"?: number | null,"country"?: string | null,"created_at"?: string,"description"?: string | null,"destination"?: string | null,"external_id"?: string | null,"id"?: string,"language_required"?: string | null,"location"?: string | null,"match_notes"?: NonNullable<Json>,"published_at"?: string | null,"remote_from_brazil"?: boolean | null,"salary"?: string | null,"source"?: string,"source_url"?: string | null,"status"?: string,"title": string,"updated_at"?: string,"url"?: string | null,"user_id"?: string,"visa_sponsorship"?: boolean | null,"work_mode"?: string | null
                  }
                  Update: {
                    "company"?: string | null,"compatibility"?: number | null,"country"?: string | null,"created_at"?: string,"description"?: string | null,"destination"?: string | null,"external_id"?: string | null,"id"?: string,"language_required"?: string | null,"location"?: string | null,"match_notes"?: NonNullable<Json>,"published_at"?: string | null,"remote_from_brazil"?: boolean | null,"salary"?: string | null,"source"?: string,"source_url"?: string | null,"status"?: string,"title"?: string,"updated_at"?: string,"url"?: string | null,"user_id"?: string,"visa_sponsorship"?: boolean | null,"work_mode"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"avatar_source": string | null,"avatar_url": string | null,"career_stage": string | null,"certifications": NonNullable<Json>,"city": string | null,"contact_email": string | null,"created_at": string,"desired_role": string | null,"email": string | null,"full_name": string | null,"linkedin_url": string | null,"links": NonNullable<Json>,"notify_daily_jobs": boolean,"notify_follow_up": boolean,"onboarded_at": string | null,"phone": string | null,"preferences": NonNullable<Json>,"registry_council": string | null,"registry_number": string | null,"registry_region": string | null,"residence_country": string,"resume_country": string,"specializations": (string)[],"study_course": string | null,"study_expected_end": string | null,"study_institution": string | null,"study_period": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"avatar_source"?: string | null,"avatar_url"?: string | null,"career_stage"?: string | null,"certifications"?: NonNullable<Json>,"city"?: string | null,"contact_email"?: string | null,"created_at"?: string,"desired_role"?: string | null,"email"?: string | null,"full_name"?: string | null,"linkedin_url"?: string | null,"links"?: NonNullable<Json>,"notify_daily_jobs"?: boolean,"notify_follow_up"?: boolean,"onboarded_at"?: string | null,"phone"?: string | null,"preferences"?: NonNullable<Json>,"registry_council"?: string | null,"registry_number"?: string | null,"registry_region"?: string | null,"residence_country"?: string,"resume_country"?: string,"specializations"?: (string)[],"study_course"?: string | null,"study_expected_end"?: string | null,"study_institution"?: string | null,"study_period"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "avatar_path"?: string | null,"avatar_source"?: string | null,"avatar_url"?: string | null,"career_stage"?: string | null,"certifications"?: NonNullable<Json>,"city"?: string | null,"contact_email"?: string | null,"created_at"?: string,"desired_role"?: string | null,"email"?: string | null,"full_name"?: string | null,"linkedin_url"?: string | null,"links"?: NonNullable<Json>,"notify_daily_jobs"?: boolean,"notify_follow_up"?: boolean,"onboarded_at"?: string | null,"phone"?: string | null,"preferences"?: NonNullable<Json>,"registry_council"?: string | null,"registry_number"?: string | null,"registry_region"?: string | null,"residence_country"?: string,"resume_country"?: string,"specializations"?: (string)[],"study_course"?: string | null,"study_expected_end"?: string | null,"study_institution"?: string | null,"study_period"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"resume_analyses": {
                  Row: {
                    "created_at": string,"id": string,"overall_score": number,"resume_id": string,"scores": NonNullable<Json>,"suggestions": NonNullable<Json>,"summary": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"overall_score": number,"resume_id": string,"scores"?: NonNullable<Json>,"suggestions"?: NonNullable<Json>,"summary"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"overall_score"?: number,"resume_id"?: string,"scores"?: NonNullable<Json>,"suggestions"?: NonNullable<Json>,"summary"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "resume_analyses_resume_fk"
      columns: ["resume_id","user_id"]
isOneToOne: false
      referencedRelation: "resumes"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"resumes": {
                  Row: {
                    "content": NonNullable<Json>,"country": string,"created_at": string,"file_path": string | null,"id": string,"is_principal": boolean,"job_id": string | null,"source": string,"template": string,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content"?: NonNullable<Json>,"country"?: string,"created_at"?: string,"file_path"?: string | null,"id"?: string,"is_principal"?: boolean,"job_id"?: string | null,"source"?: string,"template"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "content"?: NonNullable<Json>,"country"?: string,"created_at"?: string,"file_path"?: string | null,"id"?: string,"is_principal"?: boolean,"job_id"?: string | null,"source"?: string,"template"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "resumes_job_fk"
      columns: ["job_id","user_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"source_cache": {
                  Row: {
                    "fetched_at": string,"jobs": NonNullable<Json>,"key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "fetched_at"?: string,"jobs"?: NonNullable<Json>,"key": string
                  }
                  Update: {
                    "fetched_at"?: string,"jobs"?: NonNullable<Json>,"key"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "consume_ai_quota":
{ Args: { "p_daily_limit"?: number,"p_feature": string }; Returns: {
              "allowed": boolean,"daily_limit": number,"used": number
            }[]
                           },
"set_job_destinations":
{ Args: { "p_codes": (string)[] }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
