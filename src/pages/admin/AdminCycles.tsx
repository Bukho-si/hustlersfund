 import { useState } from 'react';
 import { AppLayout } from '@/components/layout/AppLayout';
 import { PageHeader } from '@/components/layout/PageHeader';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { 
   useContributionCycles, 
   useCreateCycle, 
   useUpdateCycle,
   type ContributionCycle,
   type CycleFormData 
 } from '@/hooks/useContributionCycles';
 import { CycleFormDialog } from '@/components/cycles/CycleFormDialog';
 import { format } from 'date-fns';
 import { Plus, Calendar, Clock, CheckCircle, XCircle, Edit2 } from 'lucide-react';
 import { Skeleton } from '@/components/ui/skeleton';
 
 export default function AdminCycles() {
   const { data: cycles, isLoading } = useContributionCycles();
   const createCycle = useCreateCycle();
   const updateCycle = useUpdateCycle();
   
   const [dialogOpen, setDialogOpen] = useState(false);
   const [editingCycle, setEditingCycle] = useState<ContributionCycle | null>(null);
 
   const handleCreate = (data: CycleFormData) => {
     createCycle.mutate(data, {
       onSuccess: () => setDialogOpen(false),
     });
   };
 
   const handleUpdate = (data: CycleFormData) => {
     if (!editingCycle) return;
     updateCycle.mutate(
       { id: editingCycle.id, updates: data },
       { onSuccess: () => setEditingCycle(null) }
     );
   };
 
   const handleToggleClosed = (cycle: ContributionCycle) => {
     updateCycle.mutate({
       id: cycle.id,
       updates: { is_closed: !cycle.is_closed },
     });
   };
 
   const openEditDialog = (cycle: ContributionCycle) => {
     setEditingCycle(cycle);
   };
 
   return (
     <AppLayout requireAdmin>
       <PageHeader
         title="Contribution Cycles"
         subtitle="Manage weekly payment cycles"
         action={
           <Button size="sm" onClick={() => setDialogOpen(true)}>
             <Plus className="h-4 w-4 mr-1" />
             New Cycle
           </Button>
         }
       />
 
       {isLoading ? (
         <div className="space-y-3">
           {[1, 2, 3].map((i) => (
             <Card key={i}>
               <CardContent className="p-4">
                 <Skeleton className="h-20 w-full" />
               </CardContent>
             </Card>
           ))}
         </div>
       ) : cycles?.length === 0 ? (
         <Card>
           <CardContent className="p-8 text-center">
             <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
             <h3 className="font-medium mb-1">No Cycles Yet</h3>
             <p className="text-sm text-muted-foreground mb-4">
               Create your first contribution cycle to start accepting payments.
             </p>
             <Button onClick={() => setDialogOpen(true)}>
               <Plus className="h-4 w-4 mr-1" />
               Create First Cycle
             </Button>
           </CardContent>
         </Card>
       ) : (
         <div className="space-y-3">
           {cycles?.map((cycle) => (
             <Card 
               key={cycle.id} 
               className={cycle.is_closed ? 'opacity-60' : ''}
             >
               <CardHeader className="pb-2">
                 <div className="flex items-center justify-between">
                   <CardTitle className="text-base flex items-center gap-2">
                     <Calendar className="h-4 w-4 text-primary" />
                     Week of {format(new Date(cycle.week_start_date), 'MMM d, yyyy')}
                   </CardTitle>
                   <Badge variant={cycle.is_closed ? 'secondary' : 'default'}>
                     {cycle.is_closed ? 'Closed' : 'Active'}
                   </Badge>
                 </div>
               </CardHeader>
               <CardContent className="pt-0">
                 <div className="grid grid-cols-2 gap-3 mb-4">
                   <div className="bg-muted/50 rounded-lg p-3">
                     <p className="text-xs text-muted-foreground mb-1">Period</p>
                     <p className="text-sm font-medium">
                       {format(new Date(cycle.week_start_date), 'MMM d')} – {format(new Date(cycle.week_end_date), 'MMM d')}
                     </p>
                   </div>
                   <div className="bg-warning/10 rounded-lg p-3">
                     <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                       <Clock className="h-3 w-3" />
                       Deadline
                     </p>
                     <p className="text-sm font-medium">
                       {format(new Date(cycle.deadline), 'EEE, MMM d HH:mm')}
                     </p>
                   </div>
                 </div>
                 <div className="flex gap-2">
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => openEditDialog(cycle)}
                   >
                     <Edit2 className="h-3 w-3 mr-1" />
                     Edit
                   </Button>
                   <Button
                     variant={cycle.is_closed ? 'default' : 'secondary'}
                     size="sm"
                     onClick={() => handleToggleClosed(cycle)}
                     disabled={updateCycle.isPending}
                   >
                     {cycle.is_closed ? (
                       <>
                         <CheckCircle className="h-3 w-3 mr-1" />
                         Reopen
                       </>
                     ) : (
                       <>
                         <XCircle className="h-3 w-3 mr-1" />
                         Close
                       </>
                     )}
                   </Button>
                 </div>
               </CardContent>
             </Card>
           ))}
         </div>
       )}
 
       {/* Create Dialog */}
       <CycleFormDialog
         open={dialogOpen}
         onOpenChange={setDialogOpen}
         onSubmit={handleCreate}
         isLoading={createCycle.isPending}
       />
 
       {/* Edit Dialog */}
       <CycleFormDialog
         open={!!editingCycle}
         onOpenChange={(open) => !open && setEditingCycle(null)}
         onSubmit={handleUpdate}
         isLoading={updateCycle.isPending}
         defaultValues={editingCycle ? {
          week_start_date: editingCycle.week_start_date,
           week_end_date: editingCycle.week_end_date,
           deadline: editingCycle.deadline,
           closes_on: editingCycle.closes_on,
         } : undefined}
         isEditing
       />
     </AppLayout>
   );
 }