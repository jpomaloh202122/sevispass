import { supabaseAdmin, type Database } from './supabase'

type UserInsert = Database['public']['Tables']['users']['Insert']
type WhereClause = Record<string, unknown>
type SelectClause = Record<string, boolean>

// Create a Supabase-based database interface that mimics Prisma
export const db = {
  user: {
    async create(data: { data: UserInsert }) {
      const { data: result, error } = await supabaseAdmin
        .from('users')
        .insert(data.data)
        .select()
        .single()
      
      if (error) throw new Error(error.message)
      return result
    },

    async findUnique(query: { where: WhereClause; select?: SelectClause }) {
      let supabaseQuery = supabaseAdmin.from('users').select('*')
      
      if (query.select) {
        const fields = Object.keys(query.select).join(',')
        supabaseQuery = supabaseAdmin.from('users').select(fields)
      }

      // Handle different where conditions
      Object.entries(query.where).forEach(([key, value]) => {
        supabaseQuery = supabaseQuery.eq(key, value)
      })

      const { data, error } = await supabaseQuery.single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw new Error(error.message)
      }
      
      return data
    },

    async findFirst(query: { where: WhereClause; select?: SelectClause }) {
      let supabaseQuery = supabaseAdmin.from('users').select('*')
      
      if (query.select) {
        const fields = Object.keys(query.select).join(',')
        supabaseQuery = supabaseAdmin.from('users').select(fields)
      }

      // Handle different where conditions
      if (query.where.OR) {
        // Handle OR queries by using the 'or' method
        const orConditions = (query.where.OR as WhereClause[]).map((condition: WhereClause) => {
          const key = Object.keys(condition)[0]
          const value = condition[key]
          return `${key}.eq.${value}`
        }).join(',')
        
        supabaseQuery = supabaseQuery.or(orConditions)
      } else {
        // Handle regular AND conditions
        Object.entries(query.where).forEach(([key, value]) => {
          supabaseQuery = supabaseQuery.eq(key, value)
        })
      }

      const { data, error } = await supabaseQuery.limit(1)
      
      if (error) throw new Error(error.message)
      
      return data?.[0] || null
    },

    async update(query: { where: WhereClause; data: Partial<UserInsert> }) {
      let supabaseQuery = supabaseAdmin.from('users').update(query.data)

      // Handle different where conditions
      Object.entries(query.where).forEach(([key, value]) => {
        supabaseQuery = supabaseQuery.eq(key, value)
      })

      const { data, error } = await supabaseQuery.select().single()
      
      if (error) throw new Error(error.message)
      return data
    },

    async delete(query: { where: WhereClause }) {
      let supabaseQuery = supabaseAdmin.from('users').delete()

      // Handle different where conditions
      Object.entries(query.where).forEach(([key, value]) => {
        supabaseQuery = supabaseQuery.eq(key, value)
      })

      const { data, error } = await supabaseQuery.select().single()
      
      if (error) throw new Error(error.message)
      return data
    },

    async deleteMany(query?: { where?: WhereClause }) {
      let supabaseQuery = supabaseAdmin.from('users').delete()

      if (query?.where) {
        Object.entries(query.where).forEach(([key, value]) => {
          supabaseQuery = supabaseQuery.eq(key, value)
        })
      }

      const { data, error } = await supabaseQuery.select()
      
      if (error) throw new Error(error.message)
      return { count: data?.length || 0 }
    }
  },

  // Biometric Locations
  biometricLocation: {
    async findMany(query?: { where?: WhereClause; select?: SelectClause }) {
      let supabaseQuery = supabaseAdmin.from('biometric_locations').select('*')
      
      if (query?.select) {
        const fields = Object.keys(query.select).join(',')
        supabaseQuery = supabaseAdmin.from('biometric_locations').select(fields)
      }

      if (query?.where) {
        Object.entries(query.where).forEach(([key, value]) => {
          supabaseQuery = supabaseQuery.eq(key, value)
        })
      }

      const { data, error } = await supabaseQuery
      
      if (error) throw new Error(error.message)
      return data || []
    }
  },

  // Appointment Time Slots
  appointmentTimeSlot: {
    async findMany(query: { where: WhereClause; orderBy?: Record<string, string> }) {
      let supabaseQuery = supabaseAdmin.from('appointment_time_slots').select('*')

      Object.entries(query.where).forEach(([key, value]) => {
        supabaseQuery = supabaseQuery.eq(key, value)
      })

      if (query.orderBy) {
        Object.entries(query.orderBy).forEach(([key, direction]) => {
          supabaseQuery = supabaseQuery.order(key, { ascending: direction === 'asc' })
        })
      }

      const { data, error } = await supabaseQuery
      
      if (error) throw new Error(error.message)
      return data || []
    },

    async findFirst(query: { where: WhereClause }) {
      let supabaseQuery = supabaseAdmin.from('appointment_time_slots').select('*')

      Object.entries(query.where).forEach(([key, value]) => {
        supabaseQuery = supabaseQuery.eq(key, value)
      })

      const { data, error } = await supabaseQuery.limit(1)
      
      if (error) throw new Error(error.message)
      return data?.[0] || null
    }
  },

  // Biometric Appointments
  biometricAppointment: {
    async create(data: { data: any; include?: any }) {
      const { data: result, error } = await supabaseAdmin
        .from('biometric_appointments')
        .insert(data.data)
        .select()
        .single()
      
      if (error) throw new Error(error.message)

      // If include is specified, fetch related data
      if (data.include?.location) {
        const { data: locationData, error: locationError } = await supabaseAdmin
          .from('biometric_locations')
          .select('name, address, phone, operating_hours as operatingHours')
          .eq('id', result.location_id)
          .single()

        if (locationError) throw new Error(locationError.message)
        result.location = locationData
      }

      return result
    },

    async findUnique(query: { where: WhereClause; include?: any }) {
      let supabaseQuery = supabaseAdmin.from('biometric_appointments').select('*')

      Object.entries(query.where).forEach(([key, value]) => {
        supabaseQuery = supabaseQuery.eq(key, value)
      })

      const { data, error } = await supabaseQuery.single()
      
      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message)
      }

      if (!data) return null

      // If include is specified, fetch related data
      if (query.include?.location && data) {
        const { data: locationData, error: locationError } = await supabaseAdmin
          .from('biometric_locations')
          .select('name, address, phone, operating_hours as operatingHours, electorate')
          .eq('id', data.location_id)
          .single()

        if (locationError) throw new Error(locationError.message)
        data.location = locationData
      }
      
      return data
    },

    async findMany(query: { where: WhereClause; select?: any }) {
      let supabaseQuery = supabaseAdmin.from('biometric_appointments')

      if (query.select?.appointmentTime) {
        supabaseQuery = supabaseQuery.select('appointment_time')
      } else {
        supabaseQuery = supabaseQuery.select('*')
      }

      Object.entries(query.where).forEach(([key, value]) => {
        if (key === 'status' && typeof value === 'object' && 'in' in value) {
          // Handle 'in' queries
          supabaseQuery = supabaseQuery.in('status', value.in)
        } else {
          supabaseQuery = supabaseQuery.eq(key, value)
        }
      })

      const { data, error } = await supabaseQuery
      
      if (error) throw new Error(error.message)
      return data || []
    },

    async count(query: { where: WhereClause }) {
      let supabaseQuery = supabaseAdmin.from('biometric_appointments').select('*', { count: 'exact', head: true })

      Object.entries(query.where).forEach(([key, value]) => {
        supabaseQuery = supabaseQuery.eq(key, value)
      })

      const { count, error } = await supabaseQuery
      
      if (error) throw new Error(error.message)
      return count || 0
    },

    async update(query: { where: WhereClause; data: any }) {
      let supabaseQuery = supabaseAdmin.from('biometric_appointments').update(query.data)

      Object.entries(query.where).forEach(([key, value]) => {
        supabaseQuery = supabaseQuery.eq(key, value)
      })

      const { data, error } = await supabaseQuery.select().single()
      
      if (error) throw new Error(error.message)
      return data
    }
  }
}