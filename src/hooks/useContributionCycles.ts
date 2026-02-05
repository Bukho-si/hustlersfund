 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useToast } from '@/hooks/use-toast';
 
 export interface ContributionCycle {
   id: string;
   week_start_date: string;
   week_end_date: string;
   deadline: string;
   closes_on: string;
   is_closed: boolean;
   created_at: string;
 }
 
 export interface CycleFormData {
   week_start_date: string;
   week_end_date: string;
   deadline: string;
   closes_on: string;
 }
 
 export function useContributionCycles() {
   return useQuery({
     queryKey: ['contribution-cycles'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('contribution_cycles')
         .select('*')
         .order('week_start_date', { ascending: false });
 
       if (error) throw error;
       return data as ContributionCycle[];
     },
   });
 }
 
 export function useCurrentCycle() {
   return useQuery({
     queryKey: ['current-contribution-cycle'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('contribution_cycles')
         .select('*')
         .eq('is_closed', false)
         .order('week_start_date', { ascending: false })
         .limit(1)
         .maybeSingle();
 
       if (error) throw error;
       return data as ContributionCycle | null;
     },
   });
 }
 
 export function useCreateCycle() {
   const queryClient = useQueryClient();
   const { toast } = useToast();
 
   return useMutation({
     mutationFn: async (cycle: CycleFormData) => {
       const { data, error } = await supabase
         .from('contribution_cycles')
         .insert([cycle])
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['contribution-cycles'] });
       queryClient.invalidateQueries({ queryKey: ['current-contribution-cycle'] });
       toast({
         title: 'Cycle Created',
         description: 'New contribution cycle has been created.',
       });
     },
     onError: (error) => {
       toast({
         title: 'Error',
         description: 'Failed to create cycle. Please try again.',
         variant: 'destructive',
       });
       console.error('Create cycle error:', error);
     },
   });
 }
 
 export function useUpdateCycle() {
   const queryClient = useQueryClient();
   const { toast } = useToast();
 
   return useMutation({
     mutationFn: async ({ id, updates }: { id: string; updates: Partial<CycleFormData & { is_closed: boolean }> }) => {
       const { data, error } = await supabase
         .from('contribution_cycles')
         .update(updates)
         .eq('id', id)
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['contribution-cycles'] });
       queryClient.invalidateQueries({ queryKey: ['current-contribution-cycle'] });
       toast({
         title: 'Cycle Updated',
         description: 'Contribution cycle has been updated.',
       });
     },
     onError: (error) => {
       toast({
         title: 'Error',
         description: 'Failed to update cycle. Please try again.',
         variant: 'destructive',
       });
       console.error('Update cycle error:', error);
     },
   });
 }