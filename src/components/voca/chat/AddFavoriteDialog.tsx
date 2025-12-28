import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';
import { ScrollArea } from '../../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { useVoca } from '../VocaContext';
import { Search } from 'lucide-react';
import { Input } from '../../ui/input';
import { toast } from 'sonner';

interface AddFavoriteDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddFavoriteDialog = ({ isOpen, onClose }: AddFavoriteDialogProps) => {
  const { users, currentUser, toggleFavoriteContact } = useVoca();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter out users who are already favorites or myself
  const availableUsers = users.filter(u => 
    u.id !== currentUser?.id && 
    !currentUser?.favorites?.includes(u.id) &&
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (userId: string) => {
      toggleFavoriteContact(userId);
      toast.success("Added to favorites");
      onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#111b21] border-[#222d34] text-[#e9edef] max-w-sm p-0 overflow-hidden">
        <DialogHeader className="p-4 bg-[#202c33] border-b border-[#222d34]">
          <DialogTitle>Add Favorite</DialogTitle>
          <DialogDescription className="sr-only">Search for a contact to add to your favorites list.</DialogDescription>
        </DialogHeader>
        
        <div className="p-2 border-b border-[#222d34]">
            <div className="relative">
               <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8696a0]" />
               <Input 
                 placeholder="Search contacts..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="pl-9 bg-[#202c33] border-none rounded-lg h-9 text-[#e9edef]"
               />
           </div>
        </div>

        <ScrollArea className="h-[400px]">
           <div className="p-2">
               {availableUsers.length > 0 ? (
                   availableUsers.map(user => (
                       <div 
                         key={user.id} 
                         onClick={() => handleSelect(user.id)}
                         className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#202c33] rounded-lg"
                       >
                           <Avatar>
                               <AvatarImage src={user.avatar} />
                               <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                           </Avatar>
                           <div className="flex-1">
                               <h4 className="text-[#e9edef] font-medium">{user.name}</h4>
                               <p className="text-[#8696a0] text-sm truncate">{user.about || "Available"}</p>
                           </div>
                       </div>
                   ))
               ) : (
                   <div className="p-8 text-center text-[#8696a0] text-sm">
                       No contacts found or all contacts are already favorites.
                   </div>
               )}
           </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
