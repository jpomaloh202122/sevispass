import { supabaseAdmin } from './supabase'

// Create a Supabase-based database interface that mimics Prisma
export const db = {
  user: {
    async create(data: { data: any }) {
      const { data: result, error } = await supabaseAdmin
        .from('users')
        .insert(data.data)
        .select()
        .single()
      
      if (error) throw new Error(error.message)
      return result
    },

    async findUnique(query: { where: any; select?: any }) {
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

    async findFirst(query: { where: any; select?: any }) {
      let supabaseQuery = supabaseAdmin.from('users').select('*')
      
      if (query.select) {
        const fields = Object.keys(query.select).join(',')
        supabaseQuery = supabaseAdmin.from('users').select(fields)
      }

      // Handle different where conditions
      if (query.where.OR) {
        // Handle OR queries by using the 'or' method
        const orConditions = query.where.OR.map((condition: any) => {
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

    async update(query: { where: any; data: any }) {
      let supabaseQuery = supabaseAdmin.from('users').update(query.data)

      // Handle different where conditions
      Object.entries(query.where).forEach(([key, value]) => {
        supabaseQuery = supabaseQuery.eq(key, value)
      })

      const { data, error } = await supabaseQuery.select().single()
      
      if (error) throw new Error(error.message)
      return data
    },

    async delete(query: { where: any }) {
      let supabaseQuery = supabaseAdmin.from('users').delete()

      // Handle different where conditions
      Object.entries(query.where).forEach(([key, value]) => {
        supabaseQuery = supabaseQuery.eq(key, value)
      })

      const { data, error } = await supabaseQuery.select().single()
      
      if (error) throw new Error(error.message)
      return data
    },

    async deleteMany(query?: { where?: any }) {
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
  }
}