 import { useEffect } from 'react';
 import { useForm } from 'react-hook-form';
 import { zodResolver } from '@hookform/resolvers/zod';
 import { z } from 'zod';
 import { format, addDays, setHours, setMinutes } from 'date-fns';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import {
   Form,
   FormControl,
   FormField,
   FormItem,
   FormLabel,
   FormMessage,
 } from '@/components/ui/form';
 import { Input } from '@/components/ui/input';
 import { Button } from '@/components/ui/button';
 import { Calendar } from 'lucide-react';
 import type { CycleFormData } from '@/hooks/useContributionCycles';
 
 const cycleSchema = z.object({
   week_start_date: z.string().min(1, 'Start date is required'),
   week_end_date: z.string().min(1, 'End date is required'),
   deadline: z.string().min(1, 'Deadline is required'),
   closes_on: z.string().min(1, 'Close date is required'),
 });
 
 interface CycleFormDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onSubmit: (data: CycleFormData) => void;
   isLoading: boolean;
   defaultValues?: CycleFormData;
   isEditing?: boolean;
 }
 
 export function CycleFormDialog({
   open,
   onOpenChange,
   onSubmit,
   isLoading,
   defaultValues,
   isEditing = false,
 }: CycleFormDialogProps) {
   const form = useForm<CycleFormData>({
     resolver: zodResolver(cycleSchema),
     defaultValues: defaultValues || {
       week_start_date: '',
       week_end_date: '',
       deadline: '',
       closes_on: '',
     },
   });
 
   // Reset form when dialog opens/closes or defaultValues change
   useEffect(() => {
     if (open) {
       if (defaultValues) {
         form.reset({
           week_start_date: defaultValues.week_start_date,
           week_end_date: defaultValues.week_end_date,
           deadline: defaultValues.deadline.slice(0, 16), // Format for datetime-local
           closes_on: defaultValues.closes_on.slice(0, 16),
         });
       } else {
         form.reset({
           week_start_date: '',
           week_end_date: '',
           deadline: '',
           closes_on: '',
         });
       }
     }
   }, [open, defaultValues, form]);
 
   // Auto-fill related dates when start date changes (only for new cycles)
   const watchStartDate = form.watch('week_start_date');
   useEffect(() => {
     if (watchStartDate && !isEditing) {
       const startDate = new Date(watchStartDate);
       
       // End date = start + 6 days (Sunday to Saturday week)
       const endDate = addDays(startDate, 6);
       form.setValue('week_end_date', format(endDate, 'yyyy-MM-dd'));
       
       // Deadline = Wednesday 23:59 (start + 3 days for Mon start, or next Wed)
       const deadline = setMinutes(setHours(addDays(startDate, 3), 23), 59);
       form.setValue('deadline', format(deadline, "yyyy-MM-dd'T'HH:mm"));
       
       // Closes on = Tuesday next week (start + 8 days)
       const closesOn = setMinutes(setHours(addDays(startDate, 8), 23), 59);
       form.setValue('closes_on', format(closesOn, "yyyy-MM-dd'T'HH:mm"));
     }
   }, [watchStartDate, isEditing, form]);
 
   const handleSubmit = (data: CycleFormData) => {
     onSubmit({
       week_start_date: data.week_start_date,
       week_end_date: data.week_end_date,
       deadline: new Date(data.deadline).toISOString(),
       closes_on: new Date(data.closes_on).toISOString(),
     });
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-md">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <Calendar className="h-5 w-5 text-primary" />
             {isEditing ? 'Edit Cycle' : 'Create New Cycle'}
           </DialogTitle>
         </DialogHeader>
 
         <Form {...form}>
           <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
             <div className="grid grid-cols-2 gap-3">
               <FormField
                 control={form.control}
                 name="week_start_date"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Week Start</FormLabel>
                     <FormControl>
                       <Input type="date" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
               <FormField
                 control={form.control}
                 name="week_end_date"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Week End</FormLabel>
                     <FormControl>
                       <Input type="date" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
             </div>
 
             <FormField
               control={form.control}
               name="deadline"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Payment Deadline</FormLabel>
                   <FormControl>
                     <Input type="datetime-local" {...field} />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
 
             <FormField
               control={form.control}
               name="closes_on"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Cycle Closes On</FormLabel>
                   <FormControl>
                     <Input type="datetime-local" {...field} />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
 
             <div className="flex gap-2 pt-2">
               <Button
                 type="button"
                 variant="outline"
                 className="flex-1"
                 onClick={() => onOpenChange(false)}
               >
                 Cancel
               </Button>
               <Button type="submit" className="flex-1" disabled={isLoading}>
                 {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
               </Button>
             </div>
           </form>
         </Form>
       </DialogContent>
     </Dialog>
   );
 }