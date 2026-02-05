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
   useDeleteCycle,
   type ContributionCycle,
   type CycleFormData 
 } from '@/hooks/useContributionCycles';
 import { CycleFormDialog } from '@/components/cycles/CycleFormDialog';
 import { format } from 'date-fns';
 import { Plus, Calendar, Clock, CheckCircle, XCircle, Edit2, MoreVertical, Trash2 } from 'lucide-react';
 import { Skeleton } from '@/components/ui/skeleton';
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu';
 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
 } from '@/components/ui/alert-dialog';
 
 export default function AdminCycles() {
   const { data: cycles, isLoading } = useContributionCycles();
   const createCycle = useCreateCycle();
   const updateCycle = useUpdateCycle();
   const deleteCycle = useDeleteCycle();
   
   const [dialogOpen, setDialogOpen] = useState(false);
   const [editingCycle, setEditingCycle] = useState<ContributionCycle | null>(null);
   const [deleteConfirmCycle, setDeleteConfirmCycle] = useState<ContributionCycle | null>(null);
 
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
 
   const handleSetStatus = (cycle: ContributionCycle, isClosed: boolean) => {
     updateCycle.mutate({
       id: cycle.id,
       updates: { is_closed: isClosed },
     });
   };
 
   const handleDelete = () => {
     if (!deleteConfirmCycle) return;
     deleteCycle.mutate(deleteConfirmCycle.id, {
       onSuccess: () => setDeleteConfirmCycle(null),
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
                   <div className="flex items-center gap-2">
                     <Badge variant={cycle.is_closed ? 'secondary' : 'default'}>
                       {cycle.is_closed ? 'Closed' : 'Active'}
                     </Badge>
                     <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-8 w-8">
                           <MoreVertical className="h-4 w-4" />
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end" className="bg-popover z-50">
                         <DropdownMenuItem onClick={() => openEditDialog(cycle)}>
                           <Edit2 className="h-4 w-4 mr-2" />
                           Edit Cycle
                         </DropdownMenuItem>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem 
                           onClick={() => handleSetStatus(cycle, false)}
                           disabled={!cycle.is_closed}
                         >
                           <CheckCircle className="h-4 w-4 mr-2 text-success" />
                           Set Active
                         </DropdownMenuItem>
                         <DropdownMenuItem 
                           onClick={() => handleSetStatus(cycle, true)}
                           disabled={cycle.is_closed}
                         >
                           <XCircle className="h-4 w-4 mr-2 text-warning" />
                           Set Closed
                         </DropdownMenuItem>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem 
                           onClick={() => setDeleteConfirmCycle(cycle)}
                           className="text-destructive focus:text-destructive"
                         >
                           <Trash2 className="h-4 w-4 mr-2" />
                           Delete
                         </DropdownMenuItem>
                       </DropdownMenuContent>
                     </DropdownMenu>
                   </div>
                 </div>
               </CardHeader>
               <CardContent className="pt-0">
                 <div className="grid grid-cols-2 gap-3">
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
 
       {/* Delete Confirmation */}
       <AlertDialog open={!!deleteConfirmCycle} onOpenChange={(open) => !open && setDeleteConfirmCycle(null)}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Delete Contribution Cycle?</AlertDialogTitle>
             <AlertDialogDescription>
               This will permanently delete the cycle for{' '}
               <strong>
                 {deleteConfirmCycle && format(new Date(deleteConfirmCycle.week_start_date), 'MMM d, yyyy')}
               </strong>. 
               This action cannot be undone. Payments linked to this cycle may be affected.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Cancel</AlertDialogCancel>
             <AlertDialogAction 
               onClick={handleDelete}
               className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
             >
               {deleteCycle.isPending ? 'Deleting...' : 'Delete'}
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </AppLayout>
   );
 }